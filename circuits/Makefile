all: clean trusted_setup_general compile trusted_setup_specific prove verify solidity generate_call

.PHONY: all

clean:
	find . -maxdepth 1 -type f ! -name "README.md" ! -name "Makefile" ! -name "*.circom" -delete
	find . -maxdepth 1 -type d ! -name "." -exec rm -rf {} +

trusted_setup_general:
	snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
	snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v

compile:
	circom multiplier2.circom --r1cs --wasm --sym --c
	cd multiplier2_js && \
		echo "{\"a\": \"3\", \"b\": \"11\"}" >> input.json && \
		snarkjs wtns calculate multiplier2.wasm input.json witness.wtns && \
		mv witness.wtns ..

trusted_setup_specific:
	snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v
	snarkjs groth16 setup multiplier2.r1cs pot12_final.ptau multiplier2_0000.zkey
	snarkjs zkey contribute multiplier2_0000.zkey multiplier2_0001.zkey --name="1st Contributor Name" -v
	snarkjs zkey export verificationkey multiplier2_0001.zkey verification_key.json

prove:
	snarkjs groth16 prove multiplier2_0001.zkey witness.wtns proof.json public.json

verify:
	snarkjs groth16 verify verification_key.json public.json proof.json

solidity:
	snarkjs zkey export solidityverifier multiplier2_0001.zkey verifier.sol

generate_call:
	snarkjs generatecall