include .env

RED := \033[31m
GREEN := \033[32m
YELLOW := \033[33m
BLUE := \033[34m
MAGENTA := \033[35m
CYAN := \033[36m
RESET := \033[0m

MY_PRIVATE_KEY := $(EXECUTOR_PRIVATE_KEY)

PA := "["0x215347bed997b3472bf49a9be27dd18b1bd2ed247cb5d8a83bc53fb9457930d8", "0x28451ca3fd1b31c4b03cf855ad586f918d9a133e3cd964e8fd1e6d9e66681d1b"]"
PB := "[["0x272a7b9adee84e07287e686262e57f22e350262e4aed4f1489c828c01c50d5c5", "0x0ee9fdbf40ba6d0126412a5e420b7f180c98a32a49788134303f692a3636b6ff"],["0x258b8276a485b0cff894f2c96227e53b581f57f32d539725558334a19904d6d4", "0x0d71b5c67d65eb06c56b6cd3c0d56282bbcdcf1e0b6669b4c0a741c950bd6181"]]"
PC := "["0x19af6fadecf39c2882ae8a6c9342e5c1339573b679bb882257029a03ccb93a4f", "0x10189df625767d328005c31d32c0ee85c0a992a84fcb39f8c8edc6a8276a759e"]"
PUBSIGNALS := "["0x0000000000000000000000000000000000000000000000000000000000000021"]"

ESTATES := "[($(BENEFICIARY0),$(TOKEN0),$(AMOUNT0)),($(BENEFICIARY1),$(TOKEN1),$(AMOUNT1))]"

ifdef USE_ANVIL
    ifeq ($(USE_ANVIL),true)
        RPC_URL := $(ANVIL_RPC_URL)
    else
        RPC_URL := $(ARB_SEPOLIA_RPC_URL)
    endif
else
    RPC_URL := $(ARB_SEPOLIA_RPC_URL)
endif

# --------------------- Build ---------------------------	

build:
	@forge build

# ------------ Scripts for Arbitrun Sepolia -------------

deploy_groth16verifier_to_arb_sepolia:
	@forge script \
		--broadcast \
		--verify \
		--rpc-url $(ARB_SEPOLIA_RPC_URL) \
		--etherscan-api-key $(ARBSCAN_API_KEY) \
		--private-key $(MY_PRIVATE_KEY) \
		script/Groth16Verifier.s.sol:Groth16VerifierScript
	@echo "$(YELLOW)Remember to update TESTATOR_VERIFIER_ADDRESS and DECRYPTION_VERIFIER_ADDRESS in .env.$(RESET)"

deploy_ecdsaverifier_to_arb_sepolia:
	@forge script \
		--broadcast \
		--verify \
		--rpc-url $(ARB_SEPOLIA_RPC_URL) \
		--etherscan-api-key $(ARBSCAN_API_KEY) \
		--private-key $(MY_PRIVATE_KEY) \
		script/ECDSAVerifier.s.sol:ECDSAVerifierScript
	@echo "$(YELLOW)Remember to update EXECUTOR_VERIFIER_ADDRESS in .env.$(RESET)"

deploy_testamentFactory_to_arb_sepolia:
	@forge script \
    	--broadcast \
		--verify \
		--rpc-url $(ARB_SEPOLIA_RPC_URL) \
		--etherscan-api-key $(ARBSCAN_API_KEY) \
    	--private-key $(MY_PRIVATE_KEY) \
    	script/TestamentFactory.s.sol:TestamentFactoryScript
	@echo "$(YELLOW)Remember to update TESTAMENT_FACTORY_ADDRESS in .env.$(RESET)"

# --------- Scripts for forked Arbitrun Sepolia ---------

fork:
	@anvil --fork-url $(ARB_SEPOLIA_RPC_URL) --chain-id $(ARB_SEPOLIA_CHAIN_ID)

deploy_groth16verifier_to_forked_arb_sepolia:
	@forge script \
		--broadcast \
		--fork-url $(ANVIL_RPC_URL) \
		--private-key $(MY_PRIVATE_KEY) \
		script/Groth16Verifier.s.sol:Groth16VerifierScript
	@echo "$(YELLOW)Remember to update TESTATOR_VERIFIER_ADDRESS and DECRYPTION_VERIFIER_ADDRESS in .env.$(RESET)"

deploy_ecdsaverifier_to_forked_arb_sepolia:
	@forge script \
    	--broadcast \
		--fork-url $(ANVIL_RPC_URL) \
    	--private-key $(MY_PRIVATE_KEY) \
    	script/ECDSAVerifier.s.sol:ECDSAVerifierScript
	@echo "$(YELLOW)Remember to update EXECUTOR_VERIFIER_ADDRESS in .env.$(RESET)"

deploy_testamentFactory_to_forked_arb_sepolia:
	@forge script \
    	--broadcast \
		--fork-url $(ANVIL_RPC_URL) \
    	--private-key $(MY_PRIVATE_KEY) \
    	script/TestamentFactory.s.sol:TestamentFactoryScript
	@echo "$(YELLOW)Remember to update TESTAMENT_FACTORY_ADDRESS in .env.$(RESET)"

# ---------------- Call Groth16 Verifier ----------------

groth16verify_on_chain:
	@cast call $(TESTATOR_VERIFIER_ADDRESS) --rpc-url $(RPC_URL) \
		"verifyProof(uint[2],uint[2][2],uint[2],uint[1])(bool)" \
		$(PA) $(PB) $(PC) $(PUBSIGNALS)
	@echo "$(YELLOW)Expect: true$(RESET)"

# ----------------- Call ECDSA Verifier -----------------

ecdsaverify_on_chain:
	@cast call $(EXECUTOR_VERIFIER_ADDRESS) --rpc-url $(RPC_URL) \
		"verifySignature(address,bytes32,bytes)(bool)" \
		$(EXECUTOR) $(CID_HASH) $(EXECUTOR_SIGNATURE)
	@echo "$(YELLOW)Expect: true$(RESET)"

# -------------------- Call Factory ---------------------

# ----------------------- Read --------------------------

testatorVerifier:
	@cast call $(TESTAMENT_FACTORY_ADDRESS) --rpc-url $(RPC_URL) \
		"testatorVerifier()(address)"
	@echo "$(YELLOW)Expect: $(TESTATOR_VERIFIER_ADDRESS)$(RESET)"

executorVerifier:
	@cast call $(TESTAMENT_FACTORY_ADDRESS) --rpc-url $(RPC_URL) \
		"executorVerifier()(address)"
	@echo "$(YELLOW)Expect: $(EXECUTOR_VERIFIER_ADDRESS)$(RESET)"

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
		"testatorValidateTimes(bytes32)(uint256)" \
		$(CID_HASH)
	@echo "$(YELLOW)Expect: Timestamp of calling uploadCID$(RESET)"

executorValidateTime:
	@cast call --from $(EXECUTOR)  $(TESTAMENT_FACTORY_ADDRESS) --rpc-url $(RPC_URL) \
		"executorValidateTimes(bytes32)(uint256)" \
		$(CID_HASH)
	@echo "$(YELLOW)Expect: Timestamp of calling notarizeCID$(RESET)"

testament:
	@cast call --from $(EXECUTOR)  $(TESTAMENT_FACTORY_ADDRESS) --rpc-url $(RPC_URL) \
		"testaments(bytes32)(address)" \
		$(CID_HASH)
	@echo "$(YELLOW)Expect: $(TESTAMENT_ADDRESS)$(RESET)"

predictTestament:
	@cast call --from $(EXECUTOR)  $(TESTAMENT_FACTORY_ADDRESS) --rpc-url $(RPC_URL) \
		"predictTestament(address,(address,address,uint256)[],uint256)(address)" \
		$(TESTATOR) $(ESTATES) $(SALT)
	@echo "$(YELLOW)Expect: $(TESTAMENT_ADDRESS)$(RESET)"

# ----------------------- Write -------------------------

uploadCID:
	@cast send --from $(EXECUTOR) --private-key $(EXECUTOR_PRIVATE_KEY) $(TESTAMENT_FACTORY_ADDRESS) --rpc-url $(RPC_URL) \
		"uploadCID(uint[2],uint[2][2],uint[2],uint[1],bytes32)" \
		$(PA) $(PB) $(PC) $(PUBSIGNALS) $(CID_HASH)

notarizeCID:
	@cast send --from $(EXECUTOR) --private-key $(EXECUTOR_PRIVATE_KEY) $(TESTAMENT_FACTORY_ADDRESS) --rpc-url $(RPC_URL) \
		"notarizeCID(bytes32,bytes)" \
		$(CID_HASH) $(EXECUTOR_SIGNATURE)

createTestament:
	@cast send --from $(EXECUTOR) --private-key $(EXECUTOR_PRIVATE_KEY) $(TESTAMENT_FACTORY_ADDRESS) --rpc-url $(RPC_URL) \
		"createTestament(uint[2],uint[2][2],uint[2],uint[1],bytes32,address,(address,address,uint256)[],uint256)(address)" \
		$(PA) $(PB) $(PC) $(PUBSIGNALS) $(CID_HASH) $(TESTATOR) $(ESTATES) $(SALT)
	
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
		$(NONCE) $(DEADLINE) $(TESTATOR_SIGNATURE)

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