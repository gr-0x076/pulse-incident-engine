const mongoose = require('mongoose');

/**
 * Execute work inside a MongoDB transaction if replica set is active,
 * otherwise execute directly with graceful fallback for standalone development.
 */
const runInSafeTransaction = async (workFn) => {
  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const result = await workFn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    // Check if error is because standalone mongo doesn't support transactions
    const isStandaloneError =
      error.message &&
      (error.message.includes('Transactions are not supported by this deployment') ||
       error.message.includes('replica set') ||
       error.codeName === 'CommandNotSupportedOnStandalone');

    if (isStandaloneError) {
      // Re-run directly without session
      return await workFn(null);
    }
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

module.exports = { runInSafeTransaction };
