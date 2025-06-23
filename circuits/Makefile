CIRCUIT=multiplier2

all: compile witness trusted_setup_general trusted_setup_specific prove verify solidity generate_call

.PHONY: all

clean:
	find . -maxdepth 1 -type f ! -name "README.md" ! -name "Makefile" ! -name "*.circom" ! -name "package*.json" -delete
	find . -maxdepth 1 -type d ! -name "." -exec rm -rf {} +

compile:
	circom $(CIRCUIT).circom --r1cs --wasm --sym

witness: compile
	$(eval TIMESTAMP := $(shell date +%Y%m%d_%H%M%S))
	$(eval FILENAME := input_$(TIMESTAMP).json)
	echo "{\"a\": \"3\", \"b\": \"11\"}" > "$(FILENAME)"
	cd $(CIRCUIT)_js && \
		snarkjs wtns calculate $(CIRCUIT).wasm ../$(FILENAME) ../witness.wtns

trusted_setup_general:
	@if [ ! -f pot12_0001.ptau ]; then \
		snarkjs powersoftau new bn128 12 pot12_0000.ptau -v; \
		snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v; \
	fi

trusted_setup_specific: trusted_setup_general
	snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v
	snarkjs groth16 setup $(CIRCUIT).r1cs pot12_final.ptau $(CIRCUIT)_0000.zkey
	snarkjs zkey contribute $(CIRCUIT)_0000.zkey $(CIRCUIT)_0001.zkey --name="1st Contributor Name" -v
	snarkjs zkey export verificationkey $(CIRCUIT)_0001.zkey verification_key.json

prove: witness trusted_setup_specific
	snarkjs groth16 prove $(CIRCUIT)_0001.zkey witness.wtns proof.json public.json

verify: prove
	snarkjs groth16 verify verification_key.json public.json proof.json

solidity: verify
	snarkjs zkey export solidityverifier $(CIRCUIT)_0001.zkey ../contracts/src/Groth16Verifier.sol

generate_call: solidity
	snarkjs generatecall