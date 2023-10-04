const mongoose = require("mongoose");
const uuid = require("uuid");

const UserSchema = new mongoose.Schema(
  {
    userCode: {
      type: String,
      unique: true,
      default: function genUUID() {
        return uuid.v1();
      },
    },
    // firstName: { type: String, required: true },
    // lastName: { type: String, required: true },
    userGammaId: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    email: { type: String, required: true },
    // password: { type: String, required: true },
    // avatarURL: {
    //   type: String,
    //   default: null,
    // },
    deptsIn: [
      {
        type: String, // our deptId's
      },
    ],
    role: {
      type: String,
      enum: ["ROLE_USER", "ROLE_DEPT_ADMIN", "ROLE_SYSADMIN", "ROLE_TRAINING"],
      default: "ROLE_USER",
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
