import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000,
    });
    console.log("DB connected succcesfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    
    // Provide helpful troubleshooting info
    if (error.name === "MongoNetworkError" || error.code === "ESERVFAIL") {
      console.error("💡 Possible causes:");
      console.error("  - No internet connection");
      console.error("  - MongoDB server is down");
      console.error("  - Firewall blocking connection");
      console.error("  - Invalid connection string in .env");
      console.error("  - Check MONGODB_URI:", process.env.MONGODB_URI ? "Set" : "Missing");
    }
    
    // Don't crash the server immediately, let it handle requests with error responses
    // In production, you might want to: process.exit(1);
  }
};

// Handle MongoDB connection events
mongoose.connection.on("connected", () => {
  console.log("✅ MongoDB connected");
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  MongoDB disconnected - attempting to reconnect...");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB connection error:", err.message);
});

mongoose.connection.on("reconnected", () => {
  console.log("✅ MongoDB reconnected");
});