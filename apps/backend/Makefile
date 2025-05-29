include .env

all: approve-permit predict-address generate-signature encrypt-testament upload-testament download-and-decrypt-testament download-and-decrypt-testament-local sign-cid

.PHONY: all



init:
	@echo "Resetting environment variables..."
	@node utils/others/resetEnvVariable.js || echo "Warning: Failed to reset env variables"
	
	@echo "Removing generated files..."
	-rm -f testament/3_addressed.json
	-rm -f testament/4_signed.json
	-rm -f testament/5_encrypted.json
	-rm -f testament/6_decrypted.json

	@@echo "Initialization completed"

phase1: approve-permit predict-address generate-signature encrypt-testament upload-testament

phase2: download-and-decrypt-testament sign-cid

approve-permit:
	@node permit2/approveTokenPermit2.js

predict-address:
	@node create2/predictTestament.js

generate-signature:
	@node permit2/generateSignature.js

encrypt-testament:
	@node encryption/encryptTestament.js

upload-testament:
	@node ipfs/upload.js

download-and-decrypt-testament:
	@node ipfs/download.js

download-and-decrypt-testament-test:
	@node ipfs/download.js --test

sign-cid:
	@node signature/cid.js