all: approve-permit predict-address generate-signature encrypt-testament upload-testament download-and-decrypt-testament download-and-decrypt-testament-local sign-cid

.PHONY: all

init:
	@echo "Resetting environment variables..."
	@pnpm exec tsx ../../shared/utils/env/resetEnvVariable.ts SALT TESTAMENT_ADDRESS \
        BENEFICIARY0 TOKEN0 AMOUNT0 \
        BENEFICIARY1 TOKEN1 AMOUNT1 \
        NONCE DEADLINE PERMIT2_SIGNATURE \
        CID EXECUTOR_SIGNATURE \
		|| echo "Warning: Failed to reset env variables"
	@echo "Removing generated files..."
	@-rm -f testament/3_addressed*.json
	@-rm -f testament/4_signed*.json
	@-rm -f testament/5_encrypted*.json
	@-rm -f testament/6_decrypted*.json
	@echo "Removing secret key..."
	@-rm -f ../../shared/utils/crypto/key.txt

	@@echo "Initialization completed"

phase1: approve-permit predict-address generate-signature encrypt-testament upload-testament

phase2: download-and-decrypt-testament sign-cid

approve-permit:
	@pnpm exec tsx src/permit2/approveTokenPermit2.ts

predict-address:
	@pnpm exec tsx src/create2/predictTestament.ts

generate-signature:
	@pnpm exec tsx src/permit2/generateSignature.ts

encrypt-testament:
	@pnpm exec tsx src/encryption/encryptTestament.ts

upload-testament:
	@pnpm exec tsx src/IPFS/upload.ts

download-and-decrypt-testament:
	@pnpm exec tsx src/IPFS/download.ts

download-and-decrypt-testament-test:
	@pnpm exec tsx src/IPFS/download.ts --test

hash-testament:
	@pnpm exec tsx ../../shared/utils/hash/cid.ts --path './testament/5_encrypted.json'

hash-data:
	@pnpm exec tsx ../../shared/utils/hash/cid.ts --data '123'

sign-cid:
	@pnpm exec tsx src/signature/cid.ts