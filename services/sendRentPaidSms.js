// services/sendRentPaidSms.js
const axios = require("axios");

async function sendRentPaidSms(tenant, { amount, monthLabel, datePaid, monthlyRent }) {
  if (!tenant?.phoneNo) return;

  const payload = {
    template_id: process.env.MSG91_RENT_PAID_TEMPLATE_ID,
    short_url: "1",
    recipients: [
      {
        mobiles: "91" + tenant.phoneNo,
        var1: tenant.name,
        var2: amount,
        var3: monthLabel,
        var4: datePaid,
        var5: monthlyRent,
      },
    ],
  };

  try {
    const res = await axios.post(
      "https://control.msg91.com/api/v5/flow/",
      payload,
      {
        headers: {
          authkey: process.env.MSG91_AUTHKEY,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("📩 Rent PAID SMS Sent:", res.data);
  } catch (err) {
    console.error("❌ Rent PAID SMS Error:", err.response?.data || err);
  }
}

module.exports = { sendRentPaidSms };
