const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    firstName: { type: String, default: "" },
    middleName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    specialization: { type: String, required: true },
    primarySpecialization: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    hospital: { type: String, default: "" },
    licenseNumber: { type: String, default: "" },
    gender: { type: String, default: "" },
    invoiceName: { type: String, default: "" },
    experienceYears: { type: Number, default: 0 },
    dateOfBirth: { type: String, default: "" },
    registrationNumber: { type: String, default: "" },
    healthMantra: { type: String, default: "" },
    availabilityDays: { type: [String], default: [] },
    slotStart: { type: String, default: "" },
    slotEnd: { type: String, default: "" },
    slotNotes: { type: String, default: "" },
    addressType: { type: String, default: "Home" },
    addressLine1: { type: String, default: "" },
    landmark: { type: String, default: "" },
    state: { type: String, default: "" },
    city: { type: String, default: "" },
    pincode: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    ifscCode: { type: String, default: "" },
    accountHolderName: { type: String, default: "" },
    panCardNumber: { type: String, default: "" },
    qualificationTags: { type: [String], default: [] },
    documents: {
      aadharFrontName: { type: String, default: "" },
      panCardName: { type: String, default: "" },
      aadharBackName: { type: String, default: "" },
      cancelledChequeName: { type: String, default: "" }
    },
    status: { type: String, default: "active" },
    fee: { type: Number, default: 0 },
    archived: { type: Boolean, default: false },
    archivedAt: { type: String, default: "" },
    archivedBy: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Doctor", doctorSchema);
