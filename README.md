# testament
A system to handle onchain estates left by the testator.

# How to use
Check the foundry's README.md for the detailed instructions.

## TODO list
- [ ] Add frontend function that to calls onchain-create2 functions (`predictTestament`).
- [ ] Write the circom circuit for ZKP.
- [ ] Fix IPFS uploading problem.
- [ ] Integrate the backend/frontend procedures.
  1. Calculate address of the contract using `predictTestament` and append to testament.
  2. Generate the signature for permit2 and append to testament.
  3. Encrypt the testament.
