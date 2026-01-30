import mongoose from "mongoose";

const TestClockSchema = new mongoose.Schema(
    {
        testClockId: { type: String },
    },
    { timestamps: true }
)

const TestClock = mongoose.model("TestClock", TestClockSchema)

export default TestClock
