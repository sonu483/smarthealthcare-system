const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    age: { type: Number, default: 0 },
    gender: { type: String, default: "" },
    bloodGroup: { type: String, default: "Not specified" },
    contact: { type: String, default: "" },
    email: { type: String, default: "" },
    lastVisit: { type: String, default: "" },
    status: { type: String, default: "Active" },
    address: { type: String, default: "" },
    medicalHistory: { type: String, default: "" },
    doctor: { type: String, default: "" },
    source: { type: String, default: "manual" },
    archived: { type: Boolean, default: false },
    archivedAt: { type: String, default: "" },
    archivedBy: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Patient", patientSchema);
