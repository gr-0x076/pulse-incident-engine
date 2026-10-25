const mongoose = require('mongoose');
const { env } = require('./env');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

const connectDB = async () => {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const conn = await mongoose.connect(env.MONGODB_URI, {
        maxPoolSize: 10,
      });
      console.log(`✅ MongoDB connected: ${conn.connection.host}`);

      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected. Attempting reconnection...');
      });

      return conn;
    } catch (error) {
      retries++;
      console.error(`❌ MongoDB connection attempt ${retries}/${MAX_RETRIES} failed:`, error.message);
      if (retries >= MAX_RETRIES) {
        console.error('Failed to connect to MongoDB after maximum retries. Exiting.');
        process.exit(1);
      }
      const delay = RETRY_DELAY_MS * Math.pow(2, retries - 1);
      console.log(`Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

module.exports = { connectDB };
