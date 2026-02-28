const cron = require("node-cron");
const Form = require("../models/formModels");
const fetch = require("node-fetch");
const { logSmsAttempt } = require("../services/smsLogService");

async function sendSMS_RentReminder(tenant, monthKey) {
  const payload = {
    flow_id: process.env.MSG91_PAYMENT_REMINDER_FLOW_ID,
    recipients: [
      {
        mobiles: "91" + tenant.phoneNo,
        name: tenant.name,
        number: tenant.baseRent,
        date: monthKey,
        number1: tenant.baseRent,
      },
    ],
  };

  try {
    const res = await fetch("https://api.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: {
        authkey: process.env.MSG91_AUTHKEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    await logSmsAttempt({
      status: res.ok ? "success" : "failed",
      eventType: "rent_reminder_cron",
      flowId: process.env.MSG91_PAYMENT_REMINDER_FLOW_ID || null,
      recipientMobile: payload.recipients[0].mobiles,
      recipientCount: 1,
      requestPayload: payload,
      responsePayload: data,
      providerStatusCode: res.status,
      error: res.ok ? null : JSON.stringify(data),
      metadata: { monthKey },
    });
  } catch (err) {
    await logSmsAttempt({
      status: "failed",
      eventType: "rent_reminder_cron",
      flowId: process.env.MSG91_PAYMENT_REMINDER_FLOW_ID || null,
      recipientMobile: payload.recipients[0].mobiles,
      recipientCount: 1,
      requestPayload: payload,
      error: err.message || err,
      metadata: { monthKey },
    });
  }
}

cron.schedule("0 10 * * *", async () => {
  const today = new Date();
  const day = today.getDate();

  if (day !== 6) {
    return;
  }

  try {
    const tenants = await Form.find();

    const now = new Date();
    const prevMonthIndex = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    const monthKey =
      new Date(prevYear, prevMonthIndex).toLocaleString("default", { month: "short" }) +
      "-" +
      prevYear.toString().slice(-2);

    for (const tenant of tenants) {
      const rentRecord = tenant.rents?.find((r) => r.month === monthKey);
      if (!rentRecord || !rentRecord.rentAmount || rentRecord.rentAmount === 0) {
        await sendSMS_RentReminder(tenant, monthKey);
      }
    }
  } catch (error) {
    console.error("Error in reminder cron:", error);
  }
});

module.exports = {};
