const mongoose = require("mongoose");
const uuid = require("uuid");

const NotificationSchema = new mongoose.Schema(
  {
    notificationCode: {
      type: String,
      unique: true,
      default: function genUUID() {
        return uuid.v1();
      },
    },
    worksheetCode: {
      type: String,
      required: true,
    },
    departmentCode: {
      type: String,
      required: true,
    },
    teamCode: {
      type: String,
    },
    type: {
      type: String,
      required: true,
      default: "WORKSHEET",
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);
