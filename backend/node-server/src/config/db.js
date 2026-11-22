const mongoose = require("mongoose");
const dns = require("dns");
const { mongoUri } = require("./env");

if (dns && typeof dns.setServers === "function") {
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  } catch (e) {
    // Ignore if not supported
  }
}

async function connectDatabase() {
  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");
}

module.exports = connectDatabase;