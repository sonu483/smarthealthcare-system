SMART Healthcare System smart contract layer

Files:
- `SMARTHealthcareSystem.sol`

What this contract supports:
- participant registration for admin, doctor, patient, pharmacy, distributor, manufacturer
- medicine batch registration on-chain
- batch transfer history between supply-chain participants
- medicine verification status
- appointment record hash logging
- order record hash logging

Suggested use in this project:
1. Register project roles on-chain
2. Save medicine batch ids and metadata hashes from the backend
3. Store appointment/order record hashes for tamper-evident verification
4. Use `verifyMedicineBatch()` to confirm authenticity
5. Use `getMedicineHistory()` to show traceability

Example deployment flow:
- Remix IDE
- Solidity compiler `0.8.20`
- Deploy `SMARTHealthcareSystem`
- Copy deployed contract address and ABI
- Connect frontend/backend later if needed

Important:
- This contract is added without removing any existing project function.
- Current backend blockchain ledger can continue working alongside this Solidity contract.
