const fetch = require("node-fetch");
const { logSmsAttempt } = require("../services/smsLogService");

async function sendSMS_MonthPayment(
  tenant,
  month,
  rentAmount,
  paymentDate,
  baseRent
) {
  const payload = {
    flow_id: process.env.MSG91_RENT_RECEIPT_FLOW_ID,
    recipients: [
      {
        mobiles: "91" + tenant.phoneNo,
        name: tenant.name,
        number: rentAmount,
        date: month,
        date1: new Date(paymentDate).toLocaleDateString("en-IN"),
        number1: baseRent,
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

    const json = await res.json();
    await logSmsAttempt({
      status: res.ok ? "success" : "failed",
      eventType: "month_payment",
      flowId: process.env.MSG91_RENT_RECEIPT_FLOW_ID || null,
      recipientMobile: payload.recipients[0].mobiles,
      recipientCount: 1,
      requestPayload: payload,
      responsePayload: json,
      providerStatusCode: res.status,
      error: res.ok ? null : JSON.stringify(json),
    });
  } catch (err) {
    await logSmsAttempt({
      status: "failed",
      eventType: "month_payment",
      flowId: process.env.MSG91_RENT_RECEIPT_FLOW_ID || null,
      recipientMobile: payload.recipients[0].mobiles,
      recipientCount: 1,
      requestPayload: payload,
      error: err.message || err,
    });
  }
}

async function sendSMS_Admission(tenant) {
  const payload = {
    flow_id: process.env.MSG91_ADMISSION_FLOW_ID,
    recipients: [
      {
        mobiles: "91" + tenant.phoneNo,
        name: tenant.name,
        number: `${tenant.roomNo}/${tenant.bedNo}`,
        date: new Date(tenant.joiningDate).toLocaleDateString("en-IN"),
        number1: tenant.depositAmount,
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

    const json = await res.json();
    await logSmsAttempt({
      status: res.ok ? "success" : "failed",
      eventType: "admission_welcome",
      flowId: process.env.MSG91_ADMISSION_FLOW_ID || null,
      recipientMobile: payload.recipients[0].mobiles,
      recipientCount: 1,
      requestPayload: payload,
      responsePayload: json,
      providerStatusCode: res.status,
      error: res.ok ? null : JSON.stringify(json),
    });
  } catch (err) {
    await logSmsAttempt({
      status: "failed",
      eventType: "admission_welcome",
      flowId: process.env.MSG91_ADMISSION_FLOW_ID || null,
      recipientMobile: payload.recipients[0].mobiles,
      recipientCount: 1,
      requestPayload: payload,
      error: err.message || err,
    });
  }
}

async function sendSMS_PaymentReminder(tenant, month, amount) {
  const payload = {
    flow_id: process.env.MSG91_PAYMENT_REMINDER_FLOW_ID,
    recipients: [
      {
        mobiles: "91" + tenant.phoneNo,
        name: tenant.name,
        number: amount,
        date: month,
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

    const json = await res.json();
    await logSmsAttempt({
      status: res.ok ? "success" : "failed",
      eventType: "payment_reminder",
      flowId: process.env.MSG91_PAYMENT_REMINDER_FLOW_ID || null,
      recipientMobile: payload.recipients[0].mobiles,
      recipientCount: 1,
      requestPayload: payload,
      responsePayload: json,
      providerStatusCode: res.status,
      error: res.ok ? null : JSON.stringify(json),
    });
  } catch (err) {
    await logSmsAttempt({
      status: "failed",
      eventType: "payment_reminder",
      flowId: process.env.MSG91_PAYMENT_REMINDER_FLOW_ID || null,
      recipientMobile: payload.recipients[0].mobiles,
      recipientCount: 1,
      requestPayload: payload,
      error: err.message || err,
    });
  }
}

module.exports = {
  sendSMS_MonthPayment,
  sendSMS_Admission,
  sendSMS_PaymentReminder,
};
