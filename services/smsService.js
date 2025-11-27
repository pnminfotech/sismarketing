// services/smsService.js
import axios from "axios";

const AUTH_KEY = process.env.MSG91_AUTHKEY;
const COUNTRY_CODE = process.env.MSG91_COUNTRY || "91";
const ADMISSION_TEMPLATE_ID = process.env.MSG91_ADMISSION_FLOW_ID;

// helper to format "01 Dec 2025"
const formatDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, "0");
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

// call this when tenant is admitted
export const sendAdmissionThanksSms = async (tenant) => {
  if (!AUTH_KEY || !ADMISSION_TEMPLATE_ID) {
    console.error("MSG91 authkey or admission template id not set");
    return;
  }
  if (!tenant.mobile) return;

  const mobiles = `${COUNTRY_CODE}${tenant.mobile}`; // e.g. 919876543210
  const roomBed = tenant.roomBed || tenant.bedNo || tenant.roomNo || "";

  const dateStr = formatDate(tenant.admissionDate);
  const deposit = tenant.depositAmount || tenant.securityDeposit || 0;

  try {
    // 👇 matches variables in your MSG91 template:
    // Hey ##name##, welcome to Hostel. Your admission is confirmed for Room/Bed ##number## from ##date## ...
    // Rs ##number1##
    const body = {
      template_id: ADMISSION_TEMPLATE_ID,
      recipients: [
        {
          mobiles,
          name: tenant.name,            // ##name##
          number: roomBed,              // ##number##
          date: dateStr,                // ##date##
          number1: String(deposit),     // ##number1##
        },
      ],
    };

    await axios.post("https://control.msg91.com/api/v5/flow/", body, {
      headers: {
        authkey: AUTH_KEY,
        "Content-Type": "application/json",
      },
    });
    console.log("Admission welcome SMS sent to", mobiles);
  } catch (err) {
    console.error(
      "Admission welcome SMS failed:",
      err.response?.data || err.message
    );
  }
};
