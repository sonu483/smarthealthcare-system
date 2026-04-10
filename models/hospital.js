const mongoose = require("mongoose");

const hospitalSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, default: "general" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    zip: { type: String, default: "" },
    license: { type: String, default: "" },
    capacity: { type: Number, default: 0 },
    services: { type: String, default: "" },
    status: { type: String, default: "active" },
    accreditation: { type: String, default: "" },
    createdAt: { type: String },
    archived: { type: Boolean, default: false },
    archivedAt: { type: String, default: "" },
    archivedBy: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Hospital", hospitalSchema);
