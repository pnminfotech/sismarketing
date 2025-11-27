// mutakehostel_backend/controllers/tenant.js
const Tenant = require("../models/Tenant");
const Rent = require("../models/Rent");
const Announcement = require("../models/Announcement");
const { calculateTenantDue } = require("../utils/calculateTenantDue");
const { sendAdmissionThanksSms } = require("../services/msg91Service");

/**
 * Admit a new tenant (first time admission)
 * This will:
 *  - create tenant in DB
 *  - send "welcome/admission confirmed" SMS via MSG91
 *
 * Route example: POST /api/tenants/admit
 * Body should include at least:
 *  - name
 *  - mobile
 *  - roomBed / bedNo / roomNo
 *  - admissionDate
 *  - depositAmount (or securityDeposit)
 */
exports.admitTenant = async (req, res) => {
  try {
    // 1) build tenant data from request
    const data = {
      ...req.body,
    };

    // make sure flag exists so we don't resend SMS again
    if (typeof data.welcomeSmsSent === "undefined") {
      data.welcomeSmsSent = false;
    }

    // 2) create tenant
    const tenant = await Tenant.create(data);

    // 3) work out deposit amount from whatever field you use
    const deposit =
      tenant.depositAmount ||
      tenant.securityDeposit ||
      tenant.deposit ||
      tenant.deposit_amt ||
      0;

    // 4) send welcome SMS only if:
    //    - mobile is present
    //    - deposit > 0
    //    - SMS not sent before
    if (
      tenant.mobile &&
      Number(deposit) > 0 &&
      (tenant.welcomeSmsSent === false ||
        typeof tenant.welcomeSmsSent === "undefined")
    ) {
      await sendAdmissionThanksSms(tenant);
      tenant.welcomeSmsSent = true;
      await tenant.save();
    }

    // 5) respond to frontend
    res.status(201).json(tenant);
  } catch (err) {
    console.error("Error in admitTenant:", err);
    res.status(500).json({ error: "Error admitting tenant" });
  }
};

/**
 * Tenant dashboard API (you already had this)
 */
exports.getTenantDashboard = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.user.id).lean();
    const due = await calculateTenantDue(req.user.id);

    const rents = await Rent.find({ tenantId: req.user.id }).lean();
    const ann = await Announcement.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.json({
      me: tenant,
      rents: {
        rents,
        due,
      },
      ann,
    });
  } catch (err) {
    console.error("Error in getTenantDashboard:", err);
    res.status(500).json({ error: "Server error" });
  }
};
