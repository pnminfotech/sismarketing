// models/Tenant.js
const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema(
  {
    // Basic details
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    altMobile: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },

    // Hostel / bed info
    category: {
      type: String, // e.g. "Single", "Sharing", "AC", "Non-AC"
    },
    roomNo: {
      type: String,
    },
    bedNo: {
      type: String,
    },
    // convenience combined field if you use "B12" etc.
    roomBed: {
      type: String,
    },

    // Dates
    admissionDate: {
      type: Date,
      required: true,
    },
    leavingDate: {
      type: Date,
    },

    // Money
    monthlyRent: {
      type: Number,
      default: 0,
    },
    depositAmount: {
      type: Number,
      default: 0,
    },
    securityDeposit: {
      type: Number,
      default: 0,
    },

    // Status
    isVacated: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "left"],
      default: "active",
    },

    // Extra info (optional)
    address: {
      type: String,
    },
    aadhaarNumber: {
      type: String,
    },
    remarks: {
      type: String,
    },

    // 🔔 Flag to avoid sending welcome SMS multiple times
    welcomeSmsSent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tenant", tenantSchema);
