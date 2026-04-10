// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SMARTHealthcareSystem {
    address public owner;

    enum UserRole {
        None,
        Admin,
        Doctor,
        Patient,
        Pharmacy,
        Distributor,
        Manufacturer
    }

    struct Participant {
        string id;
        string name;
        string email;
        UserRole role;
        bool active;
        uint256 createdAt;
    }

    struct MedicineBatch {
        string batchId;
        string medicineName;
        string manufacturerId;
        string currentHolderId;
        string metadataHash;
        bool verified;
        uint256 createdAt;
        uint256 updatedAt;
    }

    struct AppointmentRecord {
        string appointmentId;
        string patientId;
        string doctorId;
        string recordHash;
        string status;
        uint256 createdAt;
    }

    struct OrderRecord {
        string orderId;
        string patientId;
        string medicineId;
        string orderHash;
        string status;
        uint256 createdAt;
    }

    mapping(address => bool) public admins;
    mapping(string => Participant) public participants;
    mapping(string => MedicineBatch) public medicineBatches;
    mapping(string => AppointmentRecord) public appointments;
    mapping(string => OrderRecord) public orders;
    mapping(string => string[]) private medicineHistory;

    event AdminUpdated(address indexed admin, bool allowed);
    event ParticipantRegistered(string indexed participantId, string name, UserRole role);
    event MedicineBatchRegistered(string indexed batchId, string medicineName, string manufacturerId);
    event MedicineTransferred(string indexed batchId, string fromParticipantId, string toParticipantId);
    event MedicineVerified(string indexed batchId, bool verified);
    event AppointmentLogged(string indexed appointmentId, string patientId, string doctorId, string status);
    event OrderLogged(string indexed orderId, string patientId, string medicineId, string status);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner allowed");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == owner || admins[msg.sender], "Only admin allowed");
        _;
    }

    constructor() {
        owner = msg.sender;
        admins[msg.sender] = true;
        emit AdminUpdated(msg.sender, true);
    }

    function setAdmin(address account, bool allowed) external onlyOwner {
        admins[account] = allowed;
        emit AdminUpdated(account, allowed);
    }

    function registerParticipant(
        string calldata participantId,
        string calldata name,
        string calldata email,
        UserRole role
    ) external onlyAdmin {
        require(bytes(participantId).length > 0, "Participant id required");
        require(bytes(name).length > 0, "Participant name required");
        require(role != UserRole.None, "Role required");

        participants[participantId] = Participant({
            id: participantId,
            name: name,
            email: email,
            role: role,
            active: true,
            createdAt: block.timestamp
        });

        emit ParticipantRegistered(participantId, name, role);
    }

    function registerMedicineBatch(
        string calldata batchId,
        string calldata medicineName,
        string calldata manufacturerId,
        string calldata metadataHash
    ) external onlyAdmin {
        require(bytes(batchId).length > 0, "Batch id required");
        require(bytes(medicineName).length > 0, "Medicine name required");
        require(participants[manufacturerId].active, "Manufacturer not registered");

        medicineBatches[batchId] = MedicineBatch({
            batchId: batchId,
            medicineName: medicineName,
            manufacturerId: manufacturerId,
            currentHolderId: manufacturerId,
            metadataHash: metadataHash,
            verified: true,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        medicineHistory[batchId].push(
            string(
                abi.encodePacked(
                    "Registered by ",
                    participants[manufacturerId].name
                )
            )
        );

        emit MedicineBatchRegistered(batchId, medicineName, manufacturerId);
    }

    function transferMedicineBatch(
        string calldata batchId,
        string calldata toParticipantId
    ) external onlyAdmin {
        MedicineBatch storage batch = medicineBatches[batchId];
        require(bytes(batch.batchId).length > 0, "Batch not found");
        require(participants[toParticipantId].active, "Receiver not registered");

        string memory fromParticipantId = batch.currentHolderId;
        batch.currentHolderId = toParticipantId;
        batch.updatedAt = block.timestamp;

        medicineHistory[batchId].push(
            string(
                abi.encodePacked(
                    "Transferred from ",
                    participants[fromParticipantId].name,
                    " to ",
                    participants[toParticipantId].name
                )
            )
        );

        emit MedicineTransferred(batchId, fromParticipantId, toParticipantId);
    }

    function verifyMedicineBatch(string calldata batchId) external view returns (
        string memory medicineName,
        string memory currentHolderId,
        string memory metadataHash,
        bool verified,
        uint256 updatedAt
    ) {
        MedicineBatch memory batch = medicineBatches[batchId];
        require(bytes(batch.batchId).length > 0, "Batch not found");

        return (
            batch.medicineName,
            batch.currentHolderId,
            batch.metadataHash,
            batch.verified,
            batch.updatedAt
        );
    }

    function setBatchVerification(string calldata batchId, bool verified) external onlyAdmin {
        MedicineBatch storage batch = medicineBatches[batchId];
        require(bytes(batch.batchId).length > 0, "Batch not found");

        batch.verified = verified;
        batch.updatedAt = block.timestamp;
        medicineHistory[batchId].push(verified ? "Batch marked verified" : "Batch marked unverified");

        emit MedicineVerified(batchId, verified);
    }

    function logAppointment(
        string calldata appointmentId,
        string calldata patientId,
        string calldata doctorId,
        string calldata recordHash,
        string calldata status
    ) external onlyAdmin {
        require(participants[patientId].active, "Patient not registered");
        require(participants[doctorId].active, "Doctor not registered");

        appointments[appointmentId] = AppointmentRecord({
            appointmentId: appointmentId,
            patientId: patientId,
            doctorId: doctorId,
            recordHash: recordHash,
            status: status,
            createdAt: block.timestamp
        });

        emit AppointmentLogged(appointmentId, patientId, doctorId, status);
    }

    function logOrder(
        string calldata orderId,
        string calldata patientId,
        string calldata medicineId,
        string calldata orderHash,
        string calldata status
    ) external onlyAdmin {
        require(participants[patientId].active, "Patient not registered");

        orders[orderId] = OrderRecord({
            orderId: orderId,
            patientId: patientId,
            medicineId: medicineId,
            orderHash: orderHash,
            status: status,
            createdAt: block.timestamp
        });

        emit OrderLogged(orderId, patientId, medicineId, status);
    }

    function getMedicineHistory(string calldata batchId) external view returns (string[] memory) {
        return medicineHistory[batchId];
    }
}
