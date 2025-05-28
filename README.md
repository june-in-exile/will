# Web3 Testament System
A system to handle onchain estates left by the testator.

# How to use

```bash
# clone the main repo and all the submodules in one time
git clone --recursive https://github.com/june-in-exile/testament.git

# or clone first then initialzie the submodules
git clone https://github.com/june-in-exile/testament.git
git submodule update --init --recursive
```

Then check the [foundry's README.md](./foundry/) for the detailed instructions.

## TODO list
- [ ] Write the circom circuit for ZKP.
  - [ ] ZKP1 to prove that some json file is in the proper format.
    - [ ] contain "nonce", "deadline", and "signature" fields that can pass the permit2 verification if go with the other fields in the json files.
  - [ ] ZKP2 to prove that some json file can be encrypted into the given cyphertext with the given iv.
  - [ ] ZKP3 to prove that the former two json files are the same.
- [ ] pinata
