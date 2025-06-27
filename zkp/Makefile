CIRCUIT = multiplier2

DIR := ./circuits/$(CIRCUIT)
BUILD := $(DIR)/build
INPUT := $(DIR)/input
ZKEY := $(DIR)/keys
PROOF := $(DIR)/proofs
CONTRACT := $(DIR)/contracts

PTAU := ./shared/keys


all: trusted_setup_general compile input witness trusted_setup_specific prove verify solidity generate_call

clean:
	find . -maxdepth 1 -type f ! -name "README.md" ! -name "Makefile" ! -name "*.circom" ! -name "package*.json" -delete
	find . -maxdepth 1 -type d ! -name "." -exec rm -rf {} +

clean_specific:
	rm -rf $(BUILD) $(INPUT) $(ZKEY) $(PROOF) $(CONTRACT)

trusted_setup_general:
	mkdir -p $(PTAU)
	@if [ ! -f $(PTAU)/pot12_final.ptau ]; then \
		cd $(PTAU); \
		snarkjs powersoftau new bn128 12 pot12_0000.ptau -v; \
		snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v; \
		snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v; \
	fi
# snarkjs powersoftau truncate; \

compile:
	mkdir -p $(BUILD)
	circom $(DIR)/$(CIRCUIT).circom --r1cs --wasm --sym --output $(BUILD)
	
input:
	mkdir -p $(INPUT)
	echo "{\"a\": \"3\", \"b\": \"11\"}" > $(INPUT)/input.json

witness:
	snarkjs wtns calculate $(BUILD)/$(CIRCUIT)_js/$(CIRCUIT).wasm $(INPUT)/input.json $(BUILD)/witness.wtns

trusted_setup_specific:
	mkdir -p $(ZKEY)
	snarkjs groth16 setup $(BUILD)/$(CIRCUIT).r1cs $(PTAU)/pot12_final.ptau $(ZKEY)/$(CIRCUIT)_0000.zkey
	snarkjs zkey contribute $(ZKEY)/$(CIRCUIT)_0000.zkey $(ZKEY)/$(CIRCUIT)_0001.zkey --name="1st Contributor Name" -v
	snarkjs zkey export verificationkey $(ZKEY)/$(CIRCUIT)_0001.zkey $(ZKEY)/verification_key.json

prove:
	mkdir -p $(PROOF)
	snarkjs groth16 prove $(ZKEY)/$(CIRCUIT)_0001.zkey $(BUILD)/witness.wtns $(PROOF)/proof.json $(PROOF)/public.json

verify:
	snarkjs groth16 verify $(ZKEY)/verification_key.json $(PROOF)/public.json $(PROOF)/proof.json

solidity:
	mkdir -p $(CONTRACT)
	snarkjs zkey export solidityverifier $(ZKEY)/$(CIRCUIT)_0001.zkey $(CONTRACT)/verifier.sol
	cp $(CONTRACT)/verifier.sol ../contracts/src/Groth16Verifier.sol

generate_call:
	snarkjs generatecall $(PROOF)/public.json $(PROOF)/proof.json