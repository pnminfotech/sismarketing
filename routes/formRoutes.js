// routes/formRoutes.js
const express = require('express');
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");

// Models (used by a couple of inline routes)
const Form = require('../models/formModels');

// Controllers
const {
  getNextSrNo,
  rentAmountDel,
  processLeave,
  getFormById,
  getForms,
  updateProfile,
  getArchivedForms,
  saveLeaveDate,
  restoreForm,
  archiveForm,
  getDuplicateForms,
  deleteForm,
  updateForm,
  saveForm,        // kept/exported for legacy use (NOT bound to POST /forms)
  getAllForms
} = require('../controllers/formController');

const { createWithOptionalInvite } = require("../controllers/forms/createWithOptionalInvite");

// NEW: invite controller routes
const { createInvite, validateInvite } = require("../controllers/invites");

// ───────────────────────────────────────────────────────────────────────────────
// CREATE: must be the ONLY creator for /forms
// ───────────────────────────────────────────────────────────────────────────────
router.post('/forms', createWithOptionalInvite);

// For UI to show next SrNo (server still assigns the real one)
router.get('/forms/count', getNextSrNo);
router.get("/tenants", getForms);
// ───────────────────────────────────────────────────────────────────────────────
// INVITES (create + validate)
// ───────────────────────────────────────────────────────────────────────────────
router.post('/invites', createInvite);
router.get('/invites/:token', validateInvite);

// ───────────────────────────────────────────────────────────────────────────────
// READ / UPDATE / DELETE
// ───────────────────────────────────────────────────────────────────────────────
router.get('/', getAllForms);

router.delete('/form/:id', deleteForm);
router.get('/duplicateforms', getDuplicateForms);

router.post('/forms/leave', saveLeaveDate);
router.post('/forms/archive', archiveForm);
router.post('/forms/restore', restoreForm);

// router.put("/update/:id", updateProfile);
router.put("/update/:id", upload.array("documents"), updateProfile);


router.get("/forms", getForms);
router.post("/leave", processLeave);

router.get('/forms/archived', getArchivedForms);
router.get('/form/:id', getFormById);

// rent entry delete by monthKey
router.delete("/form/:formId/rent/:monthYear", rentAmountDel);

// rent create/update
router.put('/form/:id', updateForm);

// cancel leave inline route
router.post('/cancel-leave', async (req, res) => {
  const { id } = req.body;
  try {
    await Form.findByIdAndUpdate(id, { $unset: { leaveDate: "" } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: "Error cancelling leave" });
  }
});

module.exports = router;
