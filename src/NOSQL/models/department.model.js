const mongoose = require("mongoose");
const uuid = require("uuid");

const DepartmentSchema = new mongoose.Schema(
  {
    departmentCode: {
      type: String,
      required: true,
      default: function genUUID() {
        return uuid.v1();
      },
    },
    departmentGammaId: {
      type: Number,
      required: true,
    },
    departmentName: {
      type: String,
      required: true,
    },
    usersIn: {
      type: [String],
    },
    teamsAvailable:{
        type: Boolean,
        required: true,
        default: false
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

DepartmentSchema.index({departmentName: 'text'})

DepartmentSchema.virtual("Team", {
  ref: "Team",
  localField: ["departmentCode"],
  foreignField: ["departmentCode"],
  justOne: false,
});

DepartmentSchema.virtual("Client", {
  ref: "Client",
  localField: ["departmentCode"],
  foreignField: ["departmentCode"],
  justOne: false,
});

module.exports = mongoose.model("Department", DepartmentSchema);
