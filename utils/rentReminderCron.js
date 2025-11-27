const cron = require("node-cron");
const Form = require("../models/formModels");
const fetch = require("node-fetch");

//
// =============== SEND REMINDER SMS ==================
//
async function sendSMS_RentReminder(tenant, monthKey) {
  try {
    const url = "https://api.msg91.com/api/v5/flow/";

    const payload = {
      flow_id: process.env.MSG91_PAYMENT_REMINDER_FLOW_ID,
      recipients: [
        {
          mobiles: "91" + tenant.phoneNo,
          name: tenant.name,        // ##name##
          number: tenant.baseRent,  // ##number##
          date: monthKey,           // ##date##
          number1: tenant.baseRent  // ##number1##
        }
      ]
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        authkey: process.env.MSG91_AUTHKEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log("📤 Rent Reminder SMS:", data);
  } catch (err) {
    console.error("❌ Rent Reminder SMS Error:", err);
  }
}

//
// =============== CRON JOB: Runs Daily ==================
//
// 10:00 AM every day → but inside we check for 6th date only
cron.schedule("0 10 * * *", async () => {
  console.log("⏰ Running Rent Reminder Check...");

  const today = new Date();
  const day = today.getDate();

  // 🚨 Only allow on 6th date
  if (day !== 6) {
    console.log("➡ Not the 6th. Skipping reminder job.");
    return;
  }

  try {
    const tenants = await Form.find();

    const now = new Date();
    const prevMonthIndex = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const prevYear =
      now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    // Convert to format: "Nov-25"
    const monthKey =
      new Date(prevYear, prevMonthIndex).toLocaleString("default", {
        month: "short",
      }) +
      "-" +
      prevYear.toString().slice(-2);

    console.log("📅 Checking pending rents for:", monthKey);

    for (const tenant of tenants) {
      const rentRecord = tenant.rents?.find((r) => r.month === monthKey);

      if (!rentRecord || !rentRecord.rentAmount || rentRecord.rentAmount === 0) {
        console.log(`🔔 Pending Rent → Sending SMS to ${tenant.name}`);
        await sendSMS_RentReminder(tenant, monthKey);
      } else {
        console.log(`✔ Rent already paid → ${tenant.name}`);
      }
    }

    console.log("✅ Reminder Job Completed");
  } catch (error) {
    console.error("❌ Error in Reminder Cron:", error);
  }
});

module.exports = {};
