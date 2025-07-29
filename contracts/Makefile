ENV_FILE := ../.env

include $(ENV_FILE)
export

.PHONY: sync-anvil sync-groth16verifier-and-proof sync clean-address clean-groth16verifier-and-proof clean-typechain clean install build test test-fuzz test-integration test-unit deploy

MY_PRIVATE_KEY := $(EXECUTOR_PRIVATE_KEY)

ESTATES := "[($(BENEFICIARY0),$(TOKEN0),$(AMOUNT0)),($(BENEFICIARY1),$(TOKEN1),$(AMOUNT1))]"

# Check network
ifeq ($(USE_ANVIL),true)
	RPC_URL := $(ANVIL_RPC_URL)
	CHAIN_ID := $(ANVIL_CHAIN_ID)
else
	RPC_URL := $(ARB_SEPOLIA_RPC_URL)
	CHAIN_ID := $(ARB_SEPOLIA_CHAIN_ID)
endif

# ------------- Synchronization Commands ----------------

sync-anvil:
	@pnpm exec tsx ../shared/utils/file/syncAnvil.ts

sync-groth16verifier-and-proof:
	@pnpm exec tsx ../shared/utils/file/syncZkp.ts

sync: sync-anvil sync-groth16verifier-and-proof

# ---------------- Clean Commands -----------------------

clean-address:
	@pnpm exec tsx ../shared/utils/file/resetEnvVariable.ts UPLOAD_CID_VERIFIER CREATE_WILL_VERIFIER JSON_CID_VERIFIER WILL_FACTORY

clean-groth16verifier-and-proof:
	@rm -rf src/Groth16Verifier.sol
	@pnpm exec tsx ../shared/utils/file/resetEnvVariable.ts PA_ARRAY PB_ARRAY PC_ARRAY PUBSIGNALS_ARRAY

clean-typechain:
	@rm -rf ../shared/types/typechain-types

clean: clean-address clean-groth16verifier-and-proof clean-typechain
	@forge clean
	@rm -rf cache broadcast lib

# ----------------- CICD Commands -----------------------

install:
	@rm -rf lib
	@forge install foundry-rs/forge-std
	@forge install OpenZeppelin/openzeppelin-contracts
	@forge install Uniswap/permit2

build: sync-groth16verifier-and-proof
	@forge build
	@pnpm exec typechain --target ethers-v6 --out-dir ../shared/types/typechain-types 'out/**/*.sol/*.json'

test:
	@cd ../zkp && make circuit
	@$(MAKE) sync-groth16verifier-and-proof
	@$(MAKE) _test

_test:
	@forge test --match-path "test/*"

test-fuzz:
	@$(MAKE) sync-groth16verifier-and-proof
	@$(MAKE) _test-fuzz

_test-fuzz:
	@forge test --match-path "test/fuzz/*"

test-integration:
	@$(MAKE) sync-groth16verifier-and-proof
	@$(MAKE) _test-integration

_test-integration:
	@forge test --match-path "test/integration/*"

test-unit:
	@$(MAKE) sync-groth16verifier-and-proof
	@$(MAKE) _test-unit

_test-unit:
	@forge test --match-path "test/unit/*"

# --------------- Conditional Deployment ----------------

deploy-groth16verifier:
ifeq ($(USE_ANVIL),true)
	@make deploy-groth16verifier_to_forked_arb_sepolia
else
	@make deploy-groth16verifier-to-arb-sepolia
endif

deploy-jsonCidVerifier:
ifeq ($(USE_ANVIL),true)
	@make deploy-jsonCidVerifier-to-forked-arb-sepolia
else
	@make deploy-jsonCidVerifier-to-arb-sepolia
endif

deploy-willFactory:
ifeq ($(USE_ANVIL),true)
	@make deploy-willFactory-to-forked-arb-sepolia
else
	@make deploy-willFactory-to-arb-sepolia
endif

deploy: build
ifeq ($(USE_ANVIL),true)
	@make deploy-to-forked-arb-sepolia
else
	@make deploy-to-arb-sepolia
endif

# ------------ Scripts for Arbitrun Sepolia -------------

deploy-groth16verifier-to-arb-sepolia:
	@forge script \
		--broadcast \
		--verify \
		--rpc-url $(ARB_SEPOLIA_RPC_URL) \
		--etherscan-api-key $(ARBSCAN_API_KEY) \
		--private-key $(MY_PRIVATE_KEY) \
		script/Groth16Verifier.s.sol:Groth16VerifierScript
	@pnpm exec tsx ../shared/utils/file/syncAddress.ts UPLOAD_CID_VERIFIER Groth16Verifier $(CHAIN_ID)
	@pnpm exec tsx ../shared/utils/file/syncAddress.ts CREATE_WILL_VERIFIER Groth16Verifier $(CHAIN_ID)

deploy-jsonCidVerifier-to-arb-sepolia:
	@forge script \
		--broadcast \
		--verify \
		--rpc-url $(ARB_SEPOLIA_RPC_URL) \
		--etherscan-api-key $(ARBSCAN_API_KEY) \
		--private-key $(MY_PRIVATE_KEY) \
		script/JsonCidVerifier.s.sol:JsonCidVerifierScript
	@pnpm exec tsx ../shared/utils/file/syncAddress.ts JSON_CID_VERIFIER JsonCidVerifier $(CHAIN_ID)

deploy-willFactory-to-arb-sepolia:
	@forge script \
		--broadcast \
		--verify \
		--rpc-url $(ARB_SEPOLIA_RPC_URL) \
		--etherscan-api-key $(ARBSCAN_API_KEY) \
		--private-key $(MY_PRIVATE_KEY) \
		script/WillFactory.s.sol:WillFactoryScript
	@pnpm exec tsx ../shared/utils/file/syncAddress.ts WILL_FACTORY WillFactory $(CHAIN_ID)

deploy-to-arb-sepolia: deploy-groth16verifier-to-arb-sepolia deploy-jsonCidVerifier-to-arb-sepolia
	@make deploy-willFactory-to-arb-sepolia

# --------- Scripts for forked Arbitrun Sepolia ---------

fork-foreground:
	@pkill anvil 2>/dev/null || true
	@sleep 1
	@anvil --fork-url $(ARB_SEPOLIA_RPC_URL) --chain-id $(ANVIL_CHAIN_ID)

fork-background:
	@pkill anvil 2>/dev/null || true
	@sleep 1
	@anvil --fork-url $(ARB_SEPOLIA_RPC_URL) --chain-id $(ANVIL_CHAIN_ID) &

deploy-groth16verifier_to_forked_arb_sepolia:
	@forge script \
		--broadcast \
		--fork-url $(ANVIL_RPC_URL) \
		--private-key $(MY_PRIVATE_KEY) \
		script/Groth16Verifier.s.sol:Groth16VerifierScript
	@pnpm exec tsx ../shared/utils/file/syncAddress.ts UPLOAD_CID_VERIFIER Groth16Verifier $(CHAIN_ID)
	@pnpm exec tsx ../shared/utils/file/syncAddress.ts CREATE_WILL_VERIFIER Groth16Verifier $(CHAIN_ID)

deploy-jsonCidVerifier-to-forked-arb-sepolia:
	@forge script \
	 	--broadcast \
		--fork-url $(ANVIL_RPC_URL) \
		--private-key $(MY_PRIVATE_KEY) \
		script/JsonCidVerifier.s.sol:JsonCidVerifierScript
	@pnpm exec tsx ../shared/utils/file/syncAddress.ts JSON_CID_VERIFIER JsonCidVerifier $(CHAIN_ID)

deploy-willFactory-to-forked-arb-sepolia:
	@forge script \
		--broadcast \
		--fork-url $(ANVIL_RPC_URL) \
		--private-key $(MY_PRIVATE_KEY) \
		script/WillFactory.s.sol:WillFactoryScript
	@pnpm exec tsx ../shared/utils/file/syncAddress.ts WILL_FACTORY WillFactory $(CHAIN_ID)

deploy-to-forked-arb-sepolia: deploy-groth16verifier_to_forked_arb_sepolia deploy-jsonCidVerifier-to-forked-arb-sepolia
	@make deploy-willFactory-to-forked-arb-sepolia

# ---------------- Call Groth16 Verifier ----------------

groth16verify-on-chain:
	@cast call $(UPLOAD_CID_VERIFIER) --rpc-url $(RPC_URL) \
		"verifyProof(uint[2],uint[2][2],uint[2],uint[1])(bool)" \
		$(PA) $(PB) $(PC) $(PUBSIGNALS)
	@echo "$(YELLOW)Expect: true$(RESET)"

# ------------------ Call CID Verifier ------------------

EXAMPLE_JSON_OBJ := '(["algorithm","iv","authTag","ciphertext","timestamp"],["aes-256-gcm","SXwGj4zpnPz6fJvo","tp0VPERBYMhUac8HyQwfFA==","47ljOJWRts3C03tiY0OWLqCfioKKp9p9RFWPB2j/qJ3P2ZLVKMDVdbTa/DJcf7mqnFhJkBToyiA51e4GfNK4SOjshBi4XdT/bB2JMrb5KJKMbCQ+yWsCpr8Ujx9WyyRYV1CtY4LL3ob0Wm6kCygABaoxFX/6dgUbRmLSrUjK0Xf3lj+jP5Oidx/dDlu308E5VqHDSGj0xAvieJjEbdSEwanoCzSALzBI/wN9JhPar/YU8IWdDs6BMKN98ops4olWiGLZl2MmWI/GqzREyg7bqiLQic3ui2dwI9FrNvMB42NKk+qwJQt8jvlrXpaVRij4KpTUtCJVdRK0v91XdC3sjHRxP1mNzfVz1vjrHauh2m14G9CBZDQEm0qoUwjkiO8zoaGpbhLtX1kYKASe0V1v0amN2FXHKqHAXHGo7VVNFaFH8hHlLD0VXroacsSnMzA5dQQJ6Q5m71Kh6TyuRqmGqmPLg5umt+eqkcYiFkAh2qnCY9tWMReYkwZOIFwv8gjd7waERHtm+HZ0M+u+IFw2lA8qyLC4WjOKzu4qVR7BeScjsj3WOvPaPcURefmkZQuQBluBGd3iqwjX89ovfNSmLjbkQ4eGijif3u9O2pIwY9+FrQWYx+ZMv9eIweIRJIWFq8RzleXKx6CNlbRkYfLXs51FTHCdzuH/gbc8jj7orlB4LgZG5d04Z89Zfmnfzfh4raycABY+RR6nDc6bXz8mpbEhfN9GHmxsXDYEkWdyvXjqicNwXwgMzUQBqlLiJyw6PrzGX2f2ZjZ/cQ7uA0NYc47kz0NyJTP/rYTZYrNJgKS0WvCJH2laiSnoNqdEf7RTX5Yffk+ksUwpitq724y5BtNuLP5V3RAevH+/hFCJSTzEoiUbsT1i3YlcyxVP5zfDdTY8PIHAKlTCAoRk7giImm8VAZ9Wf1YUaKsCgXz12kIEZTHso+a7eFl9lUbrniPLdRaXdGp7Cns6t9RhU3YLdBoF3R7XLkOd3Mh9mlXXVraXILHKPaKgVHDUgoBuCvz7nMR44abD2Cd/3+Yot2lu1Ac4V1tKxarRuWzmSooxfpEQ0esgVQFWVtMtDQ+sau2+MmyXGR4th96McXxeMu2u6pbjbhVewdrO6aaOiGFzoXSMfHrHEegvay1YOavYR0Ducd87BaYRIHhvP4cDyi0baJAFiPBLlzLBswjTLK/EqXV2t5wrpnT4OLcvWWd+cTK/w2m09ZD1IhsUje4UUeVQqmQ+JRmOrsu1jhTcCA==","2025-06-17T18:34:55.262Z"])'
EXAMPLE_CID := 'bagaaieraxixnqlxvscc7b4v6d5gpl3wwig6okfftz62xtle32tdzlewerepa'

jsoncidverify-on-chain:
	@cast call $(JSON_CID_VERIFIER) --rpc-url $(RPC_URL) \
		"verifyCID((string[],string[]),string)(bool)" \
		$(EXAMPLE_JSON_OBJ) $(EXAMPLE_CID)
	@echo "$(YELLOW)Expect: true$(RESET)"

generateCIDString:
	@cast call $(JSON_CID_VERIFIER) --rpc-url $(RPC_URL) \
		"generateCIDString((string[],string[]))(string)" \
		$(EXAMPLE_JSON_OBJ)
	@echo "$(YELLOW)Expect: $(EXAMPLE_CID)$(RESET)"

# -------------------- Call Factory ---------------------

# ----------------------- Read --------------------------

uploadCidVerifier:
	@cast call $(WILL_FACTORY) --rpc-url $(RPC_URL) \
		"uploadCidVerifier()(address)"
	@echo "$(YELLOW)Expect: $(UPLOAD_CID_VERIFIER)$(RESET)"

createWillVerifier:
	@cast call $(WILL_FACTORY) --rpc-url $(RPC_URL) \
		"createWillVerifier()(address)"
	@echo "$(YELLOW)Expect: $(CREATE_WILL_VERIFIER)$(RESET)"

executor:
	@cast call $(WILL_FACTORY) --rpc-url $(RPC_URL) \
		"executor()(address)"
	@echo "$(YELLOW)Expect: $(EXECUTOR)$(RESET)"

testatorValidateTime:
	@cast call --from $(EXECUTOR) $(WILL_FACTORY) --rpc-url $(RPC_URL) \
		"testatorValidateTimes(string)(uint256)" \
		$(CID) | \
		sed 's/.*\([0-9]\{10\}\).*/\1/' | \
		xargs -I {} gdate -d "@{}" "+%Y-%m-%d %H:%M:%S"
	@echo "$(YELLOW)Expect: UTC+8 time of calling uploadCid$(RESET)"

executorValidateTime:
	@cast call --from $(EXECUTOR)  $(WILL_FACTORY) --rpc-url $(RPC_URL) \
		"executorValidateTimes(string)(uint256)" \
		$(CID) | \
		sed 's/.*\([0-9]\{10\}\).*/\1/' | \
		xargs -I {} gdate -d "@{}" "+%Y-%m-%d %H:%M:%S"
	@echo "$(YELLOW)Expect: UTC+8 time of calling notarizeCid$(RESET)"

will:
	@cast call --from $(EXECUTOR)  $(WILL_FACTORY) --rpc-url $(RPC_URL) \
		"wills(string)(address)" \
		$(CID)
	@echo "$(YELLOW)Expect: $(WILL)$(RESET)"

predictWill:
	@cast call --from $(EXECUTOR)  $(WILL_FACTORY) --rpc-url $(RPC_URL) \
		"predictWill(address,(address,address,uint256)[],uint256)(address)" \
		$(TESTATOR) $(ESTATES) $(SALT)
	@echo "$(YELLOW)Expect: $(WILL)$(RESET)"

# ----------------------- Write -------------------------

# uploadCid:
# 	@cast send --from $(EXECUTOR) --private-key $(EXECUTOR_PRIVATE_KEY) $(WILL_FACTORY) --rpc-url $(RPC_URL) \
# 		"uploadCid(uint[2],uint[2][2],uint[2],uint[1],bytes,string)" \
# 		$(PA) $(PB) $(PC) $(PUBSIGNALS) $(CID)

notarizeCid:
	@cast send --from $(EXECUTOR) --private-key $(EXECUTOR_PRIVATE_KEY) $(WILL_FACTORY) --rpc-url $(RPC_URL) \
		"notarizeCid(string,bytes)" \
		$(CID) $(EXECUTOR_SIGNATURE)

# createWill:
# 	@cast send --from $(EXECUTOR) --private-key $(EXECUTOR_PRIVATE_KEY) $(WILL_FACTORY) --rpc-url $(RPC_URL) \
# 		"createWill(uint[2],uint[2][2],uint[2],uint[1],bytes,string,address,(address,address,uint256)[],uint256)(address)" \
# 		$(PA) $(PB) $(PC) $(PUBSIGNALS) $(CID) $(TESTATOR) $(ESTATES) $(SALT)
	
# ------------------- Verify Contract -------------------

verify-will:
	forge verify-contract \
		--chain-id $(ARB_SEPOLIA_CHAIN_ID) \
		--constructor-args $$(cast abi-encode "constructor(address,address,address,(address,address,uint256)[])" \
			"$(PERMIT2)" \
			"$(TESTATOR)" \
			"$(EXECUTOR)" \
			$(ESTATES)) \
		--verifier etherscan \
		--etherscan-api-key ${ARBSCAN_API_KEY} \
		--watch \
		$(WILL) \
		src/Will.sol:Will

# --------------------- Will -----------------------
# ----------------------- Read --------------------------

permit2:
	@cast call $(WILL) --rpc-url $(RPC_URL) \
		"permit2()(address)"
	@echo "$(YELLOW)Expect: 0x000000000022D473030F116dDEE9F6B43aC78BA3$(RESET)"

testator:
	@cast call $(WILL) --rpc-url $(RPC_URL) \
		"testator()(address)"
	@echo "$(YELLOW)Expect: $(TESTATOR)$(RESET)"

estates:
	@cast call $(WILL) --rpc-url $(RPC_URL) \
		"estates(uint256)(address,address,uint256)" \
		$(ESTATE_INDEX)

estate0:
	@ESTATE_INDEX=1 make estates
	@echo "$(YELLOW)Expect:\n$(BENEFICIARY0)\n$(TOKEN0)\n$(AMOUNT0)$(RESET)"

estate1:
	@ESTATE_INDEX=1 make estates
	@echo "$(YELLOW)Expect:\n$(BENEFICIARY1)\n$(TOKEN1)\n$(AMOUNT1)$(RESET)"

executed:
	@cast call $(WILL) --rpc-url $(RPC_URL) \
		"executed()(bool)"

executed-before:
	@make executed
	@echo "$(YELLOW)Expect: false$(RESET)"

executed-after:
	@make executed
	@echo "$(YELLOW)Expect: true$(RESET)"

# ----------------------- Write -------------------------
		
signatureTransferToBeneficiaries:
	@cast send --from $(EXECUTOR) --private-key $(EXECUTOR_PRIVATE_KEY) $(WILL) --rpc-url $(RPC_URL) \
		"signatureTransferToBeneficiaries(uint256,uint256,bytes)()" \
		$(NONCE) $(DEADLINE) $(PERMIT2_SIGNATURE)

# ------------------- Check Balance ----------------------

check-testator-usdc-balance:
	@cast balance --erc20 $(ARB_SEPOLIA_USDC) $(TESTATOR) --rpc-url $(RPC_URL)

check-beneficiary-usdc-balance:
	@cast balance --erc20 $(ARB_SEPOLIA_USDC) $(BENEFICIARY0) --rpc-url $(RPC_URL)

check-executor-usdc-balance:
	@cast balance --erc20 $(ARB_SEPOLIA_USDC) $(EXECUTOR) --rpc-url $(RPC_URL)

check-testator-link-balance:
	@cast balance --erc20 $(ARB_SEPOLIA_LINK) $(TESTATOR) --rpc-url $(RPC_URL)

check-beneficiary-link-balance:
	@cast balance --erc20 $(ARB_SEPOLIA_LINK) $(BENEFICIARY1) --rpc-url $(RPC_URL)

check-executor-link-balance:
	@cast balance --erc20 $(ARB_SEPOLIA_LINK) $(EXECUTOR) --rpc-url $(RPC_URL)

check-balance-before:
	@echo "Testator's USDC:"
	@make check-testator-usdc-balance

	@echo "\nBeneficiary's USDC:"
	@make check-beneficiary-usdc-balance

	@echo "\nExecutor's USDC:"
	@make check-executor-usdc-balance

	@echo "\nTestator's LINK:"
	@make check-testator-link-balance

	@echo "\nBeneficiary's LINK:"
	@make check-beneficiary-link-balance

	@echo "\nExecutor's LINK:"
	@make check-executor-link-balance

check-balance-after:
	@echo "Testator's USDC:"
	@make check-testator-usdc-balance
	@echo "$(YELLOW)Expect: 1000 less$(RESET)"

	@echo "\nBeneficiary's USDC:"
	@make check-beneficiary-usdc-balance
	@echo "$(YELLOW)Expect: 1000 more$(RESET)"

	@echo "\nExecutor's USDC:"
	@make check-executor-usdc-balance
	@echo "$(YELLOW)Expect: unchanged$(RESET)"

	@echo "\nTestator's LINK:"
	@make check-testator-link-balance
	@echo "$(YELLOW)Expect: 5000000 less$(RESET)"

	@echo "\nBeneficiary's LINK:"
	@make check-beneficiary-link-balance
	@echo "$(YELLOW)Expect: 5000000 more$(RESET)"
	
	@echo "\nExecutor's LINK:"
	@make check-executor-link-balance
	@echo "$(YELLOW)Expect: unchanged$(RESET)"