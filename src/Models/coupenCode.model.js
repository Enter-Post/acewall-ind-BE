import mongoose from "mongoose"

const coupenCodeSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    discount: { type: Number, required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "CourseSch", required: true },
    demandedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ['accepted', 'pending', 'rejected'], default: 'active' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
})

const CoupenCode = mongoose.model("CoupenCode", coupenCodeSchema)

export default CoupenCode;