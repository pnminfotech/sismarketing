// const mongoose = require('mongoose');

// const formSchema = new mongoose.Schema(
//   {
//  srNo: {
//   type: Number,
//   unique: true,
//   required: true
// },

//     name: { type: String, required: true },
//     joiningDate: { type: Date, required: true },
//     roomNo: { type: String },
//     depositAmount: { type: Number, required: true },
//     address: { type: String, required: true },
//     phoneNo : {type: Number, required : true},
//     relativeAddress1: { type: String }, 
//     relativeAddress2: { type: String }, 
//     floorNo: { type: String },
//     bedNo: { type: String },
//     companyAddress: { type: String }, 
//     dateOfJoiningCollege: { type: Date, required: true },
//     dob: { type: Date, required: true },
//       // ✅ Add this line
//   baseRent: { type: Number }, 
//     rents: [
//       {
//         rentAmount: { type: Number},
//         date: { type: Date},
//         month: {type :String},
//       },
//     ],
//     leaveDate: { type: String },
//   });

// module.exports = mongoose.model('Form', formSchema);

const mongoose = require('mongoose');

const formSchema = new mongoose.Schema(
  {
    // Sr No
    srNo: { type: Number, unique: true, required: true },

    // Basic info
    name: { type: String, required: true },
    joiningDate: { type: Date, required: true },
    roomNo: { type: String },
    depositAmount: { type: Number, required: true },

    // Main address
    address: { type: String, required: true },

    // Better as string (to keep leading zeros, country codes, etc.)
    phoneNo: { type: String, required: true },

    // Relatives
    // relative1Relation: {
    //   type: String,
    //   enum: ["Self", "Sister", "Brother", "Father", "Husband", "Mother"],
    //   default: "Self",
    // },
    relative1Name: { type: String, default: "" },
    relative1Address: { type: String, default: "" },  // 👈 NEW FIELD

    relative1Phone: { type: String, default: "" },

    // relative2Relation: {
    //   type: String,
    //   enum: ["Self", "Sister", "Brother", "Father", "Husband", "Mother"],
    //   default: "Self",
    // },
    relative2Name: { type: String, default: "" },
    relative2Address: { type: String, default: "" },  // 👈 NEW FIELD

    relative2Phone: { type: String, default: "" },

    floorNo: { type: String },
    bedNo: { type: String },
    companyAddress: { type: String },
   

    baseRent: { type: Number },

    // ✅ Rents array – matches updateForm + frontend payload
    rents: {
      type: [
        {
          rentAmount: { type: Number, default: 0 },   // amount paid for that month
          date: { type: Date },                       // actual payment date
          month: { type: String, required: true },    // e.g. "Nov-25"
          paymentMode: {
            type: String,
            enum: ["Cash", "Online"],
            default: "Cash",
          },
        },
      ],
      default: [],
    },

    // Still string because your leave code compares as "YYYY-MM-DD"
    leaveDate: { type: String },

    // Documents
    documents: [
      {
        fileName: { type: String },

        // legacy (disk) link — keep for old records
        url: { type: String },

        // NEW: DB-backed fields (DocumentFile model)
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
