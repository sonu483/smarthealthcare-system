require("dotenv").config();
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const User = require("./models/user");
const Doctor = require("./models/doctor");
const Hospital = require("./models/hospital");
const Medecine = require("./models/medecine");
const Patient = require("./models/patient");
const Order = require("./models/order");
const Appointment = require("./models/appointment");
const Block = require("./models/block");

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "pharmachain-local-secret";
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/pharmachain";
const PAYMENT_CONFIG = {
  accountName: process.env.PAYMENT_ACCOUNT_NAME || "Sonu Kumar",
  upiId: process.env.PAYMENT_UPI_ID || "AIRP0000001",
  accountNumber: process.env.PAYMENT_ACCOUNT_NUMBER || "8757463157"
};
const NOTIFICATION_CONFIG = {
  fromEmail: process.env.NOTIFY_FROM_EMAIL || "",
  resendApiKey: process.env.RESEND_API_KEY || "",
  fast2smsApiKey: process.env.FAST2SMS_API_KEY || "",
  fast2smsRoute: process.env.FAST2SMS_ROUTE || "q",
  fast2smsSenderId: process.env.FAST2SMS_SENDER_ID || "",
  twilioSid: process.env.TWILIO_ACCOUNT_SID || "",
  twilioToken: process.env.TWILIO_AUTH_TOKEN || "",
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || "",
  twilioVerifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID || ""
};
const frontendPath = path.join(__dirname, "..", "Sonu");

app.use(cors());
app.use(express.json());
app.use(express.static(frontendPath));

function normalizePhoneNumber(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (String(phone).trim().startsWith("+")) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

async function sendSmsNotification(to, message) {
  const toPhone = normalizePhoneNumber(to);
  if (!toPhone) {
    return { status: "not_available", detail: "Phone number missing" };
  }

  if (NOTIFICATION_CONFIG.fast2smsApiKey) {
    const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        authorization: NOTIFICATION_CONFIG.fast2smsApiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        route: NOTIFICATION_CONFIG.fast2smsRoute,
        sender_id: NOTIFICATION_CONFIG.fast2smsSenderId || undefined,
        message,
        language: "english",
        flash: 0,
        numbers: toPhone.replace(/^\+91/, "").replace(/^\+/, "")
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Fast2SMS failed: ${text}`);
    }

    return { status: "sent" };
  }

  if (!NOTIFICATION_CONFIG.twilioSid || !NOTIFICATION_CONFIG.twilioToken || !NOTIFICATION_CONFIG.twilioPhoneNumber) {
    return { status: "not_configured", detail: "Fast2SMS/Twilio credentials missing" };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${NOTIFICATION_CONFIG.twilioSid}/Messages.json`;
  const auth = Buffer.from(`${NOTIFICATION_CONFIG.twilioSid}:${NOTIFICATION_CONFIG.twilioToken}`).toString("base64");
  const body = new URLSearchParams({
    To: toPhone,
    From: NOTIFICATION_CONFIG.twilioPhoneNumber,
    Body: message
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Twilio SMS failed: ${text}`);
  }

  return { status: "sent" };
}

async function sendEmailNotification(to, subject, text) {
  if (!to) {
    return { status: "not_available", detail: "Email missing" };
  }
  if (!NOTIFICATION_CONFIG.resendApiKey || !NOTIFICATION_CONFIG.fromEmail) {
    return { status: "not_configured", detail: "Resend credentials missing" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTIFICATION_CONFIG.resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: NOTIFICATION_CONFIG.fromEmail,
      to: [to],
      subject,
      text
    })
  });

  if (!response.ok) {
    const textBody = await response.text();
    throw new Error(`Resend email failed: ${textBody}`);
  }

  return { status: "sent" };
}

function sortValue(value) {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = sortValue(value[key]);
        return result;
      }, {});
  }

  return value;
}

function stableStringify(value) {
  return JSON.stringify(sortValue(value));
}

function hashBlock(block) {
  return crypto
    .createHash("sha256")
    .update(
      stableStringify({
        index: block.index,
        timestamp: block.timestamp,
        entityType: block.entityType,
        entityId: block.entityId,
        action: block.action,
        performedBy: block.performedBy,
        payload: block.payload,
        previousHash: block.previousHash
      })
    )
    .digest("hex");
}

function sanitizeBlock(block) {
  const plainBlock = block.toObject ? block.toObject() : block;
  const { _id, __v, ...safeBlock } = plainBlock;
  return safeBlock;
}

function sanitizeEntityPayload(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeEntityPayload);
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.keys(value).reduce((result, key) => {
      if (["_id", "__v", "blockchainMeta"].includes(key)) {
        return result;
      }
      result[key] = sanitizeEntityPayload(value[key]);
      return result;
    }, {});
  }

  return value;
}

function createEntityRecordHash(entityType, payload) {
  return crypto
    .createHash("sha256")
    .update(
      stableStringify({
        entityType,
        payload: sanitizeEntityPayload(payload)
      })
    )
    .digest("hex");
}

function getContractMethodName(entityType) {
  switch (entityType) {
    case "medicines":
      return "registerMedicineBatch";
    case "appointments":
      return "logAppointment";
    case "orders":
      return "logOrder";
    case "doctors":
    case "patients":
    case "hospitals":
    case "users":
      return "registerParticipant";
    default:
      return "anchorRecord";
  }
}

function buildContractAnchor(entityType, entityId, payload, latestBlock) {
  return {
    ready: true,
    contractName: "SMARTHealthcareSystem",
    method: getContractMethodName(entityType),
    anchorKey: `${entityType}:${entityId}`,
    recordHash: createEntityRecordHash(entityType, payload),
    lastAnchoredBlock: latestBlock?.index ?? null,
    lastAnchoredAt: latestBlock?.timestamp || "",
    network: "PharmaChain private ledger",
    status: latestBlock ? "anchored" : "pending_anchor"
  };
}

function attachBlockchainMeta(entityType, item, latestBlock, totalEntries = null) {
  const safeItem = sanitizeEntityPayload(item);
  const currentHash = createEntityRecordHash(entityType, safeItem);
  const latestPayloadHash = latestBlock ? createEntityRecordHash(entityType, latestBlock.payload || {}) : "";
  const isArchived = Boolean(safeItem.archived);
  const isCurrentStateAnchored = Boolean(latestBlock) && latestPayloadHash === currentHash;

  return {
    ...safeItem,
    blockchainMeta: {
      enabled: true,
      entityType,
      recordHash: currentHash,
      latestBlockIndex: latestBlock?.index ?? null,
      latestAction: latestBlock?.action || "NO_BLOCK",
      latestBlockHash: latestBlock?.hash || "",
      totalEntries: totalEntries ?? (latestBlock ? 1 : 0),
      isArchived,
      isCurrentStateAnchored,
      verificationStatus: isCurrentStateAnchored ? "verified" : "pending_sync",
      anchoredAt: latestBlock?.timestamp || "",
      contract: buildContractAnchor(entityType, safeItem.id || safeItem._id || "UNKNOWN", safeItem, latestBlock)
    }
  };
}

async function getEntityBlockchainState(entityType, entityId, currentPayload = null) {
  const blocks = await Block.find({ entityType, entityId }).sort({ index: -1 }).lean();
  const latestBlock = blocks[0] ? sanitizeBlock(blocks[0]) : null;
  const currentHash = currentPayload ? createEntityRecordHash(entityType, currentPayload) : "";
  const latestPayloadHash = latestBlock ? createEntityRecordHash(entityType, latestBlock.payload || {}) : "";

  return {
    entityType,
    entityId,
    totalEntries: blocks.length,
    latestBlock,
    currentRecordHash: currentHash,
    latestPayloadHash,
    isCurrentStateAnchored: Boolean(latestBlock) && Boolean(currentHash) && currentHash === latestPayloadHash,
    verificationStatus: latestBlock
      ? currentHash === latestPayloadHash
        ? "verified"
        : "pending_sync"
      : "not_anchored",
    contract: buildContractAnchor(entityType, entityId, currentPayload || latestBlock?.payload || {}, latestBlock)
  };
}

async function ensureGenesisBlock() {
  const existingGenesis = await Block.findOne({ index: 0 }).lean();
  if (existingGenesis) {
    return existingGenesis;
  }

  const genesisBlock = {
    index: 0,
    timestamp: new Date().toISOString(),
    entityType: "system",
    entityId: "GENESIS",
    action: "GENESIS",
    performedBy: {
      id: "system",
      email: "system@pharmachain.local",
      role: "system"
    },
    payload: { message: "PharmaChain blockchain initialized" },
    previousHash: "0"
  };

  const createdGenesis = await Block.create({
    ...genesisBlock,
    hash: hashBlock(genesisBlock)
  });

  return sanitizeBlock(createdGenesis);
}

async function ensureDoctorEmailNotUnique() {
  try {
    const indexes = await Doctor.collection.indexes();
    const hasEmailUnique = indexes.some((index) => index.name === "email_1" && index.unique);
    if (hasEmailUnique) {
      await Doctor.collection.dropIndex("email_1");
      console.log("Dropped unique index email_1 on doctors");
    }
  } catch (error) {
    // Ignore if index doesn't exist or collection not ready
    console.log("Doctor index check skipped:", error.message);
  }
}

async function ensureDefaultUsers() {
  const defaults = [
    {
      id: "USR-001",
      name: "Sonu Admin",
      email: "admin@pharmachain.com",
      password: "admin123",
      role: "admin",
      company: "PharmaChain",
      phone: "9876543210"
    },
    {
      id: "USR-003",
      name: "Dr. Ananya Sharma",
      email: "doctor@pharmachain.com",
      password: "doctor123",
      role: "doctor",
      company: "City General Hospital",
      phone: "8757463157"
    }
  ];

  for (const defaultUser of defaults) {
    const existing = await User.findOne({ email: defaultUser.email });
    if (existing) {
      let changed = false;
      if (existing.role !== defaultUser.role) {
        existing.role = defaultUser.role;
        changed = true;
      }
      if (!existing.company) {
        existing.company = defaultUser.company;
        changed = true;
      }
      if (!existing.phone) {
        existing.phone = defaultUser.phone;
        changed = true;
      }
      if (changed) {
        await existing.save();
      }
      continue;
    }

    await User.create({
      id: defaultUser.id,
      name: defaultUser.name,
      email: defaultUser.email,
      password: await bcrypt.hash(defaultUser.password, 10),
      role: defaultUser.role,
      company: defaultUser.company,
      phone: defaultUser.phone,
      memberSince: new Date().toISOString().split("T")[0],
      lastLogin: new Date().toISOString()
    });
  }
}

async function addBlock({ entityType, entityId, action, payload, performedBy }) {
  const lastBlock = await Block.findOne().sort({ index: -1 }).lean();
  const previousBlock = lastBlock || (await ensureGenesisBlock());
  const block = {
    index: previousBlock.index + 1,
    timestamp: new Date().toISOString(),
    entityType,
    entityId,
    action,
    performedBy: performedBy || {
      id: "system",
      email: "system@pharmachain.local",
      role: "system"
    },
    payload,
    previousHash: previousBlock.hash
  };

  const createdBlock = await Block.create({
    ...block,
    hash: hashBlock(block)
  });

  return sanitizeBlock(createdBlock);
}

async function verifyBlockchain() {
  const blocks = await Block.find().sort({ index: 1 }).lean();

  if (!blocks.length) {
    return {
      valid: true,
      totalBlocks: 0,
      message: "Blockchain is empty"
    };
  }

  for (let index = 0; index < blocks.length; index += 1) {
    const currentBlock = blocks[index];
    const expectedHash = hashBlock(currentBlock);

    if (currentBlock.hash !== expectedHash) {
      return {
        valid: false,
        totalBlocks: blocks.length,
        invalidBlockIndex: currentBlock.index,
        message: "Block hash mismatch detected"
      };
    }

    if (index === 0) {
      if (currentBlock.previousHash !== "0") {
        return {
          valid: false,
          totalBlocks: blocks.length,
          invalidBlockIndex: currentBlock.index,
          message: "Genesis block previous hash is invalid"
        };
      }
      continue;
    }

    const previousBlock = blocks[index - 1];
    if (currentBlock.previousHash !== previousBlock.hash) {
      return {
        valid: false,
        totalBlocks: blocks.length,
        invalidBlockIndex: currentBlock.index,
        message: "Blockchain link mismatch detected"
      };
    }
  }

  return {
    valid: true,
    totalBlocks: blocks.length,
    latestBlockHash: blocks[blocks.length - 1].hash,
    message: "Blockchain is valid"
  };
}

function sanitizeUser(user) {
  if (!user) return null;
  const plainUser = user.toObject ? user.toObject() : user;
  const { password, _id, __v, ...safeUser } = plainUser;
  return safeUser;
}

function issueToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function getNextStringId(prefix, items) {
  const maxId = items.reduce((max, item) => {
    const rawId = String(item?.id || "");
    if (!rawId.startsWith(prefix)) return max;
    const numeric = Number.parseInt(rawId.slice(prefix.length), 10);
    if (Number.isNaN(numeric)) return max;
    return Math.max(max, numeric);
  }, 0);

  return `${prefix}${String(maxId + 1).padStart(3, "0")}`;
}

function getActor(req) {
  return req?.user
    ? {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      }
    : {
        id: "system",
        email: "system@pharmachain.local",
        role: "system"
      };
}

function createCrudRoutes(resourceName, Model, idPrefix, numericId = false) {
  app.get(`/api/${resourceName}`, authMiddleware, async (req, res) => {
    const includeArchived = String(req.query.includeArchived || "").toLowerCase() === "true";
    const filter = includeArchived ? {} : { archived: { $ne: true } };
    const [items, resourceBlocks] = await Promise.all([
      Model.find(filter).sort({ createdAt: 1, _id: 1 }).lean(),
      Block.find({ entityType: resourceName }).sort({ index: -1 }).lean()
    ]);

    const latestBlockByEntity = resourceBlocks.reduce((map, block) => {
      if (!map.has(block.entityId)) {
        map.set(block.entityId, sanitizeBlock(block));
      }
      return map;
    }, new Map());

    const entryCountByEntity = resourceBlocks.reduce((map, block) => {
      map.set(block.entityId, (map.get(block.entityId) || 0) + 1);
      return map;
    }, new Map());

    res.json(
      items.map(({ _id, __v, ...item }) =>
        attachBlockchainMeta(
          resourceName,
          item,
          latestBlockByEntity.get(item.id),
          entryCountByEntity.get(item.id) || 0
        )
      )
    );
  });

  app.post(`/api/${resourceName}`, authMiddleware, async (req, res) => {
    try {
      const items = await Model.find().lean();
      const nextId = numericId
        ? items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1
        : getNextStringId(idPrefix, items);

      const payloadToCreate = {
        ...req.body,
        id: req.body.id || nextId,
        archived: false,
        archivedAt: "",
        archivedBy: ""
      };

      let created;
      try {
        created = await Model.create(payloadToCreate);
      } catch (error) {
        if (error?.code === 11000 && error?.keyPattern?.id && !numericId) {
          const retryId = getNextStringId(idPrefix, await Model.find().lean());
          created = await Model.create({ ...payloadToCreate, id: retryId });
        } else {
          throw error;
        }
      }

      const { _id, __v, ...payload } = created.toObject();
      try {
        await addBlock({
          entityType: resourceName,
          entityId: payload.id,
          action: "CREATE",
          payload,
          performedBy: getActor(req)
        });
      } catch (error) {
        console.error("Blockchain add failed:", error.message);
      }
      const blockchainState = await getEntityBlockchainState(resourceName, payload.id, payload);
      res.status(201).json({
        ...payload,
        blockchainMeta: {
          enabled: true,
          entityType: resourceName,
          recordHash: blockchainState.currentRecordHash,
          latestBlockIndex: blockchainState.latestBlock?.index ?? null,
          latestAction: blockchainState.latestBlock?.action || "CREATE",
          latestBlockHash: blockchainState.latestBlock?.hash || "",
          totalEntries: blockchainState.totalEntries,
          isArchived: Boolean(payload.archived),
          isCurrentStateAnchored: blockchainState.isCurrentStateAnchored,
          verificationStatus: blockchainState.verificationStatus,
          anchoredAt: blockchainState.latestBlock?.timestamp || "",
          contract: blockchainState.contract
        }
      });
    } catch (error) {
      console.error(`Create ${resourceName} failed:`, error);
      res.status(500).json({
        message: error?.message || "Create failed"
      });
    }
  });

  app.put(`/api/${resourceName}/:id`, authMiddleware, async (req, res) => {
    try {
      const updated = await Model.findOneAndUpdate(
        { id: req.params.id },
        { ...req.body, id: req.params.id },
        { returnDocument: "after" }
      ).lean();

      if (!updated) {
        return res.status(404).json({ message: `${resourceName} not found` });
      }

      try {
        await addBlock({
          entityType: resourceName,
          entityId: updated.id,
          action: "UPDATE",
          payload: updated,
          performedBy: getActor(req)
        });
      } catch (error) {
        console.error("Blockchain add failed:", error.message);
      }
      const blockchainState = await getEntityBlockchainState(resourceName, updated.id, updated);
      res.json({
        ...updated,
        blockchainMeta: {
          enabled: true,
          entityType: resourceName,
          recordHash: blockchainState.currentRecordHash,
          latestBlockIndex: blockchainState.latestBlock?.index ?? null,
          latestAction: blockchainState.latestBlock?.action || "UPDATE",
          latestBlockHash: blockchainState.latestBlock?.hash || "",
          totalEntries: blockchainState.totalEntries,
          isArchived: Boolean(updated.archived),
          isCurrentStateAnchored: blockchainState.isCurrentStateAnchored,
          verificationStatus: blockchainState.verificationStatus,
          anchoredAt: blockchainState.latestBlock?.timestamp || "",
          contract: blockchainState.contract
        }
      });
    } catch (error) {
      console.error(`Update ${resourceName} failed:`, error);
      res.status(500).json({
        message: error?.message || "Update failed"
      });
    }
  });

  app.delete(`/api/${resourceName}/:id`, authMiddleware, async (req, res) => {
    try {
      const deleted = await Model.findOneAndUpdate(
        { id: req.params.id },
        {
          archived: true,
          archivedAt: new Date().toISOString(),
          archivedBy: req.user?.email || req.user?.id || "system"
        },
        { returnDocument: "after" }
      ).lean();

      if (!deleted) {
        return res.status(404).json({ message: `${resourceName} not found` });
      }

      try {
        await addBlock({
          entityType: resourceName,
          entityId: deleted.id,
          action: "ARCHIVE",
          payload: deleted,
          performedBy: getActor(req)
        });
      } catch (error) {
        console.error("Blockchain add failed:", error.message);
      }
      const blockchainState = await getEntityBlockchainState(resourceName, deleted.id, deleted);
      res.json({
        ...deleted,
        blockchainMeta: {
          enabled: true,
          entityType: resourceName,
          recordHash: blockchainState.currentRecordHash,
          latestBlockIndex: blockchainState.latestBlock?.index ?? null,
          latestAction: blockchainState.latestBlock?.action || "ARCHIVE",
          latestBlockHash: blockchainState.latestBlock?.hash || "",
          totalEntries: blockchainState.totalEntries,
          isArchived: Boolean(deleted.archived),
          isCurrentStateAnchored: blockchainState.isCurrentStateAnchored,
          verificationStatus: blockchainState.verificationStatus,
          anchoredAt: blockchainState.latestBlock?.timestamp || "",
          contract: blockchainState.contract
        }
      });
    } catch (error) {
      console.error(`Delete ${resourceName} failed:`, error);
      res.status(500).json({
        message: error?.message || "Delete failed"
      });
    }
  });
}

app.post("/api/auth/login", async (req, res) => {
  const { email, password, role } = req.body;
  let user = await User.findOne({ email: String(email).toLowerCase() });

  if (!user) {
    user = await User.create({
      id: getNextStringId("USR-", await User.find().lean()),
      name: String(email || "Guest User").split("@")[0] || "Guest User",
      email: String(email).toLowerCase(),
      password: await bcrypt.hash(password || "admin123", 10),
      role: role || "manufacturer",
      company: "PharmaChain",
      phone: "",
      memberSince: new Date().toISOString().split("T")[0],
      lastLogin: new Date().toISOString()
    });

    return res.json({ token: issueToken(user), user: sanitizeUser(user) });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch && user.email !== "admin@pharmachain.com") {
    user.password = await bcrypt.hash(password || "admin123", 10);
  } else if (!isMatch) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  if (user.email === "admin@pharmachain.com" && role === "admin") {
    user.role = "admin";
  }

  if (role && user.role !== role) {
    return res.status(403).json({ message: "Selected role does not match this account" });
  }

  user.lastLogin = new Date().toISOString();
  await user.save();

  res.json({ token: issueToken(user), user: sanitizeUser(user) });
});

app.post("/api/auth/register", async (req, res) => {
  const { firstName, lastName, email, company, phone, role, password } = req.body;
  const exists = await User.findOne({ email: String(email).toLowerCase() });

  if (exists) {
    return res.status(409).json({ message: "Email already exists" });
  }

  const user = await User.create({
    id: getNextStringId("USR-", await User.find().lean()),
    name: `${firstName} ${lastName}`.trim(),
    email: String(email).toLowerCase(),
    password: await bcrypt.hash(password, 10),
    role: role || "manufacturer",
    company: company || "Not specified",
    phone: phone || "",
    memberSince: new Date().toISOString().split("T")[0],
    lastLogin: new Date().toISOString()
  });

  try {
    await addBlock({
      entityType: "users",
      entityId: user.id,
      action: "REGISTER",
      payload: sanitizeUser(user),
      performedBy: getActor(req)
    });
  } catch (error) {
    console.error("Blockchain add failed:", error.message);
  }

  res.status(201).json({ token: issueToken(user), user: sanitizeUser(user) });
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  const user = await User.findOne({ id: req.user.id });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  res.json(sanitizeUser(user));
});

app.get("/api/payment-config", authMiddleware, (req, res) => {
  res.json(PAYMENT_CONFIG);
});

app.post("/api/notifications/test", authMiddleware, async (req, res) => {
  const doctorEmail = req.body.doctorEmail || "";
  const doctorPhone = req.body.doctorPhone || "";
  const patientEmail = req.body.patientEmail || "";
  const patientPhone = req.body.patientPhone || "";
  const doctorName = req.body.doctorName || "Doctor";
  const patientName = req.body.patientName || "Patient";
  const appointmentDate = req.body.date || new Date().toISOString().split("T")[0];
  const appointmentTime = req.body.time || "10:30";

  const doctorMessage = `Test appointment request from ${patientName} for ${appointmentDate} at ${appointmentTime}.`;
  const patientMessage = `Test confirmation: your appointment with ${doctorName} is confirmed for ${appointmentDate} at ${appointmentTime}.`;

  const result = {
    doctorEmail: "not_requested",
    doctorSms: "not_requested",
    patientEmail: "not_requested",
    patientSms: "not_requested"
  };

  try {
    result.doctorEmail = (await sendEmailNotification(
      doctorEmail,
      "Test doctor appointment notification",
      doctorMessage
    )).status;
  } catch (error) {
    result.doctorEmail = `failed: ${error.message}`;
  }

  try {
    result.doctorSms = (await sendSmsNotification(doctorPhone, doctorMessage)).status;
  } catch (error) {
    result.doctorSms = `failed: ${error.message}`;
  }

  try {
    result.patientEmail = (await sendEmailNotification(
      patientEmail,
      "Test patient appointment confirmation",
      patientMessage
    )).status;
  } catch (error) {
    result.patientEmail = `failed: ${error.message}`;
  }

  try {
    result.patientSms = (await sendSmsNotification(patientPhone, patientMessage)).status;
  } catch (error) {
    result.patientSms = `failed: ${error.message}`;
  }

  res.json(result);
});

app.put("/api/auth/profile", authMiddleware, async (req, res) => {
  const user = await User.findOne({ id: req.user.id });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const nextName = String(req.body?.name || "").trim();
  const nextPhone = String(req.body?.phone || "").trim();
  const nextCompany = String(req.body?.company || "").trim();
  const nextAvatar = String(req.body?.avatar || "");

  if (!nextName) {
    return res.status(400).json({ message: "Name is required" });
  }

  if (nextAvatar && !nextAvatar.startsWith("data:image/")) {
    return res.status(400).json({ message: "Profile picture format is invalid" });
  }

  user.name = nextName;
  user.phone = nextPhone;
  user.company = nextCompany || user.company || "PharmaChain";
  user.avatar = nextAvatar;
  await user.save();

  try {
    await addBlock({
      entityType: "users",
      entityId: user.id,
      action: "PROFILE_UPDATED",
      payload: sanitizeUser(user),
      performedBy: getActor(req)
    });
  } catch (error) {
    console.error("Blockchain add failed:", error.message);
  }

  res.json({
    message: "Profile updated successfully",
    user: sanitizeUser(user)
  });
});

app.put("/api/auth/change-password", authMiddleware, async (req, res) => {
  const user = await User.findOne({ id: req.user.id });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = String(req.body?.newPassword || "");
  const confirmPassword = String(req.body?.confirmPassword || "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: "All password fields are required" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: "New password must be at least 6 characters" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "New password and confirm password must match" });
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: "Current password is incorrect" });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  try {
    await addBlock({
      entityType: "users",
      entityId: user.id,
      action: "PASSWORD_CHANGED",
      payload: {
        email: user.email,
        changedAt: new Date().toISOString()
      },
      performedBy: getActor(req)
    });
  } catch (error) {
    console.error("Blockchain add failed:", error.message);
  }

  res.json({ message: "Password changed successfully" });
});

app.get("/api/dashboard/stats", authMiddleware, async (req, res) => {
  const [doctors, hospitals, medicines, patients, orders, appointments, blocks] = await Promise.all([
    Doctor.find().lean(),
    Hospital.find().lean(),
    Medecine.find().lean(),
    Patient.find().lean(),
    Order.find().lean(),
    Appointment.find().lean(),
    Block.find().lean()
  ]);

  const blockchainVerification = await verifyBlockchain();

  res.json({
    doctors: doctors.length,
    hospitals: hospitals.length,
    medicines: medicines.length,
    patients: patients.length,
    orders: orders.length,
    appointments: appointments.length,
    pendingOrders: orders.filter((order) => order.status === "Pending").length,
    approvedOrders: orders.filter((order) => order.status === "Approved").length,
    deliveredOrders: orders.filter((order) => order.status === "Delivered").length,
    revenue: orders.reduce((sum, order) => sum + Number(String(order.amount).replace(/[^0-9.]/g, "")), 0),
    blocks: blocks.length,
    blockchainValid: blockchainVerification.valid,
    latestBlockHash: blockchainVerification.latestBlockHash || "",
    smartContractReady: true,
    privateLedgerEnabled: true
  });
});

app.get("/api/appointments", authMiddleware, async (req, res) => {
  const [appointments, appointmentBlocks] = await Promise.all([
    Appointment.find().lean(),
    Block.find({ entityType: "appointments" }).sort({ index: -1 }).lean()
  ]);

  const latestBlockByEntity = appointmentBlocks.reduce((map, block) => {
    if (!map.has(block.entityId)) {
      map.set(block.entityId, sanitizeBlock(block));
    }
    return map;
  }, new Map());

  const entryCountByEntity = appointmentBlocks.reduce((map, block) => {
    map.set(block.entityId, (map.get(block.entityId) || 0) + 1);
    return map;
  }, new Map());

  res.json(
    appointments.map((appointment) =>
      attachBlockchainMeta(
        "appointments",
        appointment,
        latestBlockByEntity.get(appointment.id),
        entryCountByEntity.get(appointment.id) || 0
      )
    )
  );
});

app.post("/api/appointments", authMiddleware, async (req, res) => {
  const doctor = await Doctor.findOne({ id: req.body.doctorId }).lean();
  const doctorEmail = req.body.doctorEmail || doctor?.email || "";
  const doctorPhone = doctor?.phone || "";
  const doctorNotificationMessage = doctorEmail
    ? `New appointment request from ${req.body.patientName || "Patient"} for ${req.body.date || "selected date"} at ${req.body.time || "selected time"}.`
    : "";
  const doctorSmsMessage = `New appointment request from ${req.body.patientName || "Patient"} on ${req.body.date || "selected date"} at ${req.body.time || "selected time"}.`;

  let doctorEmailStatus = doctorEmail ? "queued" : "not_available";
  let doctorSmsStatus = doctorPhone ? "queued" : "not_available";

  try {
    const emailResult = await sendEmailNotification(
      doctorEmail,
      "New PharmaChain appointment request",
      doctorNotificationMessage || doctorSmsMessage
    );
    doctorEmailStatus = emailResult.status;
  } catch (error) {
    doctorEmailStatus = "failed";
    console.error("Doctor email notification failed:", error.message);
  }

  try {
    const smsResult = await sendSmsNotification(doctorPhone, doctorSmsMessage);
    doctorSmsStatus = smsResult.status;
  } catch (error) {
    doctorSmsStatus = "failed";
    console.error("Doctor SMS notification failed:", error.message);
  }

  const appointment = await Appointment.create({
    ...req.body,
    doctorEmail,
    doctorNotificationMessage,
    doctorNotificationStatus: doctorEmailStatus,
    doctorSmsStatus,
    patientNotificationStatus: "pending_confirmation",
    id: getNextStringId("APT-", await Appointment.find().lean()),
    timestamp: new Date().toISOString(),
    status: req.body.status || "pending"
  });
  const { _id, __v, ...payload } = appointment.toObject();
  try {
    await addBlock({
      entityType: "appointments",
      entityId: payload.id,
      action: "CREATE",
      payload,
      performedBy: getActor(req)
    });
  } catch (error) {
    console.error("Blockchain add failed:", error.message);
  }
  const blockchainState = await getEntityBlockchainState("appointments", payload.id, payload);
  res.status(201).json({
    ...payload,
    blockchainMeta: {
      enabled: true,
      entityType: "appointments",
      recordHash: blockchainState.currentRecordHash,
      latestBlockIndex: blockchainState.latestBlock?.index ?? null,
      latestAction: blockchainState.latestBlock?.action || "CREATE",
      latestBlockHash: blockchainState.latestBlock?.hash || "",
      totalEntries: blockchainState.totalEntries,
      isArchived: false,
      isCurrentStateAnchored: blockchainState.isCurrentStateAnchored,
      verificationStatus: blockchainState.verificationStatus,
      anchoredAt: blockchainState.latestBlock?.timestamp || "",
      contract: blockchainState.contract
    }
  });
});

app.put("/api/appointments/:id", authMiddleware, async (req, res) => {
  const existingAppointment = await Appointment.findOne({ id: req.params.id }).lean();
  if (!existingAppointment) {
    return res.status(404).json({ message: "Appointment not found" });
  }

  const confirmationMessage = req.body.status === "confirmed"
    ? `Your appointment with ${existingAppointment.doctorName} is confirmed for ${existingAppointment.date} at ${existingAppointment.time}. Fee: Rs ${existingAppointment.consultationFee || 0}. Payment: ${existingAppointment.paymentStatus || "pending"}.`
    : req.body.confirmationMessage || existingAppointment.confirmationMessage || "";
  const patientNotificationMessage = req.body.status === "confirmed"
    ? `Your appointment is successfully confirmed with ${existingAppointment.doctorName} on ${existingAppointment.date} at ${existingAppointment.time}.`
    : existingAppointment.patientNotificationMessage || "";
  const patientEmail = existingAppointment.patientEmail || "";
  const patientPhone = existingAppointment.patientPhone || "";

  let patientEmailStatus = req.body.status === "confirmed"
    ? (patientEmail ? "queued" : "not_available")
    : (req.body.patientNotificationStatus || existingAppointment.patientNotificationStatus || "not_sent");
  let patientSmsStatus = req.body.status === "confirmed"
    ? (patientPhone ? "queued" : "not_available")
    : (req.body.smsStatus || existingAppointment.smsStatus || "not_sent");

  if (req.body.status === "confirmed") {
    try {
      const emailResult = await sendEmailNotification(
        patientEmail,
        "Your PharmaChain appointment is confirmed",
        patientNotificationMessage || confirmationMessage
      );
      patientEmailStatus = emailResult.status;
    } catch (error) {
      patientEmailStatus = "failed";
      console.error("Patient email notification failed:", error.message);
    }

    try {
      const smsResult = await sendSmsNotification(patientPhone, patientNotificationMessage || confirmationMessage);
      patientSmsStatus = smsResult.status;
    } catch (error) {
      patientSmsStatus = "failed";
      console.error("Patient SMS notification failed:", error.message);
    }
  }

  const appointment = await Appointment.findOneAndUpdate(
    { id: req.params.id },
    {
      ...req.body,
      id: req.params.id,
      confirmationMessage,
      smsStatus: patientSmsStatus,
      patientNotificationMessage,
      patientNotificationStatus: patientEmailStatus
    },
    { returnDocument: "after" }
  );

  if (req.body.status === "confirmed") {
    let patient = await Patient.findOne({ email: appointment.patientEmail || "" });

    if (!patient && appointment.patientPhone) {
      patient = await Patient.findOne({ contact: appointment.patientPhone });
    }

    if (!patient && appointment.patientName) {
      patient = await Patient.findOne({ name: appointment.patientName });
    }

    if (!patient) {
      patient = await Patient.create({
        id: getNextStringId("P-", await Patient.find().lean()),
        name: appointment.patientName,
        age: appointment.patientAge || 0,
        gender: appointment.patientGender || "Not specified",
        bloodGroup: "Not specified",
        contact: appointment.patientPhone || "",
        email: appointment.patientEmail || "",
        lastVisit: appointment.date,
        status: "Active",
        address: "Not provided",
        medicalHistory: appointment.symptoms || "",
        doctor: appointment.doctorName,
        source: "appointment"
      });

      try {
        await addBlock({
          entityType: "patients",
          entityId: patient.id,
          action: "CREATE",
          payload: patient.toObject(),
          performedBy: getActor(req)
        });
      } catch (error) {
        console.error("Blockchain add failed:", error.message);
      }
    } else {
      patient.name = appointment.patientName || patient.name;
      patient.contact = appointment.patientPhone || patient.contact;
      patient.email = appointment.patientEmail || patient.email;
      patient.lastVisit = appointment.date || patient.lastVisit;
      patient.status = "Active";
      patient.medicalHistory = appointment.symptoms || patient.medicalHistory;
      patient.doctor = appointment.doctorName || patient.doctor;
      patient.source = "appointment";
      await patient.save();

      try {
        await addBlock({
          entityType: "patients",
          entityId: patient.id,
          action: "UPDATE",
          payload: patient.toObject(),
          performedBy: getActor(req)
        });
      } catch (error) {
        console.error("Blockchain add failed:", error.message);
      }
    }
  }

  const { _id, __v, ...payload } = appointment.toObject();
  try {
    await addBlock({
      entityType: "appointments",
      entityId: payload.id,
      action: "UPDATE",
      payload,
      performedBy: getActor(req)
    });
  } catch (error) {
    console.error("Blockchain add failed:", error.message);
  }
  const blockchainState = await getEntityBlockchainState("appointments", payload.id, payload);
  res.json({
    ...payload,
    blockchainMeta: {
      enabled: true,
      entityType: "appointments",
      recordHash: blockchainState.currentRecordHash,
      latestBlockIndex: blockchainState.latestBlock?.index ?? null,
      latestAction: blockchainState.latestBlock?.action || "UPDATE",
      latestBlockHash: blockchainState.latestBlock?.hash || "",
      totalEntries: blockchainState.totalEntries,
      isArchived: false,
      isCurrentStateAnchored: blockchainState.isCurrentStateAnchored,
      verificationStatus: blockchainState.verificationStatus,
      anchoredAt: blockchainState.latestBlock?.timestamp || "",
      contract: blockchainState.contract
    }
  });
});

app.get("/api/blockchain", authMiddleware, async (req, res) => {
  const blocks = await Block.find().sort({ index: -1 }).limit(50).lean();
  res.json(blocks.map(sanitizeBlock));
});

app.get("/api/blockchain/verify", authMiddleware, async (req, res) => {
  const verification = await verifyBlockchain();
  res.json(verification);
});

app.get("/api/blockchain/stats", authMiddleware, async (req, res) => {
  const [verification, totalBlocks, latestBlocks] = await Promise.all([
    verifyBlockchain(),
    Block.countDocuments(),
    Block.find().sort({ index: -1 }).limit(5).lean()
  ]);

  const countsByEntity = await Block.aggregate([
    {
      $group: {
        _id: "$entityType",
        total: { $sum: 1 }
      }
    },
    { $sort: { total: -1, _id: 1 } }
  ]);

  res.json({
    ...verification,
    totalBlocks,
    latestBlocks: latestBlocks.map(sanitizeBlock),
    smartContractReady: true,
    privateLedgerEnabled: true,
    countsByEntity: countsByEntity.reduce((result, item) => {
      result[item._id] = item.total;
      return result;
    }, {})
  });
});

app.get("/api/blockchain/entity/:entityType/:entityId", authMiddleware, async (req, res) => {
  const blocks = await Block.find({
    entityType: req.params.entityType,
    entityId: req.params.entityId
  })
    .sort({ index: -1 })
    .lean();

  res.json(blocks.map(sanitizeBlock));
});

app.get("/api/blockchain/entity/:entityType/:entityId/verify-current", authMiddleware, async (req, res) => {
  const modelMap = {
    doctors: Doctor,
    hospitals: Hospital,
    patients: Patient,
    orders: Order,
    medicines: Medecine,
    appointments: Appointment,
    users: User
  };

  const Model = modelMap[req.params.entityType];
  if (!Model) {
    return res.status(404).json({ message: "Entity type not supported for verification" });
  }

  const record = await Model.findOne({ id: req.params.entityId }).lean();
  if (!record) {
    return res.status(404).json({ message: "Record not found" });
  }

  const blockchainState = await getEntityBlockchainState(req.params.entityType, req.params.entityId, record);
  res.json(blockchainState);
});

app.get("/api/blockchain/overview", authMiddleware, async (req, res) => {
  const [verification, latestBlocks] = await Promise.all([
    verifyBlockchain(),
    Block.find().sort({ index: -1 }).limit(12).lean()
  ]);

  const latestByEntity = latestBlocks.reduce((result, block) => {
    if (!result[block.entityType]) {
      result[block.entityType] = sanitizeBlock(block);
    }
    return result;
  }, {});

  res.json({
    valid: verification.valid,
    latestBlockHash: verification.latestBlockHash || "",
    totalBlocks: verification.totalBlocks || 0,
    smartContractReady: true,
    contractName: "SMARTHealthcareSystem",
    network: "PharmaChain private ledger",
    latestByEntity
  });
});

createCrudRoutes("doctors", Doctor, "DOC-");
createCrudRoutes("hospitals", Hospital, "H-");
createCrudRoutes("patients", Patient, "P-");
createCrudRoutes("orders", Order, "ORD-");
createCrudRoutes("medicines", Medecine, "", true);

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "login.html"));
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    return ensureDoctorEmailNotUnique();
  })
  .then(() => {
    return ensureDefaultUsers();
  })
  .then(() => {
    return ensureGenesisBlock();
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`PharmaChain server running on http://localhost:${PORT}`);
      console.log(`MongoDB connected at ${MONGODB_URI}`);
      console.log("Blockchain ledger initialized");
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
