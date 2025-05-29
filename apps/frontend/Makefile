include .env

fork:
	@anvil --fork-url $(VITE_ARB_SEPOLIA_RPC_URL) --chain-id $(VITE_ARB_SEPOLIA_CHAIN_ID)

frontend:
	@npm run dev

RPC_URL := $(VITE_ARB_SEPOLIA_RPC_URL)
# RPC_URL := $(VITE_ANVIL_RPC_URL)

check_executor_usdc_balance:
	@cast balance --erc20 $(VITE_ARB_SEPOLIA_USDC) $(EXECUTOR) --rpc-url $(RPC_URL)

check_allowance:
	@cast call $(VITE_ARB_SEPOLIA_USDC) --rpc-url $(RPC_URL) \
		"allowance(address,address)(uint256)" \
		$(TESTATOR) $(EXECUTOR)
