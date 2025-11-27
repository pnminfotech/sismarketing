// routes/payments.js
const express = require("express");
const router = express.Router();

const PaymentNotification = require("../models/PaymentNotification");
const Payment = require("../models/Payment");
const Form = require("../models/formModels"); // your tenant collection ("Form")
const { sendRentPendingReminder } = require("../controllers/payments"); // 🔹 NEW

// --- helpers ---
/** Convert (year, month 1..12) -> Date at first of that month. Falls back to "now". */
function monthToFirstDate(year, month1to12) {
  const now = new Date();
  const y = Number(year) || now.getFullYear();
  const mIdx = (Number(month1to12) || (now.getMonth() + 1)) - 1; // 0..11
  return new Date(y, mIdx, 1);
}

function toMonthKey(y, m /* 0..11 */) {
  return `${new Date(y, m, 1).toLocaleString("en-US", {
    month: "short",
  })}-${String(y).slice(-2)}`;
}

/* =========================
 * LIST / READ NOTIFICATIONS
 * ========================= */
router.get("/notifications", async (req, res) => {
  try {
    const { status = "all", limit = 30 } = req.query;
    const q = status === "all" ? {} : { status };
    const items = await PaymentNotification.find(q)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate("paymentId", "status amount month year utr note createdAt")
      .populate("tenantId", "name roomNo bedNo");
    res.json(items);
  } catch (err) {
    console.error("GET /payments/notifications error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/notifications/read-all", async (req, res) => {
  try {
    const { status = "all" } = req.body || {};
    const q = status === "all" ? {} : { status };
    await PaymentNotification.updateMany(q, { $set: { read: true } });
    res.sendStatus(204);
  } catch (err) {
    console.error("POST /payments/notifications/read-all error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.patch("/notifications/:id/read", async (req, res) => {
  try {
    await PaymentNotification.findByIdAndUpdate(req.params.id, {
      $set: { read: true },
    });
    res.sendStatus(204);
  } catch (err) {
    console.error("PATCH /payments/notifications/:id/read error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ===========
 * APPROVE
 * ===========
 * - Flip Payment.status -> confirmed
 * - Upsert into Form.rents[] for that (month,year)
 * - Flip Notification.status -> approved + read
 */
router.post("/approve/:id", async (req, res) => {
  try {
    const notif = await PaymentNotification.findById(req.params.id);
    if (!notif) return res.status(404).json({ message: "notification not found" });

    let pay = notif.paymentId ? await Payment.findById(notif.paymentId) : null;
    if (!pay) {
      pay = await Payment.findOne({
        tenant: notif.tenantId,
        amount: notif.amount,
        month: notif.month,
        year: notif.year,
      }).sort({ createdAt: -1 });
    }
    if (!pay) return res.status(404).json({ message: "linked payment not found" });

    const tenant = await Form.findById(notif.tenantId);
    if (!tenant) return res.status(404).json({ message: "tenant not found" });

    const rentDate = new Date(pay.year, pay.month - 1, 1);
    const monthLabel = rentDate.toLocaleString("en-IN", { month: "short", year: "numeric" });

    tenant.rents.push({
      month: monthLabel,
      rentAmount: pay.amount,
      date: new Date(),
      paymentMode: pay.paymentMode,
      utr: pay.utr || "",
      note: pay.note || "",
    });
    await tenant.save();

    pay.status = "confirmed";
    await pay.save();

    notif.status = "approved";
    notif.read = true;
    await notif.save();

    const { sendRentPaidSms } = require("../services/sendRentPaidSms");
    await sendRentPaidSms(tenant, {
      amount: pay.amount,
      monthLabel,
      datePaid: new Date().toLocaleDateString("en-IN"),
    });

    return res.json({ ok: true, sms: "sent", tenantId: tenant._id });

  } catch (err) {
    console.error("Error approving payment:", err);
    res.status(500).json({ message: "Server error" });
  }
});
 
/* ===========
 * REJECT
 * ===========
 * - Flip Payment.status -> rejected
 * - Flip Notification.status -> rejected + read
 */
router.post("/reject/:id", async (req, res) => {
  try {
    const notif = await PaymentNotification.findById(req.params.id);
    if (!notif) return res.status(404).json({ message: "notification not found" });

    let pay = notif.paymentId ? await Payment.findById(notif.paymentId) : null;
    if (!pay) {
      pay = await Payment.findOne({
        tenant: notif.tenantId,
        status: "reported",
        amount: notif.amount,
        month: notif.month,
        year: notif.year,
        utr: notif.utr || undefined,
      }).sort({ createdAt: -1 });
    }
    if (!pay) return res.status(404).json({ message: "linked payment not found" });

    if (pay.status !== "reported") {
      return res.status(400).json({ message: `payment already ${pay.status}` });
    }

    pay.status = "rejected";
    await pay.save();

    notif.status = "rejected";
    notif.read = true;
    await notif.save();

    res.json({ ok: true, notification: notif });
  } catch (err) {
    console.error("POST /payments/reject/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ============================
 * OPTIONAL: payments "reports"
 * ============================ */
router.get("/reports", async (req, res) => {
  try {
    const { status = "all", limit = 50 } = req.query;
    const q = status === "all" ? {} : { status };
    const items = await Payment.find(q)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate("tenant", "name roomNo bedNo");
    res.json(items);
  } catch (err) {
    console.error("GET /payments/reports error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// One-off: backfill missing notifications for reported payments
router.post("/bootstrap-notifs", async (req, res) => {
  try {
    const PaymentNotification = require("../models/PaymentNotification");
    const Form = require("../models/formModels");
    const reported = await Payment.find({ status: "reported" }).lean();
    const made = [];

    for (const pay of reported) {
      const exists = await PaymentNotification.findOne({ paymentId: pay._id });
      if (exists) continue;

      if (!pay.tenant) continue; // safety

      const doc = await PaymentNotification.create({
        tenantId: pay.tenant,
        paymentId: pay._id,
        amount: pay.amount,
        month: pay.month,
        year: pay.year,
        utr: pay.utr,
        note: pay.note,
        status: "pending",
        read: false,
      });
      made.push(doc._id);
    }

    res.json({ ok: true, created: made.length, ids: made });
  } catch (e) {
    console.error("bootstrap-notifs error:", e);
    res.status(500).json({
      message: "bootstrap-notifs failed",
      error: String(e),
    });
  }
});

// 🔹 NEW: send one rent-pending reminder SMS to a tenant
// POST /api/payments/send-rent-reminder
router.post("/send-rent-reminder", sendRentPendingReminder);

module.exports = router;
