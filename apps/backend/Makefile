all: approve-permit predict-address generate-signature encrypt-testament upload-testament download-and-decrypt-testament download-and-decrypt-testament-local sign-cid

.PHONY: all

init:
	@echo "Resetting environment variables..."
	@ts-node ../../shared/utils/env/resetEnvVariable.js || echo "Warning: Failed to reset env variables"
	
	@echo "Removing generated files..."
	-rm -f testament/3_addressed*.json
	-rm -f testament/4_signed*.json
	-rm -f testament/5_encrypted*.json
	-rm -f testament/6_decrypted*.json

	@@echo "Initialization completed"

phase1: approve-permit predict-address generate-signature encrypt-testament upload-testament

phase2: download-and-decrypt-testament sign-cid

approve-permit:
	@ts-node src/permit2/approveTokenPermit2.js

predict-address:
	@ts-node src/CREATE2/predictTestament.js

generate-signature:
	@ts-node src/permit2/generateSignature.js

encrypt-testament:
	@ts-node src/encryption/encryptTestament.js

upload-testament:
	@ts-node src/ipfs/upload.js

download-and-decrypt-testament:
	@ts-node src/ipfs/download.js

download-and-decrypt-testament-test:
	@ts-node src/ipfs/download.js --test

sign-cid:
	@ts-node src/signature/cid.js