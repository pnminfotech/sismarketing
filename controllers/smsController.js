// controllers/smsController.js
const axios = require("axios");

const MSG91_AUTHKEY = process.env.MSG91_AUTHKEY;
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID;
const MSG91_TEMPLATE_ID_RENT_REMINDER =
  process.env.MSG91_TEMPLATE_ID_RENT_REMINDER || null;

// Just to verify envs at startup (won't crash)
console.log("🔐 MSG91 config:", {
  hasAuthkey: !!MSG91_AUTHKEY,
  sender: MSG91_SENDER_ID,
  hasTemplate: !!MSG91_TEMPLATE_ID_RENT_REMINDER,
});

// Normalise numbers to 91xxxxxxxxxx
const normalizeMobile = (m) => {
  if (!m) return null;
  let x = String(m).replace(/\D/g, ""); // remove non-digits

  // 10-digit Indian mobile → add 91
  if (x.length === 10) x = "91" + x;

  // Final check
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

    // Make list of valid mobiles
    let mobiles = tenants
      .map((t) => normalizeMobile(t.phoneNo))
      .filter(Boolean);

    // Remove duplicates
    mobiles = [...new Set(mobiles)];

    if (mobiles.length === 0) {
      return res
        .status(400)
        .json({ message: "No valid mobile numbers found" });
    }

    const url = "https://api.msg91.com/api/v5/sms/bulk";

    // 👉 ONE MESSAGE, MANY NUMBERS
    // MSG91 will send the SAME 'message' to all numbers in 'to'
    const smsObject = {
      to: mobiles,
      message: message.trim(),
    };

    // If you want to use a DLT template directly (when ready), uncomment:
    // if (MSG91_TEMPLATE_ID_RENT_REMINDER) {
    //   smsObject.template_id = MSG91_TEMPLATE_ID_RENT_REMINDER;
    // }

    const payload = {
      sender: MSG91_SENDER_ID,
      route: "4", // transactional (check in your MSG91 panel)
      country: "91",
      sms: [smsObject],
    };

    const headers = {
      authkey: MSG91_AUTHKEY,
      "Content-Type": "application/json",
    };

    console.log("📤 Sending to MSG91:", {
      url,
      toCount: mobiles.length,
      sampleNumber: mobiles[0],
    });

    const response = await axios.post(url, payload, { headers });

    console.log("✅ MSG91 response:", response.data);

    return res.json({
      success: true,
      msg: "SMS send request submitted",
      totalRecipients: mobiles.length,
      provider: response.data,
    });
  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;

    console.error("❌ MSG91 bulk sms error status:", status);
    console.error("❌ MSG91 bulk sms error data:", data || err.message);

    return res.status(500).json({
      success: false,
      message: "Failed to send sms via MSG91",
      providerStatus: status || null,
      providerError: data || err.message,
    });
  }
};

module.exports = {
  sendBulkSms,
};
