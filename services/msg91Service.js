const axios = require("axios");
const { logSmsAttempt } = require("./smsLogService");

const AUTH_KEY = process.env.MSG91_AUTHKEY;
const COUNTRY_CODE = process.env.MSG91_COUNTRY || "91";
const ADMISSION_TEMPLATE_ID =
  process.env.MSG91_ADMISSION_FLOW_ID || "69269d61c3e99f74ab2038b2";
const PAYMENT_REMINDER_TEMPLATE_ID =
  process.env.MSG91_PAYMENT_REMINDER_FLOW_ID || "69269ddbe858ce3ec57d6ff2";

function formatDate(input) {
  if (!input) return "";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";

  const day = String(d.getDate()).padStart(2, "0");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

async function sendAdmissionThanksSms(tenant) {
  if (!AUTH_KEY || !ADMISSION_TEMPLATE_ID) {
    await logSmsAttempt({
      status: "skipped",
      eventType: "admission_thanks",
      templateId: ADMISSION_TEMPLATE_ID || null,
      recipientMobile: tenant?.mobile ? `${COUNTRY_CODE}${String(tenant.mobile).trim()}` : null,
      error: "Missing AUTH_KEY or ADMISSION_TEMPLATE_ID",
    });
    return;
  }

  if (!tenant || !tenant.mobile) {
    await logSmsAttempt({
      status: "skipped",
      eventType: "admission_thanks",
      templateId: ADMISSION_TEMPLATE_ID,
      error: "Tenant or mobile missing",
    });
    return;
  }

  const mobiles = `${COUNTRY_CODE}${String(tenant.mobile).trim()}`;
  const roomBed = tenant.roomBed || tenant.bedNo || tenant.roomNo || tenant.bed || "";
  const admissionDate = tenant.admissionDate || tenant.joiningDate || tenant.startDate;
  const deposit =
    tenant.depositAmount ||
    tenant.securityDeposit ||
    tenant.deposit ||
    tenant.deposit_amt ||
    0;

  const payload = {
    template_id: ADMISSION_TEMPLATE_ID,
    recipients: [
      {
        mobiles,
        name: tenant.name,
        number: roomBed,
        date: formatDate(admissionDate),
        number1: String(deposit),
      },
    ],
  };

  try {
    const resp = await axios.post("https://control.msg91.com/api/v5/flow/", payload, {
      headers: {
        authkey: AUTH_KEY,
        "Content-Type": "application/json",
        accept: "application/json",
      },
    });

    await logSmsAttempt({
      status: "success",
      eventType: "admission_thanks",
      templateId: ADMISSION_TEMPLATE_ID,
      recipientMobile: mobiles,
      requestPayload: payload,
      responsePayload: resp.data,
      providerStatusCode: resp.status,
    });
  } catch (err) {
    await logSmsAttempt({
      status: "failed",
      eventType: "admission_thanks",
      templateId: ADMISSION_TEMPLATE_ID,
      recipientMobile: mobiles,
      requestPayload: payload,
      responsePayload: err.response?.data || null,
      providerStatusCode: err.response?.status || null,
      error: err.message,
    });
  }
}

async function sendPaymentReminderSms(tenant, options = {}) {
  if (!AUTH_KEY || !PAYMENT_REMINDER_TEMPLATE_ID) {
    await logSmsAttempt({
      status: "skipped",
      eventType: "payment_reminder",
      templateId: PAYMENT_REMINDER_TEMPLATE_ID || null,
      recipientMobile: tenant?.mobile ? `${COUNTRY_CODE}${String(tenant.mobile).trim()}` : null,
      error: "Missing AUTH_KEY or PAYMENT_REMINDER_TEMPLATE_ID",
    });
    return;
  }

  if (!tenant || !tenant.mobile) {
    await logSmsAttempt({
      status: "skipped",
      eventType: "payment_reminder",
      templateId: PAYMENT_REMINDER_TEMPLATE_ID,
      error: "Tenant or mobile missing",
    });
    return;
  }

  const mobiles = `${COUNTRY_CODE}${String(tenant.mobile).trim()}`;
  const amount =
    options.amount ??
    tenant.pendingAmount ??
    tenant.monthlyRent ??
    tenant.rent ??
    0;
  const monthLabel =
    options.monthLabel || options.dateLabel || options.month || options.date || "";

  const payload = {
    template_id: PAYMENT_REMINDER_TEMPLATE_ID,
    recipients: [
      {
        mobiles,
        name: tenant.name,
        number: String(amount),
        date: monthLabel,
      },
    ],
  };

  try {
    const resp = await axios.post("https://control.msg91.com/api/v5/flow/", payload, {
      headers: {
        authkey: AUTH_KEY,
        "Content-Type": "application/json",
        accept: "application/json",
      },
    });

    await logSmsAttempt({
      status: "success",
      eventType: "payment_reminder",
      templateId: PAYMENT_REMINDER_TEMPLATE_ID,
      recipientMobile: mobiles,
      requestPayload: payload,
      responsePayload: resp.data,
      providerStatusCode: resp.status,
    });
  } catch (err) {
    await logSmsAttempt({
      status: "failed",
      eventType: "payment_reminder",
      templateId: PAYMENT_REMINDER_TEMPLATE_ID,
      recipientMobile: mobiles,
      requestPayload: payload,
      responsePayload: err.response?.data || null,
      providerStatusCode: err.response?.status || null,
      error: err.message,
    });
  }
}

module.exports = {
  sendAdmissionThanksSms,
  sendPaymentReminderSms,
};
