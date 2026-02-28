const axios = require("axios");
const { logSmsAttempt, getTotalSentCount } = require("../services/smsLogService");

const MSG91_AUTHKEY = process.env.MSG91_AUTHKEY;
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID;
const MSG91_TEMPLATE_ID_RENT_REMINDER =
  process.env.MSG91_TEMPLATE_ID_RENT_REMINDER || null;

console.log("MSG91 config:", {
  hasAuthkey: !!MSG91_AUTHKEY,
  sender: MSG91_SENDER_ID,
  hasTemplate: !!MSG91_TEMPLATE_ID_RENT_REMINDER,
});

const normalizeMobile = (m) => {
  if (!m) return null;
  let x = String(m).replace(/\D/g, "");

  if (x.length === 10) x = "91" + x;
  if (!x.startsWith("91") || x.length !== 12) return null;

  return x;
};

const sendBulkSms = async (req, res) => {
  try {
    const { tenants, message } = req.body;

    if (!Array.isArray(tenants) || tenants.length === 0) {
      return res.status(400).json({ message: "No tenants provided" });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message text is required" });
    }

    let mobiles = tenants.map((t) => normalizeMobile(t.phoneNo)).filter(Boolean);
    mobiles = [...new Set(mobiles)];

    if (mobiles.length === 0) {
      return res.status(400).json({ message: "No valid mobile numbers found" });
    }

    const url = "https://api.msg91.com/api/v5/sms/bulk";
    const smsObject = {
      to: mobiles,
      message: message.trim(),
    };

    const payload = {
      sender: MSG91_SENDER_ID,
      route: "4",
      country: "91",
      sms: [smsObject],
    };

    const headers = {
      authkey: MSG91_AUTHKEY,
      "Content-Type": "application/json",
    };

    const response = await axios.post(url, payload, { headers });

    await logSmsAttempt({
      status: "success",
      eventType: "bulk_sms",
      templateId: MSG91_TEMPLATE_ID_RENT_REMINDER,
      recipientCount: mobiles.length,
      message: message.trim(),
      requestPayload: payload,
      responsePayload: response.data,
    });

    return res.json({
      success: true,
      msg: "SMS send request submitted",
      totalRecipients: mobiles.length,
      provider: response.data,
    });
  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;

    await logSmsAttempt({
      status: "failed",
      eventType: "bulk_sms",
      templateId: MSG91_TEMPLATE_ID_RENT_REMINDER,
      recipientCount: Array.isArray(req.body?.tenants) ? req.body.tenants.length : 0,
      message: req.body?.message || null,
      requestPayload: req.body || null,
      responsePayload: data || null,
      providerStatusCode: status || null,
      error: err.message,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to send sms via MSG91",
      providerStatus: status || null,
      providerError: data || err.message,
    });
  }
};

const getTotalSentSmsCount = async (_req, res) => {
  try {
    const totalSentCount = await getTotalSentCount();
    return res.json({ success: true, totalSentCount });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch total sent SMS count",
    });
  }
};

module.exports = {
  sendBulkSms,
  getTotalSentSmsCount,
};
