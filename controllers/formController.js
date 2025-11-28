// controllers/formController.js
const Form = require('../models/formModels');
const Archive = require('../models/archiveSchema');
const DuplicateForm = require('../models/DuplicateForm');
const cron = require("node-cron");
const Counter = require('../models/counterModel');
const { sendSMS_MonthPayment } = require("../utils/sendSMS");
const { sendSMS_Admission } = require("../utils/sendSMS");

/* ──────────────────────────────────────────────────────────────────────────────
   LEAVE processing + daily archive
   ──────────────────────────────────────────────────────────────────────────── */
const processLeave = async (req, res) => {
  try {
    const { formId, leaveDate } = req.body;
    const form = await Form.findById(formId);

    if (!form) return res.status(404).json({ error: "Form not found" });

    const currentDate = new Date().toISOString().split("T")[0];

    if (leaveDate <= currentDate) {
      const archivedData = new Archive({ ...form.toObject(), leaveDate });
      await archivedData.save();
      await Form.findByIdAndDelete(formId);

      return res.status(200).json({ message: "Record archived successfully." });
    } else {
      form.leaveDate = leaveDate;
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
  const today = new Date().toLocaleDateString('en-CA'); 

    const formsToArchive = await Form.find({ leaveDate: today });

    for (const form of formsToArchive) {
      const archivedData = new Archive({ ...form.toObject(), leaveDate: today });
      await archivedData.save();
      await Form.findByIdAndDelete(form._id);
    }

    console.log(`Archived ${formsToArchive.length} records for ${today}`);
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
const updateForm = async (req, res) => {
  const { id } = req.params;
  const { rentAmount, date, month, paymentMode } = req.body;

  console.log("📝 updateForm called with:", { id, rentAmount, date, month, paymentMode });

  try {
    const form = await Form.findById(id);

    if (!form) {
      console.error("❌ Form not found for id:", id);
      return res.status(404).json({ message: "Form not found" });
    }

    if (!Array.isArray(form.rents)) {
      form.rents = [];
    }

    if (!month) {
      return res.status(400).json({ message: "Month is required for rent update" });
    }

    const paymentDate = date ? new Date(date) : new Date();
    if (isNaN(paymentDate.getTime())) {
      return res.status(400).json({ message: "Invalid date value" });
    }

    const index = form.rents.findIndex((rent) => rent.month === month);

    const rentObj = {
      rentAmount: Number(rentAmount) || 0,
      date: paymentDate,
      month,
    };

    if (paymentMode) {
      rentObj.paymentMode = paymentMode;
      rentObj.mode = paymentMode;
    }

    if (index !== -1) {
      form.rents[index] = { ...form.rents[index], ...rentObj };
    } else {
      form.rents.push(rentObj);
    }

    const updatedForm = await form.save();
    console.log("✅ Rent updated successfully for form:", id);

    /* 🚀🚀🚀 SEND MONTH PAYMENT SMS HERE */
    await sendSMS_MonthPayment(
      form,               // full tenant object
      month,              // e.g. "Nov-25"
      Number(rentAmount), // paid amount
      paymentDate,        // date1
      form.baseRent       // number1 (expected monthly rent)
    );

    return res.status(200).json(updatedForm);

  } catch (error) {
    console.error("❌ Error updating rent:", error);
    res.status(500).json({ message: "Error updating rent: " + error.message });
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

    form.leaveDate = new Date(leaveDate);
    await form.save();

    res.status(200).json({ form, leaveDate: form.leaveDate });
  } catch (error) {
    res.status(500).json({ message: "Error saving leave date: " + error.message });
  }
};

const checkAndArchiveLeaves = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiredForms = await Form.find({ leaveDate: today });

    for (let form of expiredForms) {
      await archiveAndDeleteForm(form);
    }

    console.log("Checked and archived expired leave records.");
  } catch (error) {
    console.error("Error checking and archiving leaves:", error);
  }
};

setInterval(checkAndArchiveLeaves, 24 * 60 * 60 * 1000);

const archiveAndDeleteForm = async (form) => {
  const archivedData = new Archive({ ...form._doc });
  await archivedData.save();
  await Form.findByIdAndDelete(form._id);
};

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

    const archivedData = new Archive({
      ...formToArchive._doc,
    });

    await archivedData.save();
    await Form.findByIdAndDelete(id);

    res.status(200).json(archivedData);
  } catch (error) {
    res.status(500).json({ message: 'Error archiving form: ' + error.message });
  }
};

const restoreForm = async (req, res) => {
  const { id } = req.body;
  console.log('Restore Request ID:', id);

  try {
    const archivedData = await Archive.findById(id);
    console.log('Archived Data Found:', archivedData);

    if (!archivedData) {
      return res.status(404).json({ message: 'Archived data not found' });
    }

    const { leaveDate, ...restoredData } = archivedData.toObject();

    const restoredForm = new Form(restoredData);
    await restoredForm.save();

    await Archive.findByIdAndDelete(id);
    console.log('Archived Data Deleted:', id);

    res.status(200).json(restoredForm);
  } catch (error) {
    console.error('Error restoring archived data:', error.message);
    res.status(500).json({ message: 'Error restoring archived data' });
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

const updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    let updateData = req.body;

    console.log("📥 Update Tenant Body:", updateData);
    console.log("📎 Incoming files:", req.files);

    // 1) Clean out undefined / empty string fields
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined || updateData[key] === "") {
        delete updateData[key];
      }
    });

    // 2) SPECIAL FIX: normalize depositAmount (can come as ["500","500"])
    if (updateData.depositAmount !== undefined) {
      if (Array.isArray(updateData.depositAmount)) {
        // Take the last or first – here we take the last submitted
        const last = updateData.depositAmount[updateData.depositAmount.length - 1];
        updateData.depositAmount = Number(last);
      } else {
        updateData.depositAmount = Number(updateData.depositAmount);
      }

      // If still NaN, remove it so it doesn't crash
      if (isNaN(updateData.depositAmount)) {
        console.warn("⚠ depositAmount is NaN, removing from update");
        delete updateData.depositAmount;
      }
    }

    // 3) If files are uploaded, handle them
    if (req.files?.length > 0) {
      updateData.documents = req.files.map((file, index) => ({
        fileName: file.originalname,
        url: `/uploads/${file.filename}`,  // or wherever you store
        contentType: file.mimetype,
        size: file.size,
        relation: updateData[`relation_${index}`] || "Self",
      }));
    }

    // 4) Do the actual update
    const updatedForm = await Form.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedForm) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    res.status(200).json({ message: "Updated successfully", updatedForm });
  } catch (error) {
    console.error("❌ Update error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
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
