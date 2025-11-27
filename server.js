// ===============================================
// LOAD ENV FIRST (MUST BE FIRST LINE)
// ===============================================
require("dotenv").config();

// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const smsRoutes = require("./routes/smsRoutes");
const { connectDB } = require('./config/db');
const PaymentRoutes = require("./routes/payments");

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
const documentRoutes = require("./routes/documentRoutes");

// OLD + NEW TENANT ROUTES
const tenantAuthRoutes = require("./routes/tenant");        
const tenantRoutes = require("./routes/tenantRoutes");     

const Payment = require("./routes/payments");
const leaveRoutes = require("./routes/leaveRoutes");

const adminNotificationsRouter = require("./routes/adminattendenceNotifications");
const adminLeave = require("./routes/adminLeaveRoutes");

const app = express();

/* ----------------------------- Middleware ------------------------------ */
app.use(cors());
app.use(express.json());

// TENANT MODULE
app.use("/api/tenant", tenantAuthRoutes);
app.use("/api/tenants", tenantRoutes);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use("/api/sms", smsRoutes);

// Chrome CSP fix
app.get('/.well-known/appspecific/com.chrome.devtools.json', (_req, res) => res.sendStatus(204));

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'dev' }));

/* ------------------------------- API Routes -------------------------------- */
app.use('/api', authRoutes);
app.use('/api', formRoutes);
app.use('/api', formWithDocsRoutes);
app.use('/api', projectRoutes);

app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/light-bill', lightBillRoutes);
app.use('/api/other-expense', otherExpenseRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/documents', documentRoutes);

app.use('/api/payments', PaymentRoutes);
app.use('/api/tenant/leaves', leaveRoutes);

app.use("/api", require("./routes/notifications"));
app.use("/api", require("./routes/tenantAttendance"));
app.use("/api/admin", adminLeave);
app.use("/api/admin", adminNotificationsRouter);

/* -------------------------- DEV ROUTE LISTING -------------------------- */
function listRoutes(appInstance) {
  if (!appInstance?._router?.stack) return;

  const rows = [];
  appInstance._router.stack.forEach((layer) => {
    if (layer.route?.path) {
      const methods = Object.keys(layer.route.methods).map((m) => m.toUpperCase()).join(',');
      rows.push(`${methods.padEnd(10)} ${layer.route.path}`);
    }
  });
  console.log('== Registered routes ==');
  rows.forEach((r) => console.log(r));
}

if (process.env.NODE_ENV !== 'production') {
  listRoutes(app);
}

require("./utils/rentReminderCron");

/* ---------------------------- DB + SERVER -------------------------------- */
connectDB();

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
  console.log(`   Try: http://localhost:${PORT}/api/tenant/auth/ping`);
});
