const SmsLog = require("../models/SmsLog");

function normalizeError(errorLike) {
  if (!errorLike) return null;
  if (typeof errorLike === "string") return errorLike;
  return errorLike.message || JSON.stringify(errorLike);
}

async function logSmsAttempt(entry) {
  try {
    await SmsLog.create({
      status: entry.status,
      eventType: entry.eventType || "unknown",
      provider: entry.provider || "MSG91",
      flowId: entry.flowId || null,
      templateId: entry.templateId || null,
      recipientMobile: entry.recipientMobile || null,
      recipientCount: Number(entry.recipientCount || 1),
      message: entry.message || null,
      requestPayload: entry.requestPayload || null,
      responsePayload: entry.responsePayload || null,
      errorMessage: normalizeError(entry.errorMessage || entry.error),
      providerStatusCode: entry.providerStatusCode || null,
      metadata: entry.metadata || null,
    });
  } catch (logError) {
    console.error("Failed to persist SMS log:", logError.message || logError);
  }
}

async function getTotalSentCount() {
  const [agg] = await SmsLog.aggregate([
    { $match: { status: "success" } },
    { $group: { _id: null, totalSent: { $sum: "$recipientCount" } } },
  ]);
  return agg?.totalSent || 0;
}

module.exports = {
  logSmsAttempt,
  getTotalSentCount,
};
