// // mutakehostel_backend/routes/tenantRoutes.js
// const express = require("express");
// const { admitTenant, getTenants } = require("../controllers/tenant");

// const router = express.Router();

// // Add Tenant / Admission (this triggers SMS)
// router.post("/admit", admitTenant);

// // Optional: list tenants
// router.get("/", getTenants);

// module.exports = router;

// routes/tenantRoutes.js
const express = require("express");
const { admitTenant, getTenantDashboard } = require("../controllers/tenant");

const router = express.Router();

/**
 * Admit a new tenant (first time admission + welcome SMS)
 * POST /api/tenants/admit
 */
router.post("/admit", admitTenant);

/**
 * Tenant dashboard
 * GET /api/tenants/dashboard
 */
router.get("/dashboard", getTenantDashboard);

module.exports = router;
