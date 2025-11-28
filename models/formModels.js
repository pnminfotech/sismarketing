const mongoose = require('mongoose');

const formSchema = new mongoose.Schema(
  {
    // Sr No (Unique)
    srNo: { type: Number, unique: true, required: true },

    // Basic info
    name: { type: String, required: true },
    joiningDate: { type: Date, required: true },
    roomNo: { type: String },
    depositAmount: { type: Number, required: true },

    // Main address
    address: { type: String, required: true },

    // Phone as string (keeps leading zeros)
    phoneNo: { type: String, required: true },

    // Relative 1
    relative1Name: { type: String, default: "" },
    relative1Address: { type: String, default: "" },
    relative1Phone: { type: String, default: "" },

    // Relative 2
    relative2Name: { type: String, default: "" },
    relative2Address: { type: String, default: "" },
    relative2Phone: { type: String, default: "" },

    floorNo: { type: String },
    bedNo: { type: String },
    companyAddress: { type: String },

    baseRent: { type: Number },

    // ✅ Rents array — FIXED: month is now optional (was required)
    rents: {
      type: [
        {
          rentAmount: { type: Number, default: 0 }, // paid amount
          date: { type: Date },                     // actual payment date

          // IMPORTANT FIX ↓↓↓
          month: { type: String, default: null },   // Was required:true → now safe

          paymentMode: {
            type: String,
            enum: ["Cash", "Online"],
            default: "Cash",
          },
        },
      ],
      default: [],
    },

    // Leave date (string used by your frontend logic)
    leaveDate: { type: String },

    // Documents
    documents: [
      {
        fileName: { type: String },

        // Legacy disk link
        url: { type: String },

        // New DB fields
        fileId: { type: mongoose.Schema.Types.ObjectId, ref: "DocumentFile" },
        contentType: { type: String },
        size: { type: Number },
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

module.exports = mongoose.model('Form', formSchema);
