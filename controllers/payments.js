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
      return res.status(400).json({ error: "tenantId is required" });
    }

    // Use Form model because your tenant records are stored there
    const Form = require("../models/formModels");
    const tenant = await Form.findById(tenantId);

    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    const finalAmount =
      amount ?? tenant.baseRent ?? tenant.monthlyRent ?? tenant.rent ?? 0;

    const finalMonthLabel =
      monthLabel ||
      new Date().toLocaleString("en-GB", {
        month: "short",
        year: "numeric",
      });

    // msg91Service expects tenant.mobile, but Form has phoneNo
    const smsTenant = {
      ...tenant.toObject(),
      mobile: tenant.phoneNo,
    };

    await sendPaymentReminderSms(smsTenant, {
      amount: finalAmount,
      monthLabel: finalMonthLabel,
    });

    return res.json({ ok: true, tenantId: tenant._id, monthLabel: finalMonthLabel });
  } catch (e) {
    console.error("sendRentPendingReminder:", e);
    return res.status(500).json({ error: "Server error" });
  }
}


module.exports = {
  reportPayment,
  sendRentPendingReminder,
};
