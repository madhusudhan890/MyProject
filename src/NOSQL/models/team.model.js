const mongoose = require("mongoose");
const uuid = require("uuid");

const TeamSchema = new mongoose.Schema(
  {
    teamCode: {
      type: String,
      required: true,
      default: function genUUID() {
        return uuid.v1();
      },
    },
    teamGammaId: {
      type: Number,
      required: true,
    },
    teamName: {
      type: String,
      required: true,
    },
    departmentCode: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);
TeamSchema.index({ cName: "text" });

TeamSchema.virtual("Client", {
  ref: "Client",
  localField: ["teamCode"],
  foreignField: ["teamCode"],
  justOne: false,
});

TeamSchema.virtual("Department", {
  ref: "Department",
  localField: ["departmentCode"],
  foreignField: ["departmentCode"],
  justOne: false,
});

TeamSchema.set("toObject", { virtuals: true });
TeamSchema.set("toJSON", { virtuals: true });
module.exports = mongoose.model("Team", TeamSchema);
