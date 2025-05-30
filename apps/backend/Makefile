all: approve-permit predict-address generate-signature encrypt-testament upload-testament download-and-decrypt-testament download-and-decrypt-testament-local sign-cid

.PHONY: all

init:
	@echo "Resetting environment variables..."
	@pnpm exec tsx ../../shared/utils/env/resetEnvVariable.ts SALT TESTAMENT_ADDRESS \
        BENEFICIARY0 TOKEN0 AMOUNT0 \
        BENEFICIARY1 TOKEN1 AMOUNT1 \
        NONCE DEADLINE PERMIT2_SIGNATURE \
        CID CID_HASH EXECUTOR_SIGNATURE \
		|| echo "Warning: Failed to reset env variables"
	@echo "Removing generated files..."
	-rm -f testament/3_addressed*.json
	-rm -f testament/4_signed*.json
	-rm -f testament/5_encrypted*.json
	-rm -f testament/6_decrypted*.json

	@@echo "Initialization completed"

phase1: approve-permit predict-address generate-signature encrypt-testament upload-testament

phase2: download-and-decrypt-testament sign-cid

approve-permit:
	@pnpm exec tsx src/permit2/approveTokenPermit2.js

predict-address:
	@pnpm exec tsx src/CREATE2/predictTestament.js

generate-signature:
	@pnpm exec tsx src/permit2/generateSignature.js

encrypt-testament:
	@pnpm exec tsx src/encryption/encryptTestament.js

upload-testament:
	@pnpm exec tsx src/ipfs/upload.js

download-and-decrypt-testament:
	@pnpm exec tsx src/ipfs/download.js

download-and-decrypt-testament-test:
	@pnpm exec tsx src/ipfs/download.js --test

sign-cid:
	@pnpm exec tsx src/signature/cid.js