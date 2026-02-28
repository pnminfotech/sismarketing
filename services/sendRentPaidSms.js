const axios = require("axios");
const { logSmsAttempt } = require("./smsLogService");

async function sendRentPaidSms(
  tenant,
  { amount, monthLabel, datePaid, monthlyRent }
) {
  if (!tenant?.phoneNo) {
    await logSmsAttempt({
      status: "skipped",
      eventType: "rent_paid",
      templateId: process.env.MSG91_RENT_PAID_TEMPLATE_ID || null,
      error: "Tenant phoneNo missing",
    });
    return;
  }

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
    const res = await axios.post("https://control.msg91.com/api/v5/flow/", payload, {
      headers: {
        authkey: process.env.MSG91_AUTHKEY,
        "Content-Type": "application/json",
      },
    });

    await logSmsAttempt({
      status: "success",
      eventType: "rent_paid",
      templateId: process.env.MSG91_RENT_PAID_TEMPLATE_ID || null,
      recipientMobile: payload.recipients[0].mobiles,
      recipientCount: 1,
      requestPayload: payload,
      responsePayload: res.data,
      providerStatusCode: res.status,
    });
  } catch (err) {
    await logSmsAttempt({
      status: "failed",
      eventType: "rent_paid",
      templateId: process.env.MSG91_RENT_PAID_TEMPLATE_ID || null,
      recipientMobile: payload.recipients[0].mobiles,
      recipientCount: 1,
      requestPayload: payload,
      responsePayload: err.response?.data || null,
      providerStatusCode: err.response?.status || null,
      error: err.message || err,
    });
  }
}

module.exports = { sendRentPaidSms };
