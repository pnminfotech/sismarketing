// controllers/forms/createWithOptionalInvite.js
const mongoose = require("mongoose");
const Invite = require("../../models/Invite");
const Form = require("../../models/formModels");
const Counter = require("../../models/counterModel");

// ⭐ ADD THIS IMPORT
const { sendSMS_Admission } = require("../../utils/sendSMS");

// ───────────────────────────────────────────────────────────────────────────────
// Atomic sequence for srNo
// ───────────────────────────────────────────────────────────────────────────────
async function nextSrNo(session = null) {
  const opts = { new: true, upsert: true };
  if (session) opts.session = session;

  const doc = await Counter.findOneAndUpdate(
    { name: "form_srno" },
    { $inc: { seq: 1 } },
    opts
  );

  return Number(doc.seq);
}

// Always assign srNo on server
async function createFormWithSrNo(rest, session) {
  const payload = { ...rest };
  delete payload.srNo;
  payload.srNo = await nextSrNo(session);

  if (session) {
    const [doc] = await Form.create([payload], { session });
    return doc;
  }
  return await Form.create(payload);
}

async function createWithOptionalInvite(req, res) {
  const session = await mongoose.startSession();
  const { inviteToken, ...rest } = req.body;

  // ── No token: NORMAL tenant create ────────────────────────────────
  if (!inviteToken) {
    try {
      const saved = await createFormWithSrNo(rest, null);

      // ⭐ SEND ADMISSION SMS IMMEDIATELY
      try { await sendSMS_Admission(saved); } catch (smsErr) {
        console.error("⚠ SMS failed (admission):", smsErr);
      }

      return res.status(201).json(saved);

    } catch (err) {
      console.error("create form (no invite) error:", err);
      const isDupSr =
        err?.code === 11000 &&
        (err?.keyPattern?.srNo || /srNo/i.test(String(err?.errmsg || "")));
      const code = err.http || (isDupSr ? 409 : 500);
      return res
        .status(code)
        .json({ message: isDupSr ? "Sr No already exists, please retry." : (err.message || "Failed to create form") });
    }
  }

  // ── With token flow ───────────────────────────────────────────────
  const plainSingleUseFlow = async () => {
    const now = new Date();
    const invite = await Invite.findOneAndUpdate(
      { token: inviteToken, usedAt: null, expiresAt: { $gt: now } },
      { $set: { usedAt: now } },
      { new: true }
    );
    if (!invite) {
      const e = new Error("Invalid, expired, or already used link");
      e.http = 409;
      throw e;
    }

    const doc = await createFormWithSrNo(rest, null);

    // backlink
    await Invite.updateOne(
      { _id: invite._id },
      { $set: { usedByFormId: doc._id } }
    );

    // ⭐ SEND ADMISSION SMS HERE ALSO
    try { await sendSMS_Admission(doc); } catch (smsErr) {
      console.error("⚠ SMS failed (admission):", smsErr);
    }

    return doc;
  };

  try {
    let created = null;

    // Try transaction
    try {
      await session.withTransaction(async () => {
        const now = new Date();

        const invite = await Invite.findOneAndUpdate(
          { token: inviteToken, usedAt: null, expiresAt: { $gt: now } },
          { $set: { usedAt: now } },
          { new: true, session }
        );
        if (!invite) {
          const e = new Error("Invalid, expired, or already used link");
          e.http = 409;
          throw e;
        }

        const doc = await createFormWithSrNo(rest, session);

        await Invite.updateOne(
          { _id: invite._id },
          { $set: { usedByFormId: doc._id } },
          { session }
        );

        created = doc;
      });

      // ⭐ SEND ADMISSION SMS AFTER TRANSACTION SUCCESS
      try { await sendSMS_Admission(created); } catch (smsErr) {
        console.error("⚠ SMS failed (admission):", smsErr);
      }

    } catch (txErr) {
      const msg = String(txErr?.message || "");
      const noTx =
        txErr?.code === 20 ||
        /Transaction numbers are only allowed/i.test(msg) ||
        /replica set/i.test(msg);

      if (noTx) {
        console.warn("[invites] Falling back to non-transaction flow:", msg);
        created = await plainSingleUseFlow();
      } else {
        throw txErr;
      }
    }

    return res.status(201).json(created);

  } catch (err) {
    console.error("create (with invite) error:", err);
    const isDupSr =
      err?.code === 11000 &&
      (err?.keyPattern?.srNo || /srNo/i.test(String(err?.errmsg || "")));
    const code = err.http || (isDupSr ? 409 : 500);
    res.status(code).json({
      message: isDupSr ? "Sr No already exists, please retry." : (err.message || "Failed to create form"),
    });
  } finally {
    session.endSession();
  }
}

module.exports = { createWithOptionalInvite };
