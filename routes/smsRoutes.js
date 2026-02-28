// routes/smsRoutes.js
const express = require("express");
const {
  sendBulkSms,
  getTotalSentSmsCount,
} = require("../controllers/smsController");

const router = express.Router();

// Later you can add auth middleware here
router.post("/bulk", sendBulkSms);
router.get("/total-sent", getTotalSentSmsCount);

module.exports = router;
