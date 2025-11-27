// services/msg91Service.js
const axios = require("axios");

/* ===== ENV CONFIG ===== */
const AUTH_KEY = process.env.MSG91_AUTHKEY;
const COUNTRY_CODE = process.env.MSG91_COUNTRY || "91";

/**
 * Template IDs on MSG91
 *  - ADMISSION_TEMPLATE_ID      -> EazyRent_Admission_Thanks
 *  - PAYMENT_REMINDER_TEMPLATE_ID -> Payment_Reminder
 *
 * We use .env if present, otherwise fall back to hard-coded IDs
 * from your MSG91 Templates screen.
 */
const ADMISSION_TEMPLATE_ID =
  process.env.MSG91_ADMISSION_FLOW_ID || "69269d61c3e99f74ab2038b2";

const PAYMENT_REMINDER_TEMPLATE_ID =
  process.env.MSG91_PAYMENT_REMINDER_FLOW_ID || "69269ddbe858ce3ec57d6ff2";

/* Small debug so you can see config on server start */
console.log("🔐 MSG91 admission config:", {
  hasAuthkey: !!AUTH_KEY,
  templateId: ADMISSION_TEMPLATE_ID,
});
console.log("🔐 MSG91 payment reminder config:", {
  hasAuthkey: !!AUTH_KEY,
  templateId: PAYMENT_REMINDER_TEMPLATE_ID,
});

/* ===== Helpers ===== */

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
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  return `${day} ${month} ${year}`;
}

/* ====================================================================== */
/* 1) ADMISSION THANKS SMS                                                */
/* ====================================================================== */

/**
 * Send "EazyRent_Admission_Thanks" SMS via MSG91 Flow API.
 *
 * Template on MSG91:
 *  Hey ##name##, welcome to Hostel. Your admission is confirmed for Room/Bed ##number## from ##date##.
 *  We have received a security deposit of Rs ##number1##. ...
 *
 * Variables:
 *   ##name##    -> "name"
 *   ##number##  -> "number"
 *   ##date##    -> "date"
 *   ##number1## -> "number1"
 */
async function sendAdmissionThanksSms(tenant) {
  try {
    if (!AUTH_KEY || !ADMISSION_TEMPLATE_ID) {
      console.error(
        "❌ Admission SMS skipped: missing AUTH_KEY or ADMISSION_TEMPLATE_ID"
      );
      return;
    }
    if (!tenant || !tenant.mobile) {
      console.error("❌ Admission SMS skipped: tenant or mobile missing");
      return;
    }

    const mobiles = `${COUNTRY_CODE}${String(tenant.mobile).trim()}`;

    const roomBed =
      tenant.roomBed || tenant.bedNo || tenant.roomNo || tenant.bed || "";

    const admissionDate =
      tenant.admissionDate || tenant.joiningDate || tenant.startDate;

    const dateStr = formatDate(admissionDate);

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
          name: tenant.name, // ##name##
          number: roomBed, // ##number##
          date: dateStr, // ##date##
          number1: String(deposit), // ##number1##
        },
      ],
    };

    console.log(
      "📨 MSG91 Admission SMS payload:",
      JSON.stringify(payload, null, 2)
    );

    const resp = await axios.post(
      "https://control.msg91.com/api/v5/flow/",
      payload,
      {
        headers: {
          authkey: AUTH_KEY,
          "Content-Type": "application/json",
          accept: "application/json",
        },
      }
    );

    console.log("✅ Admission SMS sent:", resp.data);
  } catch (err) {
    console.error(
      "❌ Admission SMS error:",
      err.response?.data || err.message || err
    );
  }
}

/* ====================================================================== */
/* 2) PAYMENT REMINDER SMS                                                */
/* ====================================================================== */

/**
 * Send "Payment_Reminder" SMS via MSG91 Flow API.
 *
 * Template on MSG91:
 *  Hey ##name##, your hostel rent of Rs ##number## for ##date## is pending.
 *  Please pay on or before the 5th of the month to avoid late fees.
 *  If you pay after the 5th, a late fee of Rs 100 per day will be charged
 *  until payment is received. - EazyRent Hostel
 *
 * Variables:
 *   ##name##   -> "name"
 *   ##number## -> "number"  (rent amount)
 *   ##date##   -> "date"    (month/year, e.g. "Nov 2025")
 *
 * Usage example:
 *   await sendPaymentReminderSms(tenant, {
 *     amount: 4000,
 *     monthLabel: "Nov 2025",
 *   });
 */
async function sendPaymentReminderSms(tenant, options = {}) {
  try {
    if (!AUTH_KEY || !PAYMENT_REMINDER_TEMPLATE_ID) {
      console.error(
        "❌ Payment reminder SMS skipped: missing AUTH_KEY or PAYMENT_REMINDER_TEMPLATE_ID"
      );
      return;
    }
    if (!tenant || !tenant.mobile) {
      console.error("❌ Payment reminder SMS skipped: tenant or mobile missing");
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
      options.monthLabel ||
      options.dateLabel ||
      options.month ||
      options.date ||
      ""; // e.g. "Nov 2025"

    const payload = {
      template_id: PAYMENT_REMINDER_TEMPLATE_ID,
      recipients: [
        {
          mobiles,
          name: tenant.name, // ##name##
          number: String(amount), // ##number##
          date: monthLabel, // ##date##
        },
      ],
    };

    console.log(
      "📨 MSG91 Payment Reminder payload:",
      JSON.stringify(payload, null, 2)
    );

    const resp = await axios.post(
      "https://control.msg91.com/api/v5/flow/",
      payload,
      {
        headers: {
          authkey: AUTH_KEY,
          "Content-Type": "application/json",
          accept: "application/json",
        },
      }
    );

    console.log("✅ Payment reminder SMS sent:", resp.data);
  } catch (err) {
    console.error(
      "❌ Payment reminder SMS error:",
      err.response?.data || err.message || err
    );
  }
}

module.exports = {
  sendAdmissionThanksSms,
  sendPaymentReminderSms,
};
