import dns from "node:dns";
import mongoose from "mongoose";

// Resolves mongodb+srv on some Windows/DNS setups
dns.setServers(["8.8.8.8", "8.8.4.4"]);

function getMongoUri() {
  const direct = (process.env.MONGO_URI || process.env.MONGODB_URI || "").trim();
  if (direct) return direct;

  const user = process.env.MONGO_USER?.trim();
  const password = process.env.MONGO_PASSWORD?.trim();
  const host =
    process.env.MONGO_HOST?.trim() || "aihabittracker.wynzucv.mongodb.net";
  const db = process.env.MONGO_DB?.trim() || "aihabittracker";

  if (user && password) {
    return `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}/${db}?retryWrites=true&w=majority&appName=AIHABITTRACKER`;
  }

  return null;
}

export const connectDB = async () => {
  const uri = getMongoUri();

  if (!uri) {
    throw new Error(
      "MongoDB URI is not defined. Set MONGO_URI in Backend/.env (see .env.example)."
    );
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    if (/bad auth|authentication failed/i.test(err.message)) {
      console.error(
        "MongoDB connection error: invalid username or password.\n" +
          "  1. Open MongoDB Atlas → Database Access → your user → Edit password.\n" +
          "  2. Put the real password in MONGO_URI (or MONGO_USER + MONGO_PASSWORD).\n" +
          "  3. URL-encode special characters in the password if using MONGO_URI directly."
      );
    } else if (/querySrv|ECONNREFUSED/i.test(err.message)) {
      console.error(
        "MongoDB connection error: DNS could not resolve Atlas SRV record.\n" +
          "  1. Check internet connection and firewall (allow Node.js).\n" +
          "  2. In Atlas → Network Access → add IP 0.0.0.0/0 for local dev.\n" +
          "  3. Retry after a minute; Windows DNS sometimes blocks SRV lookups."
      );
    } else {
      console.error("MongoDB connection error:", err.message);
    }
    throw err;
  }
};
