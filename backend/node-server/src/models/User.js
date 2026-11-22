const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    pincode: {
      type: String,
      trim: true,
      default: "560001"
    },
    city: {
      type: String,
      trim: true,
      default: "Bangalore"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);
