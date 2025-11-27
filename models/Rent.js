// models/Rent.js
const mongoose = require("mongoose");

const rentSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    month: {
      type: String, // e.g. "Nov 2025"
    },
    year: {
      type: Number,
    },
    amount: {
      type: Number,
      default: 0,
    },
    paidOn: {
      type: Date,
    },
    mode: {
      type: String, // e.g. "cash", "online", etc.
    },
    remark: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Rent", rentSchema);
