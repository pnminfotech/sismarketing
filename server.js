

// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

const { connectDB } = require('./config/db');

// Routers
const formRoutes = require('./routes/formRoutes');
const maintenanceRoutes = require('./routes/MaintRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const projectRoutes = require('./routes/Project');
const roomRoutes = require('./routes/roomRoutes');
const lightBillRoutes = require('./routes/lightBillRoutes');
const otherExpenseRoutes = require('./routes/otherExpenseRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const authRoutes = require('./routes/authRoutes');
const formWithDocsRoutes = require('./routes/formWithDocs');
const documentRoutes = require('./routes/documentRoutes');
const tenantRoutes = require('./routes/tenant'); 
const Payment = require('./routes/payments');
const leaveRoutes = require("./routes/leaveRoutes");
const Notification = require("./models/Notification");
const adminNotificationsRouter = require("./routes/adminattendenceNotifications");
const adminLeave = require("./routes/adminLeaveRoutes");
dotenv.config();

const app = express();
console.log({
  formRoutes,
  maintenanceRoutes,
  supplierRoutes,
  projectRoutes,
  roomRoutes,
  lightBillRoutes,
  otherExpenseRoutes,
  uploadRoutes,
  authRoutes,
//  leaveTenantRoutes,
  documentRoutes,
  leaveRoutes,
});

/* ----------------------------- Middleware ------------------------------ */
app.use(cors());
app.use(express.json());
// app.use("/api/tenant/auth", tenantAuthRoutes);

// Static files for uploaded content
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static('uploads'));

// Optional: quiet Chrome DevTools CSP probe in dev (cosmetic)
app.get('/.well-known/appspecific/com.chrome.devtools.json', (_req, res) => res.sendStatus(204));

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'dev' }));
// app.use("/api", leaveRoutes);
/* ------------------------------- Routes -------------------------------- */
// Mount base collections under /api
app.use('/api', authRoutes);
app.use('/api', formRoutes);
app.use('/api', formWithDocsRoutes);
app.use('/api', projectRoutes);

// Namespaced mounts
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/light-bill', lightBillRoutes);
app.use('/api/other-expense', otherExpenseRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/documents', documentRoutes);

// ✅ Tenant module (this fixes your 404 for /api/tenant/auth/request-otp)
app.use('/api/tenant', tenantRoutes);
app.use('/api/payments', Payment);
// app.use("/api", leaveRoutes);
app.use("/api/tenant/leaves", leaveRoutes);
app.use("/api", require("./routes/notifications"));
// server.js / app.js
app.use("/api/admin", adminLeave);
app.use("/api", require("./routes/tenantAttendance"));

app.use("/api/admin", adminNotificationsRouter);


/* ----------------------- Route listing (optional) ---------------------- */
// Safe helper to log registered routes (dev only)
function listRoutes(appInstance) {
  if (!appInstance?._router?.stack) {
    console.log('No routes mounted yet.');
    return;
  }
  const rows = [];
  appInstance._router.stack.forEach((layer) => {
    if (layer.route && layer.route.path) {
      const methods = Object.keys(layer.route.methods)
        .map((m) => m.toUpperCase())
        .join(',');
      rows.push(`${methods.padEnd(10)} ${layer.route.path}`);
    } else if (layer.name === 'router' && layer.handle?.stack) {
      // nested routers (mounted with app.use(prefix, router))
      const mountPath = layer.regexp?.toString().replace(/\\/g, '').match(/^\/\^\\(.*)\\\/\?\$\//)?.[1] || '';
      layer.handle.stack.forEach((h) => {
        if (h.route) {
          const methods = Object.keys(h.route.methods)
            .map((m) => m.toUpperCase())
            .join(',');
          rows.push(`${methods.padEnd(10)} /${mountPath}${h.route.path === '/' ? '' : h.route.path}`);
        }
      });
    }
  });
  console.log('== Registered routes ==');
  rows.forEach((r) => console.log(r));
}

// Call it only in dev
if (process.env.NODE_ENV !== 'production') {
  listRoutes(app);
}

/* ---------------------------- DB + Server ------------------------------ */
connectDB();

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
  console.log(`   Try: http://localhost:${PORT}/api/tenant/auth/ping (if you added ping)`);
});

