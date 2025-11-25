// routes/smsRoutes.js
const express = require("express");
const { sendBulkSms } = require("../controllers/smsController");

const router = express.Router();

// Later you can add auth middleware here
router.post("/bulk", sendBulkSms);

module.exports = router;
