// // models/Room.js
// const mongoose = require('mongoose');

// const bedSchema = new mongoose.Schema({
//   bedNo: String,
//   price: { type: Number, default: null }
// });


// const roomSchema = new mongoose.Schema({
//   roomNo: String,
//   floorNo: String,
//   category: { type: String, default: "" },
//   beds: [bedSchema]
// });

// module.exports = mongoose.model('Room', roomSchema);



const mongoose = require("mongoose");

const bedSchema = new mongoose.Schema(
  {
    bedNo: { type: String, required: true },
    price: { type: Number, default: null }
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    category: { type: String, required: true }, // buildingId
    roomNo: { type: String, required: true },
    floorNo: { type: String, required: true },
    beds: [bedSchema]
  },
  { timestamps: true }
);

// 🔐 UNIQUE per building + room
roomSchema.index({ category: 1, roomNo: 1 }, { unique: true });

module.exports = mongoose.model("Room", roomSchema);
