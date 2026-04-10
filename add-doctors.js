require("dotenv").config();
const mongoose = require("mongoose");
const Doctor = require("./models/doctor");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/pharmachain";
const sharedEmail = "ksonukumar875746@gmail.com";

const doctorsToAdd = [
  {
    id: "DOC-003",
    name: "Dr. Meera Nair",
    specialization: "Neurology",
    email: sharedEmail,
    phone: "8757463159",
    hospital: "Neuro Care Institute",
    status: "active",
    fee: 1600
  },
  {
    id: "DOC-004",
    name: "Dr. Arjun Patel",
    specialization: "Orthopedics",
    email: sharedEmail,
    phone: "8757463160",
    hospital: "Bone and Joint Center",
    status: "active",
    fee: 1400
  },
  {
    id: "DOC-005",
    name: "Dr. Sana Iqbal",
    specialization: "Dermatology",
    email: sharedEmail,
    phone: "8757463161",
    hospital: "Skin Wellness Clinic",
    status: "active",
    fee: 1100
  },
  {
    id: "DOC-006",
    name: "Dr. Rohit Verma",
    specialization: "ENT",
    email: sharedEmail,
    phone: "8757463162",
    hospital: "Hearing and Sinus Hospital",
    status: "active",
    fee: 950
  },
  {
    id: "DOC-007",
    name: "Dr. Nisha Thomas",
    specialization: "Gynecology",
    email: sharedEmail,
    phone: "8757463163",
    hospital: "Women Care Center",
    status: "active",
    fee: 1300
  },
  {
    id: "DOC-008",
    name: "Dr. Pooja Singh",
    specialization: "Psychiatry",
    email: sharedEmail,
    phone: "8757463164",
    hospital: "Mind Care Clinic",
    status: "active",
    fee: 1250
  },
  {
    id: "DOC-009",
    name: "Dr. Vivek Rao",
    specialization: "Pulmonology",
    email: sharedEmail,
    phone: "8757463165",
    hospital: "Respira Chest Center",
    status: "active",
    fee: 1500
  }
];

async function addDoctors() {
  await mongoose.connect(MONGODB_URI);

  let inserted = 0;
  let skipped = 0;

  for (const doctor of doctorsToAdd) {
    const exists = await Doctor.findOne({
      $or: [{ id: doctor.id }, { name: doctor.name }]
    }).lean();

    if (exists) {
      skipped += 1;
      continue;
    }

    await Doctor.create(doctor);
    inserted += 1;
  }

  console.log(`Doctors inserted: ${inserted}`);
  console.log(`Doctors skipped: ${skipped}`);
  await mongoose.disconnect();
}

addDoctors().catch(async (error) => {
  console.error("Add doctors failed:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
