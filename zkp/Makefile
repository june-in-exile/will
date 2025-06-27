CIRCUIT = multiplier2

DIR := ./circuits/$(CIRCUIT)
BUILD := $(DIR)/build
INPUT := $(DIR)/input
ZKEY := $(DIR)/keys
PROOF := $(DIR)/proofs
CONTRACT := $(DIR)/contracts

PTAU := ./circuits/shared/keys

all: trusted_setup_general compile input witness trusted_setup_specific prove verify solidity generate_call

clean:
	@for circuit_dir in circuits/*/; do \
		[ -d "$$circuit_dir" ] && [ "$$(basename "$$circuit_dir")" != "shared" ] || continue; \
		find "$$circuit_dir" -maxdepth 1 -type f ! -name "*.circom" -delete; \
		find "$$circuit_dir" -maxdepth 1 -type d ! -name "$$(basename "$$circuit_dir")" ! -name "components" -exec rm -rf {} + 2>/dev/null || true; \
	done

clean_circuit:
	@echo "Cleaning $(CIRCUIT)..."
	@find $(DIR) -maxdepth 1 -type f ! -name "*.circom" -delete 2>/dev/null || true
	@find $(DIR) -maxdepth 1 -type d ! -name $(CIRCUIT) ! -name "components" -exec rm -rf {} + 2>/dev/null || true
	@echo "$(CIRCUIT) cleaned!"; \

clean-%:
	@echo "Cleaning $*..."
	@if [ -d "circuits/$*" ]; then \
		find circuits/$*/ -maxdepth 1 -type f ! -name "*.circom" -delete 2>/dev/null || true; \
		find circuits/$*/ -maxdepth 1 -type d ! -name "$*" ! -name "components" -exec rm -rf {} + 2>/dev/null || true; \
		echo "$* cleaned!"; \
	else \
		echo "Error: circuits/$* not exists"; \
	fi

trusted_setup_general:
	mkdir -p $(PTAU)
	@if [ ! -f $(PTAU)/pot12_final.ptau ]; then \
		cd $(PTAU); \
		snarkjs powersoftau new bn128 12 pot12_0000.ptau -v; \
		snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v; \
		snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v; \
		snarkjs powersoftau truncate; \
	fi

compile:
	mkdir -p $(BUILD)
	circom $(DIR)/$(CIRCUIT).circom --r1cs --wasm --sym --output $(BUILD)
	
input:
	mkdir -p $(INPUT)
	echo "{\"a\": \"3\", \"b\": \"11\"}" > $(INPUT)/example.json

witness:
	snarkjs wtns calculate $(BUILD)/$(CIRCUIT)_js/$(CIRCUIT).wasm $(INPUT)/example.json $(BUILD)/witness.wtns

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