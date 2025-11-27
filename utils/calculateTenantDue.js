// utils/calculateTenantDue.js

/**
 * Simple placeholder implementation.
 * You can later replace this to actually calculate pending rent for a tenant.
 *
 * @param {string} tenantId - Mongo ObjectId of tenant
 * @returns {Promise<number>} - total due amount
 */
async function calculateTenantDue(tenantId) {
  // TODO: implement real due logic using Rent model if you want
  // For now, always return 0 so dashboard works without crash.
  return 0;
}

module.exports = {
  calculateTenantDue,
};
