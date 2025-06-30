# Default circuit for circuit-specific operations
CIRCUIT ?= multiplier2

# Directory structure
DIR := ./circuits/$(CIRCUIT)
BUILD := $(DIR)/build
INPUT := $(DIR)/input
ZKEY := $(DIR)/keys
PROOF := $(DIR)/proofs
CONTRACT := $(DIR)/contracts
PTAU := ./circuits/shared/keys

# Default target
help:
	@echo "Available commands:"
	@echo ""
	@echo "⚗️  Circuit Operations (current: $(CIRCUIT)):"
	@echo "  make circuit             - Complete circuit setup (compile + keys + verifier)"
	@echo "  make compile             - Compile current circuit"
	@echo "  make witness             - Generate witness for current circuit"
	@echo "  make prove               - Generate proof for current circuit"
	@echo "  make verify              - Verify proof for current circuit"
	@echo "  make solidity            - Generate Solidity verifier"
	@echo "  make generate-call       - Generate Solidity call data"
	@echo ""
	@echo "🔑 Key Management:"
	@echo "  make trusted-setup-phase1    - Setup Powers of Tau (shared)"
	@echo "  make trusted-setup-phase2    - Setup circuit-specific keys"
	@echo ""
	@echo "🧹 Cleanup:"
	@echo "  make clean               - Clean current circuit ($(CIRCUIT))"
	@echo "  make clean-all           - Clean all circuits"
	@echo ""
	@echo "🎯 Circuit-specific operations:"
	@echo "  make CIRCUIT=<name> <command>  - Run command for specific circuit"

trusted-setup-phase1:
	@echo "⚡ Setting up Powers of Tau ceremony..."
	mkdir -p $(PTAU)
	@if [ ! -f $(PTAU)/pot12_final.ptau ]; then \
		cd $(PTAU); \
		snarkjs powersoftau new bn128 12 pot12_0000.ptau -v; \
		snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v; \
		snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v; \
		rm -f pot12_0000.ptau pot12_0001.ptau; \
		echo "✅ Powers of Tau ceremony completed!"; \
	else \
		echo "✅ Powers of Tau already exists!"; \
	fi

# Circuit operations
circuit: compile witness trusted-setup-phase2 prove verify solidity generate-call
	@echo "✅ Circuit $(CIRCUIT) setup completed!"

compile:
	@echo "🔨 Compiling circuit: $(CIRCUIT)..."
	mkdir -p $(BUILD)
	circom $(DIR)/$(CIRCUIT).circom --r1cs --wasm --sym --output $(BUILD)
	@echo "✅ Circuit $(CIRCUIT) compiled successfully!"

trusted-setup-phase2:
	@echo "🔑 Generating keys for $(CIRCUIT)..."
	mkdir -p $(ZKEY)
	@if [ ! -f $(PTAU)/pot12_final.ptau ]; then \
		echo "❌ Powers of Tau not found. Run 'make trusted-setup-phase1' first."; \
		exit 1; \
	fi
	snarkjs groth16 setup $(BUILD)/$(CIRCUIT).r1cs $(PTAU)/pot12_final.ptau $(ZKEY)/$(CIRCUIT)_0000.zkey
	snarkjs zkey contribute $(ZKEY)/$(CIRCUIT)_0000.zkey $(ZKEY)/$(CIRCUIT)_0001.zkey --name="1st Contributor Name" -v
	snarkjs zkey export verificationkey $(ZKEY)/$(CIRCUIT)_0001.zkey $(ZKEY)/verification_key.json
	@echo "✅ Keys generated successfully!"

witness:
	@echo "🧮 Generating witness for $(CIRCUIT)..."
	@if [ ! -f $(INPUT)/example.json ]; then \
		echo "❌ Input file not found."; \
		exit 1; \
	fi
	snarkjs wtns calculate $(BUILD)/$(CIRCUIT)_js/$(CIRCUIT).wasm $(INPUT)/example.json $(BUILD)/witness.wtns
	@echo "✅ Witness generated successfully!"

prove:
	@echo "🔐 Generating proof for $(CIRCUIT)..."
	mkdir -p $(PROOF)
	@if [ ! -f $(BUILD)/witness.wtns ]; then \
		echo "❌ Witness not found. Run 'make witness' first."; \
		exit 1; \
	fi
	snarkjs groth16 prove $(ZKEY)/$(CIRCUIT)_0001.zkey $(BUILD)/witness.wtns $(PROOF)/proof.json $(PROOF)/public.json
	@echo "✅ Proof generated successfully!"

verify:
	@echo "✅ Verifying proof for $(CIRCUIT)..."
	@if [ ! -f $(PROOF)/proof.json ]; then \
		echo "❌ Proof not found. Run 'make prove' first."; \
		exit 1; \
	fi
	snarkjs groth16 verify $(ZKEY)/verification_key.json $(PROOF)/public.json $(PROOF)/proof.json
	@echo "✅ Proof verification completed!"

solidity:
	@echo "📝 Generating Solidity verifier for $(CIRCUIT)..."
	mkdir -p $(CONTRACT)
	snarkjs zkey export solidityverifier $(ZKEY)/$(CIRCUIT)_0001.zkey $(CONTRACT)/verifier.sol
	@echo "✅ Solidity verifier generated: $(CONTRACT)/verifier.sol"

generate-call:
	@echo "📞 Generating Solidity call data for $(CIRCUIT)..."
	@if [ ! -f $(PROOF)/proof.json ]; then \
		echo "❌ Proof not found. Run 'make prove' first."; \
		exit 1; \
	fi
	snarkjs generatecall $(PROOF)/public.json $(PROOF)/proof.json

# Cleanup operations
_clean-dir:
	@find $(1) -maxdepth 1 -type f ! -name "*.circom" -delete 2>/dev/null || true
	@find $(1) -maxdepth 1 -type d ! -name "$$(basename "$(1)")" ! -name "components" ! -name "input" -exec rm -rf {} + 2>/dev/null || true

clean:
	@echo "🧹 Cleaning $(CIRCUIT)..."
	$(call clean_circuit_dir,$(DIR))
	@echo "✅ $(CIRCUIT) cleaned!"

clean-all:
	@echo "🧹 Cleaning all circuits..."
	@for circuit_dir in circuits/*/; do \
		[ -d "$$circuit_dir" ] && [ "$$(basename "$$circuit_dir")" != "shared" ] || continue; \
		echo "  Cleaning $$(basename "$$circuit_dir")..."; \
		$(MAKE) _clean-dir TARGET_DIR=$$circuit_dir; \
	done
	@echo "✅ All circuits cleaned!"

# Project status
status:
	@echo "📊 Project Status:"
	@echo "=================="
	@if [ -d "circuits" ]; then \
		echo "📁 Circuits found: $$(find circuits -maxdepth 1 -type d ! -name circuits ! -name shared | wc -l)"; \
		for circuit in circuits/*/; do \
			if [ -d "$$circuit" ] && [ "$$(basename $$circuit)" != "shared" ]; then \
				circuit_name=$$(basename $$circuit); \
				echo "  🔧 $$circuit_name:"; \
				if [ -f "$$circuit/build/$$circuit_name.r1cs" ]; then echo "    ✅ Compiled"; else echo "    ❌ Not compiled"; fi; \
				if [ -f "$$circuit/keys/verification_key.json" ]; then echo "    ✅ Keys generated"; else echo "    ❌ Keys missing"; fi; \
				if [ -f "$$circuit/contracts/verifier.sol" ]; then echo "    ✅ Verifier generated"; else echo "    ❌ Verifier missing"; fi; \
			fi; \
		done; \
	else \
		echo "❌ No circuits directory found"; \
	fi
	@if [ -f "package.json" ]; then echo "📦 TypeScript project: ✅"; else echo "📦 TypeScript project: ❌"; fi
	@if [ -d "node_modules" ]; then echo "📚 Dependencies: ✅"; else echo "📚 Dependencies: ❌"; fi
	@if [ -f "circuits/shared/keys/pot12_final.ptau" ]; then echo "⚡ Powers of Tau: ✅"; else echo "⚡ Powers of Tau: ❌"; fi