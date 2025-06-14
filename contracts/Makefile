ENV_FILE := ../.env

include $(ENV_FILE)
export

MY_PRIVATE_KEY := $(EXECUTOR_PRIVATE_KEY)

PA := "["0x2c980756d6558991c65a5f82e7d0603b1608754ceac751620e56efd644135bb7", "0x2f953155593e6d01a868eaa06b2a3db9f036f11ff8c760016419b996a053e896"]"
PB := "[["0x1fe89bd3f35bd07ca20afa0637f056f9eed89c0f63ce4f65126c7e9b2e9a1e6a", "0x28b174f1e98be9903c0ee927961eb05b9f60be50e996ee823717643d2255e513"],["0x1bea8ed545e7a99e1052b3de385a1bd0aa9d6379ce93fd2f45e82dc9d541dcf8", "0x1f151808bfa97093f15ddabeda7528a2c3cccfd71212d11cbed9d0663ac2e6b4"]]"
PC := "["0x22e53c8de0c5058bfd4fd7358227965e1ea935d0e18d36bbcf49d4f4d320e21e", "0x2dcb3d97482cf20509fc1c2b64a41ea29fb73825c7e70cf25bc0763b66377100"]"
PUBSIGNALS := "["0x0000000000000000000000000000000000000000000000000000000000000021"]"

EXAMPLE_TESTAMENT_BYTES := '0x7b22616c676f726974686d223a226165732d3235362d67636d222c226976223a22313238385654556b7244597567545a45222c2261757468546167223a22654a746e316c62556a487542324a34464c47416b47413d3d222c2263697068657274657874223a226c68762f61317967397675496f724e6d704f3164305456456e2f635449783554735835595873534f6d53324a2f732b4f3056793138506973433777556241795757634e354d4538666b704537436852666d544c574d75704c6b536458426b662b4a427a5a43524533386d475775336c322b6c616f5a317672624b56424d69467a5652334e505770686b4b7853383259382b622f4b5433516a4c33345050344e4a584a78705261555931745032473050666e5748744669474b4e5a4e6c764a474d7234694e4f357042413765756c624d6f665a7779704a55594c513273553541464d55386d2f3563717a7876386e556846703436796e635877392f42504b2f546e644950356d566549364f6f704d6a3748464f4a6e454a47304963476e3576774133457a3965394f7a50336a33506c7541476f356e6e71344870436b6d72336837635961336347306b64514754754255767638614332674a59776973654171612f727664515344435845307a4f4b464a4f6d7a4952386a453947615a34633646496f7568462f652b324e6755727130516b78716e6e4f586d7a6b67734d497666622b47387130336c647064676e535748447a694a563379795a724b34305644443031483248313052793137777736377133755a64716b3957654744776179386e6251566d4847396a38594250767272484430564d535467594739686e704a3448466b5067692b64644f4133367a636a61697a362f68424f354a366e3279614779773038524567676f686e4f4f6c5867704a5a4f6a624b4f48414d556845554f6a5551387572316350732f6b356d646467627a362f794d745053474f316d662b49772f714b7371486d504d447a68615578395049552b7a704b64616254656366767568784455654b4e644f617643714248383632622b7370306458442f58546e4f336a7541564e6762316c415446794f4b687a61776c585950677636707a7a72414e2b5376756b356f436e38577a5179657a76725342663163416668584d3275416b516d64754544616379393234315a4f6c534264434d49756450634468427a6e752b395a393959446e6c4175396b4b616e506c426f7043487277495a54427442616b4b50434778436e4354527a2b5a7968594d344c37484a6f7538562b6e4d785330613555666130514835663652336a435a68476f394a305673762b326d524b36674738455168776b557942524631794d33765541574e794454583335744b3638784976444b394d395247516b73764e4c36367a4b454f55486d666c31526661734d6f79732f495151535133617955633630306e537664536c614841493855616c756b63567a5131505949547241614e737446546379596e682f783051635163645950746757316945557744424a7446662f522b6c54442f2f72524162474d4d6e554450327332326f507674787570667668676c2f426a387569446f696a394549664133494e4c515352566861503571387a6175583676473563347575366831596a327871347861626c5065706b4930525a5a664935746a416145514e6f47394e555555316d2f316b744a4a2f5978413137645a4d74614279305649427a724c7334515a775a795a4c57526e79374c394f4c3875684f794b68386e66766164672b4967585256313435552b79514539624a2f4176535156687674585a4b517a6b4874797058745a7352416a4d42766e573275446249694d315a6b4a5a75433838467566664a466a553d222c2274696d657374616d70223a22323032352d30362d31345431343a30393a34302e3035355a227d'
EXAMPLE_CID := 'bagaaieraztsqhxx4s6e3m2p475zob534g7meckkpzz6mhdtbmddd5kpoj2oq'

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

reset_address:
	@pnpm exec tsx ../shared/utils/env/resetEnvVariable.ts PERMIT2_VERIFIER_ADDRESS DECRYPTION_VERIFIER_ADDRESS JSON_CID_VERIFIER_ADDRESS TESTAMENT_FACTORY_ADDRESS

# --------------- Conditional Deployment ----------------

deploy_groth16verifier:
ifeq ($(USE_ANVIL),true)
	@make deploy_groth16verifier_to_forked_arb_sepolia
else
	@make deploy_groth16verifier_to_arb_sepolia
endif
	@pnpm exec tsx ../shared/utils/env/syncAddress.ts PERMIT2_VERIFIER_ADDRESS Groth16Verifier $(CHAIN_ID)
	@pnpm exec tsx ../shared/utils/env/syncAddress.ts DECRYPTION_VERIFIER_ADDRESS Groth16Verifier $(CHAIN_ID)

deploy_jsonCidVerifier:
ifeq ($(USE_ANVIL),true)
	@make deploy_jsonCidVerifier_to_forked_arb_sepolia
else
	@make deploy_jsonCidVerifier_to_arb_sepolia
endif
	@pnpm exec tsx ../shared/utils/env/syncAddress.ts JSON_CID_VERIFIER_ADDRESS JSONCIDVerifier $(CHAIN_ID)

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

deploy_jsonCidVerifier_to_arb_sepolia:
	@forge script \
	 	--broadcast \
		--verify \
		--rpc-url $(ARB_SEPOLIA_RPC_URL) \
		--etherscan-api-key $(ARBSCAN_API_KEY) \
		--private-key $(MY_PRIVATE_KEY) \
		script/JSONCIDVerifier.s.sol:JSONCIDVerifierScript

deploy_testamentFactory_to_arb_sepolia:
	@forge script \
    	--broadcast \
		--verify \
		--rpc-url $(ARB_SEPOLIA_RPC_URL) \
		--etherscan-api-key $(ARBSCAN_API_KEY) \
    	--private-key $(MY_PRIVATE_KEY) \
    	script/TestamentFactory.s.sol:TestamentFactoryScript

# --------- Scripts for forked Arbitrun Sepolia ---------

fork:
	@anvil --fork-url $(ARB_SEPOLIA_RPC_URL) --chain-id $(ANVIL_CHAIN_ID)

deploy_groth16verifier_to_forked_arb_sepolia:
	@forge script \
		--broadcast \
		--fork-url $(ANVIL_RPC_URL) \
		--private-key $(MY_PRIVATE_KEY) \
		script/Groth16Verifier.s.sol:Groth16VerifierScript

deploy_jsonCidVerifier_to_forked_arb_sepolia:
	@forge script \
	 	--broadcast \
		--fork-url $(ANVIL_RPC_URL) \
		--private-key $(MY_PRIVATE_KEY) \
		script/JSONCIDVerifier.s.sol:JSONCIDVerifierScript

deploy_testamentFactory_to_forked_arb_sepolia:
	forge script \
    	--broadcast \
		--fork-url $(ANVIL_RPC_URL) \
    	--private-key $(MY_PRIVATE_KEY) \
    	script/TestamentFactory.s.sol:TestamentFactoryScript \

# ---------------- Call Groth16 Verifier ----------------

groth16verify_on_chain:
	@cast call $(PERMIT2_VERIFIER_ADDRESS) --rpc-url $(RPC_URL) \
		"verifyProof(uint[2],uint[2][2],uint[2],uint[1])(bool)" \
		$(PA) $(PB) $(PC) $(PUBSIGNALS)
	@echo "$(YELLOW)Expect: true$(RESET)"

# ------------------ Call CID Verifier ------------------

jsoncidverify_on_chain:
	@cast call $(JSON_CID_VERIFIER_ADDRESS) --rpc-url $(RPC_URL) \
		"verifyCID(bytes,string)(bool,string)" \
		$(EXAMPLE_TESTAMENT_BYTES) $(EXAMPLE_CID)
	@echo "$(YELLOW)Expect:\ntrue\n\"Verification successful\"$(RESET)"

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
		"uploadCID(uint[2],uint[2][2],uint[2],uint[1],bytes,string)" \
		$(PA) $(PB) $(PC) $(PUBSIGNALS) $(TESTAMENT_BYTES) $(CID)

notarizeCID:
	@cast send --from $(EXECUTOR) --private-key $(EXECUTOR_PRIVATE_KEY) $(TESTAMENT_FACTORY_ADDRESS) --rpc-url $(RPC_URL) \
		"notarizeCID(string,bytes)" \
		$(CID) $(EXECUTOR_SIGNATURE)

createTestament:
	@cast send --from $(EXECUTOR) --private-key $(EXECUTOR_PRIVATE_KEY) $(TESTAMENT_FACTORY_ADDRESS) --rpc-url $(RPC_URL) \
		"createTestament(uint[2],uint[2][2],uint[2],uint[1],bytes,string,address,(address,address,uint256)[],uint256)(address)" \
		$(PA) $(PB) $(PC) $(PUBSIGNALS) $(TESTAMENT_BYTES) $(CID) $(TESTATOR) $(ESTATES) $(SALT)
	
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