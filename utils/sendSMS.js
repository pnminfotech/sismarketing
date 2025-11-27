// utils/sendSMS.js
const fetch = require("node-fetch");

/* ============================================================================
   1) MONTH PAYMENT SMS
============================================================================ */
async function sendSMS_MonthPayment(tenant, month, rentAmount, paymentDate, baseRent) {
  try {
    const payload = {
      flow_id: process.env.MSG91_RENT_RECEIPT_FLOW_ID,
      recipients: [
        {
          mobiles: "91" + tenant.phoneNo,
          name: tenant.name,
          number: rentAmount,
          date: month,
          date1: new Date(paymentDate).toLocaleDateString("en-IN"),
          number1: baseRent
        }
      ]
    };

    const res = await fetch("https://api.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: {
        authkey: process.env.MSG91_AUTHKEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    console.log("📤 MonthPayment SMS sent:", json);
  } catch (err) {
    console.error("❌ Month Payment SMS Error:", err);
  }
}



/* ============================================================================
   2) ADMISSION WELCOME SMS
============================================================================ */
async function sendSMS_Admission(tenant) {
  try {
    const payload = {
      flow_id: process.env.MSG91_ADMISSION_FLOW_ID,
      recipients: [
        {
          mobiles: "91" + tenant.phoneNo,
          name: tenant.name,
          number: `${tenant.roomNo}/${tenant.bedNo}`,
          date: new Date(tenant.joiningDate).toLocaleDateString("en-IN"),
          number1: tenant.depositAmount
        }
      ]
    };

    const res = await fetch("https://api.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: {
        authkey: process.env.MSG91_AUTHKEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    console.log("📤 Admission SMS sent:", json);
  } catch (err) {
    console.error("❌ Admission SMS Error:", err);
  }
}



/* ============================================================================
   3) PAYMENT REMINDER SMS (IMPORTANT — YOU WERE MISSING THIS!)
============================================================================ */
async function sendSMS_PaymentReminder(tenant, month, amount) {
  try {
    const payload = {
      flow_id: process.env.MSG91_PAYMENT_REMINDER_FLOW_ID,
      recipients: [
        {
          mobiles: "91" + tenant.phoneNo,
          name: tenant.name,      // ##name##
          number: amount,         // ##number##
          date: month             // ##date##
        }
      ]
    };

    const res = await fetch("https://api.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: {
        authkey: process.env.MSG91_AUTHKEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    console.log("📤 PaymentReminder SMS sent:", json);
  } catch (err) {
    console.error("❌ Payment Reminder SMS Error:", err);
  }
}



/* ============================================================================
   EXPORT ALL
============================================================================ */
module.exports = {
  sendSMS_MonthPayment,
  sendSMS_Admission,
  sendSMS_PaymentReminder,
};
