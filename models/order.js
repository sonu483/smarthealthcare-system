const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    patient: { type: String, required: true },
    patientId: { type: String, default: "" },
    doctor: { type: String, default: "" },
    doctorId: { type: String, default: "" },
    date: { type: String, default: "" },
    amount: { type: String, default: "$0.00" },
    status: { type: String, default: "Pending" },
    medicines: { type: [String], default: [] },
    priority: { type: String, default: "normal" },
    deliveryDate: { type: String, default: "" },
    notes: { type: String, default: "" },
    deliveryAddress: { type: String, default: "" },
    contactNumber: { type: String, default: "" },
    paymentMethod: { type: String, default: "Cash on Delivery" },
    paymentStatus: { type: String, default: "Pending" },
    paymentReference: { type: String, default: "" },
    receiverAccountName: { type: String, default: "" },
    receiverUpiId: { type: String, default: "" },
    receiverAccountNumber: { type: String, default: "" },
    subtotal: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    platformFee: { type: Number, default: 0 },
    archived: { type: Boolean, default: false },
    archivedAt: { type: String, default: "" },
    archivedBy: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
