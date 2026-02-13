import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    profileImg: {
      url: { type: String },
      filename: { type: String },
      publicId: { type: String },
    },

    firstName: { type: String, required: true },
    Bio: { type: String },
    middleName: { type: String },
    lastName: { type: String, required: true },
    pronoun: {
      type: String,
      enum: ["he/him", "she/her", "they/them", "others", "prefer not to say"],
      required: false,
    },
    gender: {
      type: String,
      enum: ["male", "female", "non-binary", "other", "prefer not to say"],
      required: false,
    },
    role: {
      type: String,
      enum: ["student", "teacher", "admin", "teacherAsStudent"],
      required: true,
    },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    homeAddress: { type: String },
    mailingAddress: { type: String },
    password: { type: String, required: true },

    isVarified: {
      type: Boolean,
      default: false,
    },
    stripeAccountId: { type: String, defualt: null },
    documents: {
      universityTranscripts: [
        {
          name: { type: String },
          url: { type: String },
          filename: { type: String },
          verificationStatus: {
            type: String,
            enum: ["verified", "not_verified", "pending"],
            default: "pending",
          },
        },
      ],
      teacherLicenses: [
        {
          name: { type: String },
          url: { type: String },
          filename: { type: String },
          verificationStatus: {
            type: String,
            enum: ["verified", "not_verified", "pending"],
            default: "pending",
          },
        },
      ],
      ids: [
        {
          name: { type: String }, // e.g., "Passport", "Driver’s License"
          url: { type: String },
          filename: { type: String },
          verificationStatus: {
            type: String,
            enum: ["verified", "not_verified", "pending"],
            default: "pending",
          },
        },
      ],
      resume: [
        {
          name: { type: String },
          url: { type: String },
          filename: { type: String },
          verificationStatus: {
            type: String,
            enum: ["verified", "not_verified", "pending"],
            default: "pending",
          },
        },
      ],
      portfolio: [
        {
          name: { type: String },
          url: { type: String },
          filename: { type: String },
          verificationStatus: {
            type: String,
            enum: ["verified", "not_verified", "pending"],
            default: "pending",
          },
        },
      ],
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
      default: null,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);

export default User;
