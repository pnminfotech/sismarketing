// controllers/formController.js
const Form = require('../models/formModels');
const Archive = require('../models/archiveSchema');
const DuplicateForm = require('../models/DuplicateForm');
const Room = require('../models/Room');
const cron = require("node-cron");
const Counter = require('../models/counterModel');
const { sendSMS_MonthPayment } = require("../utils/sendSMS");
const { sendSMS_Admission } = require("../utils/sendSMS");

const normalizeLeaveDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }

  const raw = String(value).trim();
  if (!raw) return null;

  // Treat date-only strings as local midday to avoid timezone drift.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T12:00:00`);
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const archiveFormDocument = async (form, leaveDateOverride) => {
  const archivedLeaveDate = normalizeLeaveDate(
    leaveDateOverride !== undefined ? leaveDateOverride : form.leaveDate
  );

  const { _id, __v, ...rest } = form.toObject();
  const archivedData = new Archive({
    ...rest,
    originalFormId: _id,
    leaveDate: archivedLeaveDate || rest.leaveDate,
  });

  await archivedData.save();
  await Form.findByIdAndDelete(_id);

  return archivedData;
};

const archiveOverdueForms = async () => {
  const todayStart = startOfToday();
  const formsWithLeaveDate = await Form.find({
    leaveDate: { $exists: true, $ne: null },
  });

  const overdueForms = formsWithLeaveDate.filter((form) => {
    const leaveDate = normalizeLeaveDate(form.leaveDate);
    return leaveDate && leaveDate < todayStart;
  });

  for (const form of overdueForms) {
    await archiveFormDocument(form);
  }

  return overdueForms.length;
};

/* ──────────────────────────────────────────────────────────────────────────────
   LEAVE processing + daily archive
   ──────────────────────────────────────────────────────────────────────────── */
const processLeave = async (req, res) => {
  try {
    const { formId, leaveDate } = req.body;
    const form = await Form.findById(formId);

    if (!form) return res.status(404).json({ error: "Form not found" });

    const normalizedLeaveDate = normalizeLeaveDate(leaveDate);
    if (!normalizedLeaveDate) {
      return res.status(400).json({ error: "Invalid leaveDate" });
    }

    const todayStart = startOfToday();

    if (normalizedLeaveDate < todayStart) {
      await archiveFormDocument(form, normalizedLeaveDate);
      return res.status(200).json({ message: "Record archived successfully." });
    } else {
      form.leaveDate = normalizedLeaveDate;
      await form.save();
      return res.status(200).json({ message: "Leave date saved. It will be archived on the leave date." });
    }
  } catch (error) {
    console.error("Error processing leave:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// CRON JOB to check for leave dates every day at midnight
cron.schedule("0 0 * * *", async () => {
  try {
    const archivedCount = await archiveOverdueForms();
    console.log(`Archived ${archivedCount} overdue leave records.`);
  } catch (error) {
    console.error("Error archiving records:", error);
  }
});

/* ──────────────────────────────────────────────────────────────────────────────
   Sr No (display only; server still assigns real one in create)
   ──────────────────────────────────────────────────────────────────────────── */
const getNextSrNo = async (req, res) => {
  try {
    const counter = await Counter.findOne({ name: "form_srno" });
    const next = (counter?.seq || 0) + 1;
    res.status(200).json({ nextSrNo: next });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching Sr. No.', error: error.message });
  }
};

/* ──────────────────────────────────────────────────────────────────────────────
   (Legacy) saveForm – kept for compatibility, not bound to POST /forms route
   ──────────────────────────────────────────────────────────────────────────── */
const saveForm = async (req, res) => {
  try {
    const counter = await Counter.findOneAndUpdate(
      { name: "form_srno" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    req.body.srNo = counter.seq.toString();

    console.log("📥 Incoming payload to saveForm:", JSON.stringify(req.body, null, 2));
    console.log("📂 Documents received:", req.body.documents);

    const newForm = new Form(req.body);
    await newForm.save();

    /* -----------------------------------------------------------
       🚀 SEND ADMISSION SMS IMMEDIATELY AFTER SAVING
    ----------------------------------------------------------- */
    await sendSMS_Admission(newForm);

    return res.status(201).json({
      message: "Form submitted successfully",
      form: newForm
    });

  } catch (error) {
    console.error("❌ Error in saveForm:", error);
    res.status(500).json({
      message: "Error submitting form",
      error: error.message
    });
  }
};

/* ──────────────────────────────────────────────────────────────────────────────
   READ ALL
   ──────────────────────────────────────────────────────────────────────────── */
const getAllForms = async (req, res) => {
  try {
    const forms = await Form.find();
    res.status(200).json(forms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ──────────────────────────────────────────────────────────────────────────────
   RENT update helpers
   ──────────────────────────────────────────────────────────────────────────── */
const getMonthYear = (date) => {
  const d = new Date(date);
  return `${d.toLocaleString('default', { month: 'short' })}-${d.getFullYear().toString().slice(-2)}`;
};

/**
 * PUT /api/form/:id
 * Body: { rentAmount, date, month, paymentMode? }
 * Safely updates/creates a rent entry in form.rents
 */
// controllers/formController.js


const updateForm = async (req, res) => {
  try {
    const { month, rentAmount, paymentMode, date } = req.body;

    if (!month) {
      return res.status(400).json({ message: "Month is required" });
    }

    const form = await Form.findById(req.params.id);
    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    if (!Array.isArray(form.rents)) {
      form.rents = [];
    }

    // ✅ SAFE payment mode
    const allowedModes = ["Cash", "Online", "UPI", "Card", "Bank"];
    const safePaymentMode = allowedModes.includes(paymentMode)
      ? paymentMode
      : "Online";

    // ✅ SAFE date (THIS FIXES 500)
    const safeDate =
      date && !isNaN(new Date(date).getTime())
        ? new Date(date)
        : new Date();

    const rentIndex = form.rents.findIndex(
      (r) => r.month === month
    );

    const finalAmount = Number(rentAmount) || 0;

    if (rentIndex !== -1) {
      form.rents[rentIndex].rentAmount = finalAmount;
      form.rents[rentIndex].paymentMode = safePaymentMode;
      form.rents[rentIndex].date = safeDate;
    } else {
      form.rents.push({
        month,
        rentAmount: finalAmount,
        paymentMode: safePaymentMode,
        date: safeDate,
      });
    }

    await form.save();

    const smsMonthLabel =
      typeof month === "string" && /^\d{4}-\d{2}$/.test(month)
        ? new Date(
            Number(month.split("-")[0]),
            Number(month.split("-")[1]) - 1,
            1
          ).toLocaleString("en-IN", { month: "short", year: "numeric" })
        : month || new Date(safeDate).toLocaleString("en-IN", { month: "short", year: "numeric" });

    try {
      await sendSMS_MonthPayment(
        form,
        smsMonthLabel,
        finalAmount,
        safeDate,
        Number(form.baseRent) || 0
      );
    } catch (smsError) {
      console.error("⚠ Rent paid SMS send failed:", smsError?.message || smsError);
    }

    res.status(200).json({
      success: true,
      message: "Rent updated successfully",
      rents: form.rents,
    });

 } catch (error) {
  console.error("🔥 RENT UPDATE ERROR (FULL):", error);
  console.error("🔥 NAME:", error.name);
  console.error("🔥 MESSAGE:", error.message);
  console.error("🔥 ERRORS:", error.errors); // <-- CRITICAL

  res.status(500).json({
    message: "Error updating rent",
    name: error.name,
    error: error.message,
    details: error.errors,
  });
}
};






/* ──────────────────────────────────────────────────────────────────────────────
   DELETE main Form (archive copy in DuplicateForm)
   ──────────────────────────────────────────────────────────────────────────── */
const deleteForm = async (req, res) => {
  const { id } = req.params;

  try {
    const formToDelete = await Form.findById(id);
    if (!formToDelete) {
      return res.status(404).json({ message: 'Form not found' });
    }

    const duplicateForm = new DuplicateForm({
      originalFormId: formToDelete._id,
      formData: formToDelete,
      deletedAt: Date.now(),
    });

    await duplicateForm.save();
    await Form.findByIdAndDelete(id);

    res.status(200).json({ message: 'Form deleted and saved as a duplicate successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getDuplicateForms = async (req, res) => {
  try {
    const duplicateForms = await DuplicateForm.find().populate('originalFormId').exec();
    res.status(200).json(duplicateForms);
  } catch (err) {
    console.error('Error fetching duplicate forms:', err.message);
    res.status(500).json({ message: 'Error fetching duplicate forms' });
  }
};

const saveLeaveDate = async (req, res) => {
  const { id, leaveDate } = req.body;

  try {
    const form = await Form.findById(id);
    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    const normalizedLeaveDate = normalizeLeaveDate(leaveDate);
    if (!normalizedLeaveDate) {
      return res.status(400).json({ message: "Invalid leave date" });
    }

    const todayStart = startOfToday();

    if (normalizedLeaveDate < todayStart) {
      await archiveFormDocument(form, normalizedLeaveDate);
      return res.status(200).json({ message: "Leave date has passed. Tenant archived.", leaveDate: normalizedLeaveDate });
    }

    form.leaveDate = normalizedLeaveDate;
    await form.save();

    res.status(200).json({ form, leaveDate: form.leaveDate });
  } catch (error) {
    res.status(500).json({ message: "Error saving leave date: " + error.message });
  }
};

const checkAndArchiveLeaves = async () => {
  try {
    const archivedCount = await archiveOverdueForms();
    console.log(`Checked and archived ${archivedCount} expired leave records.`);
  } catch (error) {
    console.error("Error checking and archiving leaves:", error);
  }
};

checkAndArchiveLeaves().catch((error) => {
  console.error("Initial leave archive check failed:", error);
});

const getForms = async (req, res) => {
  try {
    const forms = await Form.find({});
    res.status(200).json(forms);
  } catch (error) {
    res.status(500).json({ message: "Error fetching forms: " + error.message });
  }
};

const archiveForm = async (req, res) => {
  const { id } = req.body;

  try {
    const formToArchive = await Form.findById(id);
    if (!formToArchive) {
      return res.status(404).json({ message: 'Form not found' });
    }

    const archivedData = await archiveFormDocument(formToArchive);

    res.status(200).json(archivedData);
  } catch (error) {
    res.status(500).json({ message: 'Error archiving form: ' + error.message });
  }
};

const restoreForm = async (req, res) => {
  const { id, category, roomNo, bedNo, floorNo } = req.body;

  try {
    const archivedData = await Archive.findById(id);
    if (!archivedData) return res.status(404).json({ message: "Archived data not found" });

    const archivedObj = archivedData.toObject();

    const { leaveDate, _id, __v, createdAt, updatedAt, ...restoredData } = archivedObj;

    restoredData.category = category || restoredData.category;
    restoredData.roomNo = roomNo || restoredData.roomNo;
    restoredData.bedNo = bedNo || restoredData.bedNo;

    if (!restoredData.category || !restoredData.roomNo || !restoredData.bedNo) {
      return res.status(400).json({
        message: "category, roomNo and bedNo are required to restore a tenant.",
      });
    }

    const room = await Room.findOne({
      category: restoredData.category,
      roomNo: restoredData.roomNo,
    }).lean();

    if (!room) {
      return res.status(404).json({ message: "Selected room was not found." });
    }

    const bedExists = (room.beds || []).some(
      (bed) =>
        String(bed?.bedNo || "").trim().toLowerCase() ===
        String(restoredData.bedNo || "").trim().toLowerCase()
    );

    if (!bedExists) {
      return res.status(404).json({ message: "Selected bed was not found in that room." });
    }

    const existingOccupant = await Form.findOne({
      category: restoredData.category,
      roomNo: restoredData.roomNo,
      bedNo: restoredData.bedNo,
    }).lean();

    if (existingOccupant) {
      return res.status(409).json({ message: "Selected room/bed is already occupied." });
    }

    restoredData.floorNo = floorNo || room.floorNo || restoredData.floorNo;
    restoredData.leaveDate = null;

    const restoredForm = await Form.create(restoredData);
    await Archive.findByIdAndDelete(id);

    return res.status(200).json({ message: "Tenant restored", data: restoredForm });
  } catch (error) {
    if (error?.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Duplicate srNo already exists" });
    }
    return res.status(500).json({ message: "Error restoring archived data", error: error.message });
  }
};


const getArchivedForms = async (req, res) => {
  try {
    const archivedForms = await Archive.find();
    res.status(200).json(archivedForms);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching archived forms: ' + error.message });
  }
};

// const updateProfile = async (req, res) => {
//   try {
//     const { id } = req.params;
//     let updateData = req.body;

//     console.log("📥 Update Tenant Body:", updateData);
//     console.log("📎 Incoming files:", req.files);

//     // 1) Clean out undefined / empty string fields
//   const protectedFields = ["category", "roomNo", "bedNo", "srNo"];

// Object.keys(updateData).forEach((key) => {
//   if (
//     (updateData[key] === undefined || updateData[key] === "") &&
//     !protectedFields.includes(key)
//   ) {
//     delete updateData[key];
//   }
// });


//     // 2) SPECIAL FIX: normalize depositAmount (can come as ["500","500"])
//     if (updateData.depositAmount !== undefined) {
//       if (Array.isArray(updateData.depositAmount)) {
//         // Take the last or first – here we take the last submitted
//         const last = updateData.depositAmount[updateData.depositAmount.length - 1];
//         updateData.depositAmount = Number(last);
//       } else {
//         updateData.depositAmount = Number(updateData.depositAmount);
//       }

//       // If still NaN, remove it so it doesn't crash
//       if (isNaN(updateData.depositAmount)) {
//         console.warn("⚠ depositAmount is NaN, removing from update");
//         delete updateData.depositAmount;
//       }
//     }

//     // 3) If files are uploaded, handle them
//     if (req.files?.length > 0) {
//       updateData.documents = req.files.map((file, index) => ({
//         fileName: file.originalname,
//         url: `/uploads/${file.filename}`,  // or wherever you store
//         contentType: file.mimetype,
//         size: file.size,
//         relation: updateData[`relation_${index}`] || "Self",
//       }));
//     }

//     // 4) Do the actual update
//     const updatedForm = await Form.findByIdAndUpdate(id, updateData, {
//       new: true,
//       runValidators: true,
//     });

//     if (!updatedForm) {
//       return res.status(404).json({ message: "Tenant not found" });
//     }

//     res.status(200).json({ message: "Updated successfully", updatedForm });
//   } catch (error) {
//     console.error("❌ Update error:", error);
//     res.status(500).json({ message: "Server Error", error: error.message });
//   }
// };




const updateProfile = async (req, res) => {
  try {
    const { id } = req.params;

    // helper: if value is array, take LAST (latest)
    const lastVal = (v) => (Array.isArray(v) ? v[v.length - 1] : v);

    // ✅ allowlist (recommended)
    const allowedFields = [
      "name",
      "phoneNo",
      "address",
      "companyAddress",
      "joiningDate",

      "category",   // ✅ must allow
      "floorNo",
      "roomNo",
      "bedNo",

      "relative1Name",
      "relative1Phone",
      "relative2Name",
      "relative2Phone",

      "depositAmount",
      "baseRent",
      "leaveDate",
    ];

    const updateData = {};

    // build clean update payload
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        const v = lastVal(req.body[key]);

        // remove empty string updates (so it won’t overwrite)
        if (v === "") continue;

        updateData[key] = v;
      }
    }

    console.log("📥 Update Tenant Body (raw):", req.body);
    console.log("✅ Update Tenant Data (clean):", updateData);

    // normalize numbers
    if (updateData.depositAmount !== undefined) {
      updateData.depositAmount = Number(updateData.depositAmount);
      if (isNaN(updateData.depositAmount)) delete updateData.depositAmount;
    }

    if (updateData.baseRent !== undefined) {
      updateData.baseRent = Number(updateData.baseRent);
      if (isNaN(updateData.baseRent)) delete updateData.baseRent;
    }

    // normalize date
    if (updateData.joiningDate) {
      updateData.joiningDate = new Date(updateData.joiningDate);
    }

    // files
    if (req.files?.length > 0) {
      updateData.documents = req.files.map((file, index) => ({
        fileName: file.originalname,
        url: `/uploads/${file.filename}`,
        contentType: file.mimetype,
        size: file.size,
        relation: lastVal(req.body[`relation_${index}`]) || "Self",
      }));
    }

    const updatedForm = await Form.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedForm) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    return res.status(200).json({ message: "Updated successfully", updatedForm });
  } catch (error) {
    // ✅ if unique index (category+roomNo+bedNo) blocks update
    if (error?.code === 11000) {
      return res.status(409).json({
        message: "This bed is already occupied in that building.",
        keyValue: error.keyValue,
      });
    }

    console.error("❌ Update error:", error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/**
 * GET /api/form/:id
 * Try Form collection first; if not found, then Archive.
 */
const getFormById = async (req, res) => {
  try {
    const { id } = req.params;

    let form = await Form.findById(id);
    if (!form) {
      form = await Archive.findById(id);
    }

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    res.json(form);
  } catch (error) {
    console.error("❌ Error in getFormById:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const rentAmountDel = async (req, res) => {
  const { formId, monthYear } = req.params;

  try {
    const form = await Form.findById(formId);
    if (!form) return res.status(404).json({ message: "Form not found" });

    form.rents = (form.rents || []).filter((rent) => rent.month !== monthYear);
    await form.save();

    res.status(200).json({ message: "Rent entry removed successfully", form });
  } catch (error) {
    console.error("Error removing rent entry:", error);
    res.status(500).json({ message: "Failed to remove rent", error });
  }
};

module.exports = {
  getNextSrNo,
  rentAmountDel,
  processLeave,
  getFormById,
  getForms,
  checkAndArchiveLeaves,
  updateProfile,
  getArchivedForms,
  saveLeaveDate,
  restoreForm,
  archiveForm,
  saveForm,
  getAllForms,
  updateForm,
  deleteForm,
  getDuplicateForms
};
