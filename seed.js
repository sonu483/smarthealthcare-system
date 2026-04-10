require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const User = require("./models/user");
const Doctor = require("./models/doctor");
const Hospital = require("./models/hospital");
const Medecine = require("./models/medecine");
const Patient = require("./models/patient");
const Order = require("./models/order");
const Appointment = require("./models/appointment");

const storePath = path.join(__dirname, "data", "store.json");
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/pharmachain";

async function seed() {
  const data = JSON.parse(fs.readFileSync(storePath, "utf8"));
  await mongoose.connect(MONGODB_URI);

  await Promise.all([
    User.deleteMany({}),
    Doctor.deleteMany({}),
    Hospital.deleteMany({}),
    Medecine.deleteMany({}),
    Patient.deleteMany({}),
    Order.deleteMany({}),
    Appointment.deleteMany({})
  ]);

  await Promise.all([
    User.insertMany(data.users),
    Doctor.insertMany(data.doctors),
    Hospital.insertMany(data.hospitals),
    Medecine.insertMany(data.medicines),
    Patient.insertMany(data.patients),
    Order.insertMany(data.orders),
    Appointment.insertMany(data.appointments)
  ]);

  console.log("MongoDB seed completed");
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
