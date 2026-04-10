const mongoose = require("mongoose");

const medecineSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    category: { type: String, default: "" },
    price: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    status: { type: String, default: "In Stock" },
    description: { type: String, default: "" },
    expiry: { type: String, default: "" },
    archived: { type: Boolean, default: false },
    archivedAt: { type: String, default: "" },
    archivedBy: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Medecine", medecineSchema);
