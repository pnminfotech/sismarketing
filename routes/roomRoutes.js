// const express = require('express');
// const router = express.Router();
// const Room = require('../models/Room');

// // Get all rooms
// router.get('/', async (req, res) => {
//   try {
//     const rooms = await Room.find();
//     res.json(rooms);
//   } catch (err) {
//     console.error("Error fetching rooms:", err);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// // Add a new room
// router.post('/', async (req, res) => {
//   try {
//     const room = new Room(req.body);
//     await room.save();
//     res.json(room);
//   } catch (err) {
//     console.error("Error adding room:", err);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// // Add a bed to a room (price optional)
// router.post('/:roomNo/bed', async (req, res) => {
//   const { roomNo } = req.params;
//   let { bedNo, price } = req.body;

//   try {
//     if (!bedNo) {
//       return res.status(400).json({ message: 'Missing bedNo' });
//     }

//     const room = await Room.findOne({ roomNo });
//     if (!room) return res.status(404).json({ message: 'Room not found' });

//     const exists = room.beds.some(bed => bed.bedNo === bedNo);
//     if (exists) {
//       return res.status(400).json({ message: 'Bed number already exists in this room' });
//     }

//     // If price is not provided, set it to null
//     if (price === undefined || price === '') {
//       price = null;
//     }

//     room.beds.push({ bedNo, price });
//     await room.save();

//     res.json({ message: 'Bed added successfully', room });
//   } catch (err) {
//     console.error("Error adding bed:", err);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// // Update bed price
// router.put('/:roomNo/bed/:bedNo', async (req, res) => {
//   const { roomNo, bedNo } = req.params;
//   const { price } = req.body;

//   try {
//     const room = await Room.findOne({ roomNo });
//     if (!room) return res.status(404).json({ message: 'Room not found' });

//     const bed = room.beds.find(b => b.bedNo === bedNo);
//     if (!bed) return res.status(404).json({ message: 'Bed not found' });

//     bed.price = price ?? null;
//     await room.save();
//     res.json(bed);
//   } catch (err) {
//     console.error("Error updating bed price:", err);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// module.exports = router;



const express = require('express');
const router = express.Router();

// ✔ Model corrected
const Room = require('../models/Room.js');

const { deleteBedFromRoom } = require("../controllers/roomsController");

/* ============================
   GET ALL ROOMS
============================ */
router.get('/', async (req, res) => {
  try {
    const rooms = await Room.find();
    res.json(rooms);
  } catch (err) {
    console.error("Error fetching rooms:", err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ============================
   ADD NEW ROOM
============================ */
router.post('/', async (req, res) => {
  try {
    const room = new Room(req.body);
    await room.save();
    res.json(room);
  } catch (err) {
    console.error("Error adding room:", err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ============================
   ADD BED TO ROOM
============================ */
router.post('/:roomNo/bed', async (req, res) => {
  const { roomNo } = req.params;
  let { bedNo, price } = req.body;

  try {
    if (!bedNo) {
      return res.status(400).json({ message: 'Missing bedNo' });
    }

    const room = await Room.findOne({ roomNo });
    if (!room) return res.status(404).json({ message: 'Room not found' });

    if (room.beds.some(bed => bed.bedNo === bedNo)) {
      return res.status(400).json({ message: 'Bed number already exists in this room' });
    }

    room.beds.push({ bedNo, price: price ?? null });
    await room.save();

    res.json({ message: 'Bed added successfully', room });
  } catch (err) {
    console.error("Error adding bed:", err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ============================
   DELETE BED FROM ROOM
============================ */
router.delete("/:roomNo/bed/:bedNo", deleteBedFromRoom);

/* ============================
   UPDATE BED PRICE
============================ */
router.put('/:roomNo/bed/:bedNo', async (req, res) => {
  const { roomNo, bedNo } = req.params;
  const { price } = req.body;

  try {
    const room = await Room.findOne({ roomNo });
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const bed = room.beds.find(b => b.bedNo === bedNo);
    if (!bed) return res.status(404).json({ message: 'Bed not found' });

    bed.price = price ?? null;
    await room.save();
    res.json(bed);
  } catch (err) {
    console.error("Error updating bed price:", err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
