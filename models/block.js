const mongoose = require("mongoose");

const blockSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true, unique: true },
    timestamp: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    action: { type: String, required: true },
    performedBy: {
      id: { type: String, default: "system" },
      email: { type: String, default: "system@pharmachain.local" },
      role: { type: String, default: "system" }
    },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    previousHash: { type: String, required: true },
    hash: { type: String, required: true, unique: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Block", blockSchema);
