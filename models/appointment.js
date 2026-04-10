const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    patientName: { type: String, required: true },
    patientPhone: { type: String, default: "" },
    patientEmail: { type: String, default: "" },
    symptoms: { type: String, default: "" },
    date: { type: String, default: "" },
    time: { type: String, default: "" },
    doctorId: { type: String, default: "" },
    doctorName: { type: String, default: "" },
    doctorEmail: { type: String, default: "" },
    consultationFee: { type: Number, default: 0 },
    paymentMethod: { type: String, default: "" },
    paymentStatus: { type: String, default: "pending" },
    paymentReference: { type: String, default: "" },
    upiId: { type: String, default: "" },
    cardLastFour: { type: String, default: "" },
    bankName: { type: String, default: "" },
    receiverAccountName: { type: String, default: "" },
    receiverUpiId: { type: String, default: "" },
    receiverAccountNumber: { type: String, default: "" },
    status: { type: String, default: "pending" },
    timestamp: { type: String, default: "" },
    confirmedAt: { type: String, default: "" },
    confirmationMessage: { type: String, default: "" },
    smsStatus: { type: String, default: "not_sent" },
    doctorNotificationMessage: { type: String, default: "" },
    doctorNotificationStatus: { type: String, default: "not_sent" },
    doctorSmsStatus: { type: String, default: "not_sent" },
    patientNotificationMessage: { type: String, default: "" },
    patientNotificationStatus: { type: String, default: "not_sent" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
