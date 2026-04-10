require("dotenv").config();
const mongoose = require("mongoose");
const Medecine = require("./models/medecine");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/pharmachain";

const medicinesToAdd = [
  {
    id: 4,
    name: "Paracetamol 500mg",
    category: "Pain Relief",
    price: 8.99,
    stock: 120,
    status: "In Stock",
    description: "Pain relief and fever reducer.",
    expiry: "2027-08-31"
  },
  {
    id: 5,
    name: "Metformin 500mg",
    category: "Diabetes",
    price: 15.99,
    stock: 40,
    status: "In Stock",
    description: "Helps control blood sugar levels.",
    expiry: "2027-03-31"
  },
  {
    id: 6,
    name: "Azithromycin 250mg",
    category: "Antibiotic",
    price: 19.5,
    stock: 30,
    status: "Low Stock",
    description: "Antibiotic for bacterial infections.",
    expiry: "2027-11-30"
  },
  {
    id: 7,
    name: "Atorvastatin 10mg",
    category: "Cholesterol",
    price: 22.75,
    stock: 70,
    status: "In Stock",
    description: "Lowers bad cholesterol.",
    expiry: "2028-01-31"
  },
  {
    id: 8,
    name: "Omeprazole 20mg",
    category: "Gastro",
    price: 12.25,
    stock: 55,
    status: "In Stock",
    description: "Reduces stomach acid.",
    expiry: "2027-10-31"
  }
];

async function addMedicines() {
  await mongoose.connect(MONGODB_URI);

  let inserted = 0;
  let skipped = 0;

  for (const medicine of medicinesToAdd) {
    const exists = await Medecine.findOne({
      $or: [{ id: medicine.id }, { name: medicine.name }]
    }).lean();

    if (exists) {
      skipped += 1;
      continue;
    }

    await Medecine.create(medicine);
    inserted += 1;
  }

  console.log(`Medicines inserted: ${inserted}`);
  console.log(`Medicines skipped: ${skipped}`);
  await mongoose.disconnect();
}

addMedicines().catch(async (error) => {
  console.error("Add medicines failed:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
