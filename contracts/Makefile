ENV_FILE := ../.env

include $(ENV_FILE)
export

.PHONY: init

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

# ----------------- Initialization ----------------------	

init: sync_anvil sync_proof build sync_typechain

# ------------- Synchronization Commands ----------------

sync_anvil:
	@pnpm exec tsx ../shared/utils/env/syncAnvil.ts

sync_proof:
	@pnpm exec tsx ../shared/utils/env/syncProof.ts

sync_typechain: build
	@pnpm typechain

sync: sync_anvil sync_proof sync_typechain

# ---------------- Clean Commands -----------------------

clean_address:
	@pnpm exec tsx ../shared/utils/env/resetEnvVariable.ts UPLOAD_CID_VERIFIER CREATE_WILL_VERIFIER JSON_CID_VERIFIER WILL_FACTORY

clean_groth16verifier_and_proof:
	@rm -rf src/Groth16Verifier.sol
	@pnpm exec tsx ../shared/utils/env/resetEnvVariable.ts PA_ARRAY PB_ARRAY PC_ARRAY PUBSIGNALS_ARRAY

clean_typechain:
	@rm -rf ../shared/typechain-types

clean: clean_address clean_groth16verifier_and_proof clean_typechain
	@forge clean

# ----------------- CICD Commands -----------------------

build: sync_proof
	@forge build

test: build sync_proof
	@forge test --match-path "test/*"

# --------------- Conditional Deployment ----------------

deploy_groth16verifier:
ifeq ($(USE_ANVIL),true)
	@make deploy_groth16verifier_to_forked_arb_sepolia
else
	@make deploy_groth16verifier_to_arb_sepolia
endif

deploy_jsonCidVerifier:
ifeq ($(USE_ANVIL),true)
	@make deploy_jsonCidVerifier_to_forked_arb_sepolia
else
	@make deploy_jsonCidVerifier_to_arb_sepolia
endif

deploy_willFactory:
ifeq ($(USE_ANVIL),true)
	@make deploy_willFactory_to_forked_arb_sepolia
else
	@make deploy_willFactory_to_arb_sepolia
endif

deploy:
ifeq ($(USE_ANVIL),true)
	@make deploy_to_forked_arb_sepolia
else
	@make deploy_to_arb_sepolia
endif

# ------------ Scripts for Arbitrun Sepolia -------------

deploy_groth16verifier_to_arb_sepolia:
	@forge script \
		--broadcast \
		--verify \
		--rpc-url $(ARB_SEPOLIA_RPC_URL) \
		--etherscan-api-key $(ARBSCAN_API_KEY) \
		--private-key $(MY_PRIVATE_KEY) \
		script/Groth16Verifier.s.sol:Groth16VerifierScript
	@pnpm exec tsx ../shared/utils/env/syncAddress.ts UPLOAD_CID_VERIFIER Groth16Verifier $(CHAIN_ID)
	@pnpm exec tsx ../shared/utils/env/syncAddress.ts CREATE_WILL_VERIFIER Groth16Verifier $(CHAIN_ID)

deploy_jsonCidVerifier_to_arb_sepolia:
	@forge script \
	 	--broadcast \
		--verify \
		--rpc-url $(ARB_SEPOLIA_RPC_URL) \
		--etherscan-api-key $(ARBSCAN_API_KEY) \
		--private-key $(MY_PRIVATE_KEY) \
		script/JSONCIDVerifier.s.sol:JSONCIDVerifierScript
	@pnpm exec tsx ../shared/utils/env/syncAddress.ts JSON_CID_VERIFIER JSONCIDVerifier $(CHAIN_ID)

deploy_willFactory_to_arb_sepolia:
	@forge script \
    	--broadcast \
		--verify \
		--rpc-url $(ARB_SEPOLIA_RPC_URL) \
		--etherscan-api-key $(ARBSCAN_API_KEY) \
    	--private-key $(MY_PRIVATE_KEY) \
    	script/WillFactory.s.sol:WillFactoryScript
	@pnpm exec tsx ../shared/utils/env/syncAddress.ts WILL_FACTORY WillFactory $(CHAIN_ID)

deploy_to_arb_sepolia: deploy_groth16verifier_to_arb_sepolia deploy_jsonCidVerifier_to_arb_sepolia deploy_willFactory_to_arb_sepolia

# --------- Scripts for forked Arbitrun Sepolia ---------

fork:
	@anvil --fork-url $(ARB_SEPOLIA_RPC_URL) --chain-id $(ANVIL_CHAIN_ID)

deploy_groth16verifier_to_forked_arb_sepolia:
	@forge script \
		--broadcast \
		--fork-url $(ANVIL_RPC_URL) \
		--private-key $(MY_PRIVATE_KEY) \
		script/Groth16Verifier.s.sol:Groth16VerifierScript
	@pnpm exec tsx ../shared/utils/env/syncAddress.ts UPLOAD_CID_VERIFIER Groth16Verifier $(CHAIN_ID)
	@pnpm exec tsx ../shared/utils/env/syncAddress.ts CREATE_WILL_VERIFIER Groth16Verifier $(CHAIN_ID)

deploy_jsonCidVerifier_to_forked_arb_sepolia:
	@forge script \
	 	--broadcast \
		--fork-url $(ANVIL_RPC_URL) \
		--private-key $(MY_PRIVATE_KEY) \
		script/JSONCIDVerifier.s.sol:JSONCIDVerifierScript
	@pnpm exec tsx ../shared/utils/env/syncAddress.ts JSON_CID_VERIFIER JSONCIDVerifier $(CHAIN_ID)

deploy_willFactory_to_forked_arb_sepolia:
	@forge script \
    	--broadcast \
		--fork-url $(ANVIL_RPC_URL) \
    	--private-key $(MY_PRIVATE_KEY) \
    	script/WillFactory.s.sol:WillFactoryScript
	@pnpm exec tsx ../shared/utils/env/syncAddress.ts WILL_FACTORY WillFactory $(CHAIN_ID)

deploy_to_forked_arb_sepolia: deploy_groth16verifier_to_forked_arb_sepolia deploy_jsonCidVerifier_to_forked_arb_sepolia deploy_willFactory_to_forked_arb_sepolia

# ---------------- Call Groth16 Verifier ----------------

groth16verify_on_chain:
	@cast call $(UPLOAD_CID_VERIFIER) --rpc-url $(RPC_URL) \
		"verifyProof(uint[2],uint[2][2],uint[2],uint[1])(bool)" \
		$(PA) $(PB) $(PC) $(PUBSIGNALS)
	@echo "$(YELLOW)Expect: true$(RESET)"

# ------------------ Call CID Verifier ------------------

EXAMPLE_JSON_OBJ := '(["algorithm","iv","authTag","ciphertext","timestamp"],["aes-256-gcm","SXwGj4zpnPz6fJvo","tp0VPERBYMhUac8HyQwfFA==","47ljOJWRts3C03tiY0OWLqCfioKKp9p9RFWPB2j/qJ3P2ZLVKMDVdbTa/DJcf7mqnFhJkBToyiA51e4GfNK4SOjshBi4XdT/bB2JMrb5KJKMbCQ+yWsCpr8Ujx9WyyRYV1CtY4LL3ob0Wm6kCygABaoxFX/6dgUbRmLSrUjK0Xf3lj+jP5Oidx/dDlu308E5VqHDSGj0xAvieJjEbdSEwanoCzSALzBI/wN9JhPar/YU8IWdDs6BMKN98ops4olWiGLZl2MmWI/GqzREyg7bqiLQic3ui2dwI9FrNvMB42NKk+qwJQt8jvlrXpaVRij4KpTUtCJVdRK0v91XdC3sjHRxP1mNzfVz1vjrHauh2m14G9CBZDQEm0qoUwjkiO8zoaGpbhLtX1kYKASe0V1v0amN2FXHKqHAXHGo7VVNFaFH8hHlLD0VXroacsSnMzA5dQQJ6Q5m71Kh6TyuRqmGqmPLg5umt+eqkcYiFkAh2qnCY9tWMReYkwZOIFwv8gjd7waERHtm+HZ0M+u+IFw2lA8qyLC4WjOKzu4qVR7BeScjsj3WOvPaPcURefmkZQuQBluBGd3iqwjX89ovfNSmLjbkQ4eGijif3u9O2pIwY9+FrQWYx+ZMv9eIweIRJIWFq8RzleXKx6CNlbRkYfLXs51FTHCdzuH/gbc8jj7orlB4LgZG5d04Z89Zfmnfzfh4raycABY+RR6nDc6bXz8mpbEhfN9GHmxsXDYEkWdyvXjqicNwXwgMzUQBqlLiJyw6PrzGX2f2ZjZ/cQ7uA0NYc47kz0NyJTP/rYTZYrNJgKS0WvCJH2laiSnoNqdEf7RTX5Yffk+ksUwpitq724y5BtNuLP5V3RAevH+/hFCJSTzEoiUbsT1i3YlcyxVP5zfDdTY8PIHAKlTCAoRk7giImm8VAZ9Wf1YUaKsCgXz12kIEZTHso+a7eFl9lUbrniPLdRaXdGp7Cns6t9RhU3YLdBoF3R7XLkOd3Mh9mlXXVraXILHKPaKgVHDUgoBuCvz7nMR44abD2Cd/3+Yot2lu1Ac4V1tKxarRuWzmSooxfpEQ0esgVQFWVtMtDQ+sau2+MmyXGR4th96McXxeMu2u6pbjbhVewdrO6aaOiGFzoXSMfHrHEegvay1YOavYR0Ducd87BaYRIHhvP4cDyi0baJAFiPBLlzLBswjTLK/EqXV2t5wrpnT4OLcvWWd+cTK/w2m09ZD1IhsUje4UUeVQqmQ+JRmOrsu1jhTcCA==","2025-06-17T18:34:55.262Z"])'
EXAMPLE_CID := 'bagaaieraxixnqlxvscc7b4v6d5gpl3wwig6okfftz62xtle32tdzlewerepa'

jsoncidverify_on_chain:
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

uploadCIDVerifier:
	@cast call $(WILL_FACTORY) --rpc-url $(RPC_URL) \
		"uploadCIDVerifier()(address)"
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
	@echo "$(YELLOW)Expect: UTC+8 time of calling uploadCID$(RESET)"

executorValidateTime:
	@cast call --from $(EXECUTOR)  $(WILL_FACTORY) --rpc-url $(RPC_URL) \
		"executorValidateTimes(string)(uint256)" \
		$(CID) | \
		sed 's/.*\([0-9]\{10\}\).*/\1/' | \
		xargs -I {} gdate -d "@{}" "+%Y-%m-%d %H:%M:%S"
	@echo "$(YELLOW)Expect: UTC+8 time of calling notarizeCID$(RESET)"

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

# uploadCID:
# 	@cast send --from $(EXECUTOR) --private-key $(EXECUTOR_PRIVATE_KEY) $(WILL_FACTORY) --rpc-url $(RPC_URL) \
# 		"uploadCID(uint[2],uint[2][2],uint[2],uint[1],bytes,string)" \
# 		$(PA) $(PB) $(PC) $(PUBSIGNALS) $(CID)

notarizeCID:
	@cast send --from $(EXECUTOR) --private-key $(EXECUTOR_PRIVATE_KEY) $(WILL_FACTORY) --rpc-url $(RPC_URL) \
		"notarizeCID(string,bytes)" \
		$(CID) $(EXECUTOR_SIGNATURE)

# createWill:
# 	@cast send --from $(EXECUTOR) --private-key $(EXECUTOR_PRIVATE_KEY) $(WILL_FACTORY) --rpc-url $(RPC_URL) \
# 		"createWill(uint[2],uint[2][2],uint[2],uint[1],bytes,string,address,(address,address,uint256)[],uint256)(address)" \
# 		$(PA) $(PB) $(PC) $(PUBSIGNALS) $(CID) $(TESTATOR) $(ESTATES) $(SALT)
	
# ------------------- Verify Contract -------------------

verify_will:
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

executed_before:
	@make executed
	@echo "$(YELLOW)Expect: false$(RESET)"

executed_after:
	@make executed
	@echo "$(YELLOW)Expect: true$(RESET)"

# ----------------------- Write -------------------------
		
signatureTransferToBeneficiaries:
	@cast send --from $(EXECUTOR) --private-key $(EXECUTOR_PRIVATE_KEY) $(WILL) --rpc-url $(RPC_URL) \
		"signatureTransferToBeneficiaries(uint256,uint256,bytes)()" \
		$(NONCE) $(DEADLINE) $(PERMIT2_SIGNATURE)

# ------------------- Check Balance ----------------------

check_testator_usdc_balance:
	@cast balance --erc20 $(ARB_SEPOLIA_USDC) $(TESTATOR) --rpc-url $(RPC_URL)

check_beneficiary_usdc_balance:
	@cast balance --erc20 $(ARB_SEPOLIA_USDC) $(BENEFICIARY0) --rpc-url $(RPC_URL)

check_executor_usdc_balance:
	@cast balance --erc20 $(ARB_SEPOLIA_USDC) $(EXECUTOR) --rpc-url $(RPC_URL)

check_testator_link_balance:
	@cast balance --erc20 $(ARB_SEPOLIA_LINK) $(TESTATOR) --rpc-url $(RPC_URL)

check_beneficiary_link_balance:
	@cast balance --erc20 $(ARB_SEPOLIA_LINK) $(BENEFICIARY1) --rpc-url $(RPC_URL)

check_executor_link_balance:
	@cast balance --erc20 $(ARB_SEPOLIA_LINK) $(EXECUTOR) --rpc-url $(RPC_URL)

check_balance_before:
	@echo "Testator's USDC:"
	@make check_testator_usdc_balance

	@echo "\nBeneficiary's USDC:"
	@make check_beneficiary_usdc_balance

	@echo "\nExecutor's USDC:"
	@make check_executor_usdc_balance

	@echo "\nTestator's LINK:"
	@make check_testator_link_balance

	@echo "\nBeneficiary's LINK:"
	@make check_beneficiary_link_balance

	@echo "\nExecutor's LINK:"
	@make check_executor_link_balance

check_balance_after:
	@echo "Testator's USDC:"
	@make check_testator_usdc_balance
	@echo "$(YELLOW)Expect: 1000 less$(RESET)"

	@echo "\nBeneficiary's USDC:"
	@make check_beneficiary_usdc_balance
	@echo "$(YELLOW)Expect: 1000 more$(RESET)"

	@echo "\nExecutor's USDC:"
	@make check_executor_usdc_balance
	@echo "$(YELLOW)Expect: unchanged$(RESET)"

	@echo "\nTestator's LINK:"
	@make check_testator_link_balance
	@echo "$(YELLOW)Expect: 5000000 less$(RESET)"

	@echo "\nBeneficiary's LINK:"
	@make check_beneficiary_link_balance
	@echo "$(YELLOW)Expect: 5000000 more$(RESET)"
	
	@echo "\nExecutor's LINK:"
	@make check_executor_link_balance
	@echo "$(YELLOW)Expect: unchanged$(RESET)"