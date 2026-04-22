const mongoose = require("mongoose");

const formSchema = new mongoose.Schema(
  {
    // ─────────────────────────────────────────
    // Sr No (Unique, system-wide)
    // ─────────────────────────────────────────
    srNo: {
      type: Number,
      unique: true,
      required: true,
    },

    // ─────────────────────────────────────────
    // 🔥 BUILDING / CATEGORY (CRITICAL FIX)
    // ─────────────────────────────────────────
    category: {
      type: String,
      required: true,
      index: true,
    },

    // ─────────────────────────────────────────
    // Tenant basic info
    // ─────────────────────────────────────────
    name: {
      type: String,
      required: true,
    },

    joiningDate: {
      type: Date,
      required: true,
    },

    // ─────────────────────────────────────────
    // Room identity (scoped by category)
    // ─────────────────────────────────────────
    roomNo: {
      type: String,
      required: true,
    },

    bedNo: {
      type: String,
      required: true,
    },

    floorNo: {
      type: String,
    },

    // ─────────────────────────────────────────
    // Money
    // ─────────────────────────────────────────
    depositAmount: {
      type: Number,
      required: true,
    },

    baseRent: {
      type: Number,
      default: 0,
    },

    // ─────────────────────────────────────────
    // Contact & Address
    // ─────────────────────────────────────────
    address: {
      type: String,
      required: true,
    },

    phoneNo: {
      type: String,
      required: true,
    },

    companyAddress: {
      type: String,
    },

    // ─────────────────────────────────────────
    // Relatives
    // ─────────────────────────────────────────
    relative1Name: { type: String, default: "" },
    relative1Address: { type: String, default: "" },
    relative1Phone: { type: String, default: "" },

    relative2Name: { type: String, default: "" },
    relative2Address: { type: String, default: "" },
    relative2Phone: { type: String, default: "" },

    // ─────────────────────────────────────────
    // Rents history
    // ─────────────────────────────────────────
    rents: {
      type: [
        {
          rentAmount: {
            type: Number,
            default: 0,
          },
          date: {
            type: Date,
          },
          month: {
            type: String,
            default: null,
          },
          paymentMode: {
            type: String,
            enum: ["Cash", "Online"],
            default: "Cash",
          },
        },
      ],
      default: [],
    },

    // ─────────────────────────────────────────
    // Leave tracking
    // ─────────────────────────────────────────
    leaveDate: {
      type: Date,
      default: null,
    },

    // ─────────────────────────────────────────
    // Documents
    // ─────────────────────────────────────────
    documents: [
      {
        fileName: String,
        url: String,
        fileId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "DocumentFile",
        },
        contentType: String,
        size: Number,
        relation: {
          type: String,
          enum: ["Self", "Father", "Mother", "Husband", "Sister", "Brother"],
          default: "Self",
        },
      },
    ],
  },
  { timestamps: true }
);

// ─────────────────────────────────────────
// 🔐 COMPOUND UNIQUE INDEX (THE REAL FIX)
// ─────────────────────────────────────────
formSchema.index(
  { category: 1, roomNo: 1, bedNo: 1 },
  { unique: true }
);

module.exports = mongoose.model("Form", formSchema);
