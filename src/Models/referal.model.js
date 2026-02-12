import mongoose from "mongoose"

const referralSchema = new mongoose.Schema({
    referralCode: {
        type: String,
        required: true,
        unique: true
    },
    referralLink: {
        required: true,
        unique: true
    },
    referralUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
})


const Referral = mongoose.model("Referral", referralSchema)

export default Referral