// controllers/roomsController.js
const Room = require("../models/Room.js");

/* ============================
   GET /api/rooms
============================ */
const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find().sort({ floorNo: 1, roomNo: 1 });
    res.json(rooms);
  } catch (err) {
    console.error("getRooms error:", err);
    res.status(500).json({ message: "Failed to fetch rooms" });
  }
};

/* ============================
   POST /api/rooms
============================ */
// const createRoom = async (req, res) => {
//   try {
//     const { category, floorNo, roomNo } = req.body;
//     if (!category || !floorNo || !roomNo) {
//       return res.status(400).json({ message: "category, floorNo, roomNo are required" });
//     }

//     const existing = await Room.findOne({ roomNo });
//     if (existing) {
//       return res.status(400).json({ message: "Room with this roomNo already exists" });
//     }

//     const room = await Room.create({ category, floorNo, roomNo, beds: [] });
//     res.status(201).json(room);
//   } catch (err) {
//     console.error("createRoom error:", err);
//     res.status(500).json({ message: "Failed to create room" });
//   }
// };


const createRoom = async (req, res) => {
  try {
    const { category, floorNo, roomNo } = req.body;

    if (!category || !floorNo || !roomNo) {
      return res.status(400).json({ message: "category, floorNo, roomNo are required" });
    }

    const existing = await Room.findOne({ category, roomNo });
    if (existing) {
      return res.status(400).json({
        message: "Room already exists in this building"
      });
    }

    const room = await Room.create({
      category,
      floorNo,
      roomNo,
      beds: []
    });

    res.status(201).json(room);
  } catch (err) {
    console.error("createRoom error:", err);

    // Mongo unique index error
    if (err.code === 11000) {
      return res.status(400).json({
        message: "Room already exists in this building"
      });
    }

    res.status(500).json({ message: "Failed to create room" });
  }
};



/* ============================
   POST /api/rooms/:roomNo/bed
============================ */
// const addBedToRoom = async (req, res) => {
//   try {
//     const { roomNo } = req.params;
//     const { bedNo, bedCategory, price } = req.body;

//     if (!bedNo) return res.status(400).json({ message: "bedNo is required" });

//     const room = await Room.findOne({ roomNo });
//     if (!room) return res.status(404).json({ message: "Room not found" });

//     const dup = room.beds.some(
//       (b) => String(b.bedNo).trim().toLowerCase() === bedNo.trim().toLowerCase()
//     );
//     if (dup) return res.status(400).json({ message: "Bed already exists" });

//     room.beds.push({
//       bedNo,
//       bedCategory: bedCategory || "",
//       price: price != null ? Number(price) : undefined,
//     });

//     await room.save();
//     res.status(201).json(room);
//   } catch (err) {
//     console.error("addBedToRoom error:", err);
//     res.status(500).json({ message: "Failed to add bed" });
//   }
// };


const addBedToRoom = async (req, res) => {
  try {
    const { category, roomNo } = req.params;
    const { bedNo, price } = req.body;

    if (!bedNo) {
      return res.status(400).json({ message: "bedNo is required" });
    }

    const room = await Room.findOne({ category, roomNo });
    if (!room) {
      return res.status(404).json({ message: "Room not found in this building" });
    }

    const exists = room.beds.some(
      b => b.bedNo.trim().toLowerCase() === bedNo.trim().toLowerCase()
    );
    if (exists) {
      return res.status(400).json({ message: "Bed already exists in this room" });
    }

    room.beds.push({
      bedNo,
      price: price != null ? Number(price) : null
    });

    await room.save();
    res.status(201).json(room);
  } catch (err) {
    console.error("addBedToRoom error:", err);
    res.status(500).json({ message: "Failed to add bed" });
  }
};









/* ============================
   PUT /api/rooms/:roomNo/bed/:bedNo
============================ */
// const updateBedPrice = async (req, res) => {
//   try {
//     const { roomNo, bedNo } = req.params;
//     const { price } = req.body;

//     const room = await Room.findOne({ roomNo });
//     if (!room) return res.status(404).json({ message: "Room not found" });

//     const bed = room.beds.find(
//       (b) => String(b.bedNo).trim().toLowerCase() === bedNo.trim().toLowerCase()
//     );
//     if (!bed) return res.status(404).json({ message: "Bed not found" });

//     bed.price = price != null ? Number(price) : null;
//     await room.save();
//     res.json(room);
//   } catch (err) {
//     console.error("updateBedPrice error:", err);
//     res.status(500).json({ message: "Failed to update bed price" });
//   }
// };


const updateBedPrice = async (req, res) => {
  const { category, roomNo, bedNo } = req.params;
  const { price } = req.body;

  const room = await Room.findOne({ category, roomNo });
  if (!room) return res.status(404).json({ message: "Room not found" });

  const bed = room.beds.find(
    b => b.bedNo.toLowerCase() === bedNo.toLowerCase()
  );
  if (!bed) return res.status(404).json({ message: "Bed not found" });

  bed.price = Number(price);
  await room.save();
  res.json(room);
};




/* ============================
   GET /api/rooms/bed-price
============================ */
const getBedPrice = async (req, res) => {
  try {
    const { category, roomNo, bedNo } = req.query;

    if (!category || !roomNo || !bedNo) {
      return res.status(400).json({
        message: "category, roomNo and bedNo are required"
      });
    }

    const room = await Room.findOne({ category, roomNo });
    if (!room) {
      return res.status(404).json({
        message: "Room not found in this building"
      });
    }

    const bed = room.beds.find(
      b => String(b.bedNo) === String(bedNo)
    );

    if (!bed) {
      return res.status(404).json({
        message: "Bed not found in this room"
      });
    }

    res.json({ price: bed.price });
  } catch (err) {
    console.error("getBedPrice error:", err);
    res.status(500).json({ message: "Failed to fetch bed price" });
  }
};





/* ============================
   DELETE /api/rooms/:roomNo/bed/:bedNo
============================ */
// const deleteBedFromRoom = async (req, res) => {
//   try {
//     const { roomNo, bedNo } = req.params;

//     const room = await Room.findOne({ roomNo });
//     if (!room) return res.status(404).json({ message: "Room not found" });

//     const initialLength = room.beds.length;
//     room.beds = room.beds.filter(
//       (b) => String(b.bedNo).trim().toLowerCase() !== bedNo.trim().toLowerCase()
//     );

//     if (room.beds.length === initialLength) {
//       return res.status(404).json({ message: "Bed not found" });
//     }

//     await room.save();
//     res.json({ success: true, message: `Bed ${bedNo} deleted successfully` });
//   } catch (err) {
//     console.error("deleteBedFromRoom error:", err);
//     res.status(500).json({ message: "Failed to delete bed" });
//   }
// };




const deleteBedFromRoom = async (req, res) => {
  const { category, roomNo, bedNo } = req.params;

  const room = await Room.findOne({ category, roomNo });
  if (!room) return res.status(404).json({ message: "Room not found" });

  const before = room.beds.length;
  room.beds = room.beds.filter(
    b => b.bedNo.toLowerCase() !== bedNo.toLowerCase()
  );

  if (room.beds.length === before) {
    return res.status(404).json({ message: "Bed not found" });
  }

  await room.save();
  res.json({ success: true });
};

module.exports = {
  getRooms,
  createRoom,
  addBedToRoom,
  updateBedPrice,
  deleteBedFromRoom,
    getBedPrice 
};
