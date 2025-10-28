// controllers/invites.js
const crypto = require('crypto');
const Invite = require('../models/Invite');

exports.createInvite = async (req, res) => {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3); // 3 days

  const prefill = req.body || {};

  const origin = req.get('X-Origin') || req.get('Origin') || 'http://localhost:3000';
  // const url = new URL('/HostelManager/tenant-intake', origin);
   const url = new URL('/rentmanagementwebapp/tenant-intake', origin);

  url.searchParams.set('tenant', 'true');
  url.searchParams.set('lock', '1');
  url.searchParams.set('inv', token);

  if (prefill.name) url.searchParams.set('name', prefill.name);
  if (prefill.phoneNo) url.searchParams.set('phoneNo', String(prefill.phoneNo));
  if (prefill.roomNo) url.searchParams.set('roomNo', String(prefill.roomNo));
  if (prefill.bedNo) url.searchParams.set('bedNo', String(prefill.bedNo));
  if (prefill.rentAmount != null) url.searchParams.set('rentAmount', String(prefill.rentAmount));
  if (prefill.depositAmount != null) url.searchParams.set('depositAmount', String(prefill.depositAmount));

  const doc = await Invite.create({ token, prefill, expiresAt, usedAt: null });
  res.json({ ok: true, token, url: url.toString(), inviteId: doc._id });
};

exports.validateInvite = async (req, res) => {
  const { token } = req.params;
  const now = new Date();

  const invite = await Invite.findOne({ token });

  if (!invite) {
    return res.status(404).json({ ok: false, message: 'Invalid link' });
  }

  if (invite.expiresAt && invite.expiresAt <= now) {
    return res.status(410).json({ ok: false, message: 'Link expired' });
  }

  if (invite.usedAt) {
    return res.status(409).json({ ok: false, message: 'Link already used' });
  }

  res.json({ ok: true, prefill: invite.prefill || {} });
};
