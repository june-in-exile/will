ENV_FILE := ../.env

include $(ENV_FILE)
export

MY_PRIVATE_KEY := $(EXECUTOR_PRIVATE_KEY)

PA := "["0x2c980756d6558991c65a5f82e7d0603b1608754ceac751620e56efd644135bb7", "0x2f953155593e6d01a868eaa06b2a3db9f036f11ff8c760016419b996a053e896"]"
PB := "[["0x1fe89bd3f35bd07ca20afa0637f056f9eed89c0f63ce4f65126c7e9b2e9a1e6a", "0x28b174f1e98be9903c0ee927961eb05b9f60be50e996ee823717643d2255e513"],["0x1bea8ed545e7a99e1052b3de385a1bd0aa9d6379ce93fd2f45e82dc9d541dcf8", "0x1f151808bfa97093f15ddabeda7528a2c3cccfd71212d11cbed9d0663ac2e6b4"]]"
PC := "["0x22e53c8de0c5058bfd4fd7358227965e1ea935d0e18d36bbcf49d4f4d320e21e", "0x2dcb3d97482cf20509fc1c2b64a41ea29fb73825c7e70cf25bc0763b66377100"]"
PUBSIGNALS := "["0x0000000000000000000000000000000000000000000000000000000000000021"]"

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

init:
	@pnpm exec tsx ../shared/utils/env/syncAnvil.ts
	@forge build
	@pnpm typechain

# ------------------- Reset Env -------------------------

reset:
	@pnpm exec tsx ../shared/utils/env/resetEnvVariable.ts PERMIT2_VERIFIER_ADDRESS DECRYPTION_VERIFIER_ADDRESS TESTAMENT_FACTORY_ADDRESS

# --------------- Conditional Deployment ----------------

deploy_groth16verifier:
ifeq ($(USE_ANVIL),true)
	@make deploy_groth16verifier_to_forked_arb_sepolia
else
	@make deploy_groth16verifier_to_arb_sepolia
endif
	@pnpm exec tsx ../shared/utils/env/syncAddress.ts PERMIT2_VERIFIER_ADDRESS Groth16Verifier $(CHAIN_ID)
	@pnpm exec tsx ../shared/utils/env/syncAddress.ts DECRYPTION_VERIFIER_ADDRESS Groth16Verifier $(CHAIN_ID)
	
deploy_testamentFactory:
ifeq ($(USE_ANVIL),true)
	@make deploy_testamentFactory_to_forked_arb_sepolia
else
	@make deploy_testamentFactory_to_arb_sepolia
endif
	@pnpm exec tsx ../shared/utils/env/syncAddress.ts TESTAMENT_FACTORY_ADDRESS TestamentFactory $(CHAIN_ID)

# ------------ Scripts for Arbitrun Sepolia -------------

deploy_groth16verifier_to_arb_sepolia:
	@forge script \
		--broadcast \
		--verify \
		--rpc-url $(ARB_SEPOLIA_RPC_URL) \
		--etherscan-api-key $(ARBSCAN_API_KEY) \
		--private-key $(MY_PRIVATE_KEY) \
		script/Groth16Verifier.s.sol:Groth16VerifierScript

deploy_testamentFactory_to_arb_sepolia:
	@ln -sf ../.env .env
	@forge script \
    	--broadcast \
		--verify \
		--rpc-url $(ARB_SEPOLIA_RPC_URL) \
		--etherscan-api-key $(ARBSCAN_API_KEY) \
    	--private-key $(MY_PRIVATE_KEY) \
    	script/TestamentFactory.s.sol:TestamentFactoryScript
	@rm .env

# --------- Scripts for forked Arbitrun Sepolia ---------

fork:
	@anvil --fork-url $(ARB_SEPOLIA_RPC_URL) --chain-id $(ANVIL_CHAIN_ID)

deploy_groth16verifier_to_forked_arb_sepolia:
	@forge script \
		--broadcast \
		--fork-url $(ANVIL_RPC_URL) \
		--private-key $(MY_PRIVATE_KEY) \
		script/Groth16Verifier.s.sol:Groth16VerifierScript

deploy_cidverifier_to_forked_arb_sepolia:
	@forge create \
	 	--broadcast \
		--rpc-url $(ANVIL_RPC_URL) \
		--private-key $(MY_PRIVATE_KEY) \
		--gas-limit 3000000 \
    	--gas-price 20000000000 \
		src/implementations/CIDVerifier.sol:CIDVerifier

deploy_testamentFactory_to_forked_arb_sepolia:
	@forge script \
    	--broadcast \
		--fork-url $(ANVIL_RPC_URL) \
    	--private-key $(MY_PRIVATE_KEY) \
    	script/TestamentFactory.s.sol:TestamentFactoryScript

# ---------------- Call Groth16 Verifier ----------------

groth16verify_on_chain:
	@cast call $(PERMIT2_VERIFIER_ADDRESS) --rpc-url $(RPC_URL) \
		"verifyProof(uint[2],uint[2][2],uint[2],uint[1])(bool)" \
		$(PA) $(PB) $(PC) $(PUBSIGNALS)
	@echo "$(YELLOW)Expect: true$(RESET)"

# -------------------- Call Factory ---------------------

# ----------------------- Read --------------------------

testatorVerifier:
	@cast call $(TESTAMENT_FACTORY_ADDRESS) --rpc-url $(RPC_URL) \
		"testatorVerifier()(address)"
	@echo "$(YELLOW)Expect: $(PERMIT2_VERIFIER_ADDRESS)$(RESET)"

decryptionVerifier:
	@cast call $(TESTAMENT_FACTORY_ADDRESS) --rpc-url $(RPC_URL) \
		"decryptionVerifier()(address)"
	@echo "$(YELLOW)Expect: $(DECRYPTION_VERIFIER_ADDRESS)$(RESET)"

executor:
	@cast call $(TESTAMENT_FACTORY_ADDRESS) --rpc-url $(RPC_URL) \
		"executor()(address)"
	@echo "$(YELLOW)Expect: $(EXECUTOR)$(RESET)"

testatorValidateTime:
	@cast call --from $(EXECUTOR) $(TESTAMENT_FACTORY_ADDRESS) --rpc-url $(RPC_URL) \
		"testatorValidateTimes(string)(uint256)" \
		$(CID) | \
		sed 's/.*\([0-9]\{10\}\).*/\1/' | \
		xargs -I {} gdate -d "@{}" "+%Y-%m-%d %H:%M:%S"
	@echo "$(YELLOW)Expect: UTC+8 time of calling uploadCID$(RESET)"

executorValidateTime:
	@cast call --from $(EXECUTOR)  $(TESTAMENT_FACTORY_ADDRESS) --rpc-url $(RPC_URL) \
		"executorValidateTimes(string)(uint256)" \
		$(CID) | \
		sed 's/.*\([0-9]\{10\}\).*/\1/' | \
		xargs -I {} gdate -d "@{}" "+%Y-%m-%d %H:%M:%S"
	@echo "$(YELLOW)Expect: UTC+8 time of calling notarizeCID$(RESET)"

testament:
	@cast call --from $(EXECUTOR)  $(TESTAMENT_FACTORY_ADDRESS) --rpc-url $(RPC_URL) \
		"testaments(string)(address)" \
		$(CID)
	@echo "$(YELLOW)Expect: $(TESTAMENT_ADDRESS)$(RESET)"

predictTestament:
	@cast call --from $(EXECUTOR)  $(TESTAMENT_FACTORY_ADDRESS) --rpc-url $(RPC_URL) \
		"predictTestament(address,(address,address,uint256)[],uint256)(address)" \
		$(TESTATOR) $(ESTATES) $(SALT)
	@echo "$(YELLOW)Expect: $(TESTAMENT_ADDRESS)$(RESET)"

# ----------------------- Write -------------------------

uploadCID:
	@cast send --from $(EXECUTOR) --private-key $(EXECUTOR_PRIVATE_KEY) $(TESTAMENT_FACTORY_ADDRESS) --rpc-url $(RPC_URL) \
		"uploadCID(uint[2],uint[2][2],uint[2],uint[1],string)" \
		$(PA) $(PB) $(PC) $(PUBSIGNALS) $(CID)

notarizeCID:
	@cast send --from $(EXECUTOR) --private-key $(EXECUTOR_PRIVATE_KEY) $(TESTAMENT_FACTORY_ADDRESS) --rpc-url $(RPC_URL) \
		"notarizeCID(string,bytes)" \
		$(CID) $(EXECUTOR_SIGNATURE)

createTestament:
	@cast send --from $(EXECUTOR) --private-key $(EXECUTOR_PRIVATE_KEY) $(TESTAMENT_FACTORY_ADDRESS) --rpc-url $(RPC_URL) \
		"createTestament(uint[2],uint[2][2],uint[2],uint[1],string,address,(address,address,uint256)[],uint256)(address)" \
		$(PA) $(PB) $(PC) $(PUBSIGNALS) $(CID) $(TESTATOR) $(ESTATES) $(SALT)
	
# ------------------- Verify Contract -------------------

verify_testament:
	forge verify-contract \
		--chain-id $(ARB_SEPOLIA_CHAIN_ID) \
		--constructor-args $$(cast abi-encode "constructor(address,address,(address,address,uint256)[])" \
			"$(TESTATOR)" \
			"$(EXECUTOR)" \
			$(ESTATES)) \
		--verifier etherscan \
		--etherscan-api-key ${ARBSCAN_API_KEY} \
		--watch \
		$(TESTAMENT_ADDRESS) \
		src/implementations/Testament.sol:Testament

# --------------------- Testament -----------------------
# ----------------------- Read --------------------------

permit2:
	@cast call $(TESTAMENT_ADDRESS) --rpc-url $(RPC_URL) \
		"permit2()(address)"
	@echo "$(YELLOW)Expect: 0x000000000022D473030F116dDEE9F6B43aC78BA3$(RESET)"

testator:
	@cast call $(TESTAMENT_ADDRESS) --rpc-url $(RPC_URL) \
		"testator()(address)"
	@echo "$(YELLOW)Expect: $(TESTATOR)$(RESET)"

estates:
	@cast call $(TESTAMENT_ADDRESS) --rpc-url $(RPC_URL) \
		"estates(uint256)(address,address,uint256)" \
		$(ESTATE_INDEX)

estate0:
	@ESTATE_INDEX=1 make estates
	@echo "$(YELLOW)Expect:\n$(BENEFICIARY0)\n$(TOKEN0)\n$(AMOUNT0)$(RESET)"

estate1:
	@ESTATE_INDEX=1 make estates
	@echo "$(YELLOW)Expect:\n$(BENEFICIARY1)\n$(TOKEN1)\n$(AMOUNT1)$(RESET)"

executed:
	@cast call $(TESTAMENT_ADDRESS) --rpc-url $(RPC_URL) \
		"executed()(bool)"

executed_before:
	@make executed
	@echo "$(YELLOW)Expect: false$(RESET)"

executed_after:
	@make executed
	@echo "$(YELLOW)Expect: true$(RESET)"

# ----------------------- Write -------------------------
		
signatureTransferToBeneficiaries:
	@cast send --from $(EXECUTOR) --private-key $(EXECUTOR_PRIVATE_KEY) $(TESTAMENT_ADDRESS) --rpc-url $(RPC_URL) \
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