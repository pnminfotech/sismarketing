const mongoose = require("mongoose");

const SmsLogSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["success", "failed", "skipped"],
      required: true,
    },
    eventType: { type: String, required: true },
    provider: { type: String, default: "MSG91" },
    flowId: { type: String, default: null },
    templateId: { type: String, default: null },
    recipientMobile: { type: String, default: null },
    recipientCount: { type: Number, default: 1, min: 0 },
    message: { type: String, default: null },
    requestPayload: { type: mongoose.Schema.Types.Mixed, default: null },
    responsePayload: { type: mongoose.Schema.Types.Mixed, default: null },
    errorMessage: { type: String, default: null },
    providerStatusCode: { type: Number, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SmsLog", SmsLogSchema);
