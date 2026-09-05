const mongoose = require("mongoose");
const logger = require("../utils/logger");

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URL);

    logger.info("database.connected");
  } catch (error) {
    logger.error("database.connection.failed", error);
    process.exit(1);
  }
}

module.exports = connectDB;
