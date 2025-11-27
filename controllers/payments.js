// controllers/payments.js
const Payment = require("../models/Payment");
const Notification = require("../models/Notification");
const Tenant = require("../models/Tenant");
const { sendPaymentReminderSms } = require("../services/msg91Service");

/**
 * Report a payment made by a tenant.
 * Used when you record that tenant has paid (cash/online).
 */
async function reportPayment(req, res) {
  try {
    const { tenantId, amount, method, note } = req.body;

    if (!tenantId || !amount) {
      return res
        .status(400)
        .json({ error: "tenantId and amount required" });
    }

    const p = await Payment.create({
      tenant: tenantId,
      amount,
      method: method || "cash",
      note: note || "",
      status: "reported",
      date: new Date(),
    });

    // fire a notification for admins
    await Notification.create({
      type: "payment",
      refId: p._id,
      status: "reported",
      title: "New payment reported",
    });

    return res.status(201).json({ ok: true, payment: p });
  } catch (e) {
    console.error("reportPayment:", e);
    return res.status(500).json({ error: "Server error" });
  }
}

/**
 * Send ONE rent pending reminder SMS to a tenant.
 *
 * Uses MSG91 template:
 *  "Hey ##name##, your hostel rent of Rs ##number## for ##date## is pending..."
 *
 * POST /api/payments/send-rent-reminder
 * Body:
 *  {
 *    "tenantId": "<mongo id>",
 *    "amount": 4000,          // rent amount (Rs)
 *    "monthLabel": "Nov 2025" // text that will go in ##date##
 *  }
 */
async function sendRentPendingReminder(req, res) {
  try {
    const { tenantId, amount, monthLabel } = req.body;

    if (!tenantId) {
      return res
        .status(400)
        .json({ error: "tenantId is required" });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    // Fallbacks if not passed
    const finalAmount =
      amount ?? tenant.monthlyRent ?? tenant.rent ?? 0;

    const finalMonthLabel =
      monthLabel ||
      new Date().toLocaleString("en-GB", {
        month: "short",
        year: "numeric",
      }); // e.g. "Nov 2025"

    await sendPaymentReminderSms(tenant, {
      amount: finalAmount,
      monthLabel: finalMonthLabel,
    });

    return res.json({ ok: true });
  } catch (e) {
    console.error("sendRentPendingReminder:", e);
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  reportPayment,
  sendRentPendingReminder,
};
