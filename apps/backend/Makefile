.PHONY: all

all: init phase1 phase2 phase3

init:
	@echo "Resetting environment variables..."
	@pnpm exec tsx ../../shared/utils/env/resetEnvVariable.ts SALT TESTAMENT_ADDRESS \
        BENEFICIARY0 TOKEN0 AMOUNT0 \
        BENEFICIARY1 TOKEN1 AMOUNT1 \
        NONCE DEADLINE PERMIT2_SIGNATURE \
        CID EXECUTOR_SIGNATURE \
		UPLOAD_TX_HASH UPLOAD_TIMESTAMP \
		NOTARIZE_TX_HASH NOTARIZE_TIMESTAMP \
		CREATE_TESTAMENT_TX_HASH CREATE_TESTAMENT_TIMESTAMP \
		EXECUTE_TESTAMENT_TX_HASH EXECUTE_TESTAMENT_TIMESTAMP \
		|| echo "Warning: Failed to reset env variables"
	@echo "Removing generated files..."
	@-rm -f testament/3_addressed*.json
	@-rm -f testament/4_signed*.json
	@-rm -f testament/5_encrypted*.json
	@-rm -f testament/6_decrypted*.json
	@echo "Removing secret key..."
	@-rm -f ../../shared/utils/crypto/key.txt

	@@echo "Initialization completed"


phase1: approve-permit predict-address generate-signature encrypt-testament upload-testament upload-cid

approve-permit:
	@pnpm exec tsx src/permit2/approveTokenPermit2.ts

predict-address:
	@pnpm exec tsx src/testamentFactory/predictTestament.ts

generate-signature:
	@pnpm exec tsx src/permit2/generateSignature.ts

encrypt-testament:
	@pnpm exec tsx src/encryption/encryptTestament.ts

upload-testament:
	@pnpm exec tsx src/IPFS/upload.ts

upload-cid:
	@pnpm exec tsx src/testamentFactory/uploadCID.ts

submit-proof:
	@pnpm exec tsx src/groth16Verifier/submitProof.ts


phase2: download-and-decrypt-testament sign-cid notarize-cid

download-and-decrypt-testament:
	@pnpm exec tsx src/IPFS/download.ts

download-and-decrypt-testament-test:
	@pnpm exec tsx src/IPFS/download.ts --test

hash-testament:
	@pnpm exec tsx ../../shared/utils/hash/cid.ts --path './testament/5_encrypted.json'

hash-data:
	@pnpm exec tsx ../../shared/utils/hash/cid.ts --json '{"algorithm":"aes-256-gcm","iv":"SXwGj4zpnPz6fJvo","authTag":"tp0VPERBYMhUac8HyQwfFA==","ciphertext":"47ljOJWRts3C03tiY0OWLqCfioKKp9p9RFWPB2j/qJ3P2ZLVKMDVdbTa/DJcf7mqnFhJkBToyiA51e4GfNK4SOjshBi4XdT/bB2JMrb5KJKMbCQ+yWsCpr8Ujx9WyyRYV1CtY4LL3ob0Wm6kCygABaoxFX/6dgUbRmLSrUjK0Xf3lj+jP5Oidx/dDlu308E5VqHDSGj0xAvieJjEbdSEwanoCzSALzBI/wN9JhPar/YU8IWdDs6BMKN98ops4olWiGLZl2MmWI/GqzREyg7bqiLQic3ui2dwI9FrNvMB42NKk+qwJQt8jvlrXpaVRij4KpTUtCJVdRK0v91XdC3sjHRxP1mNzfVz1vjrHauh2m14G9CBZDQEm0qoUwjkiO8zoaGpbhLtX1kYKASe0V1v0amN2FXHKqHAXHGo7VVNFaFH8hHlLD0VXroacsSnMzA5dQQJ6Q5m71Kh6TyuRqmGqmPLg5umt+eqkcYiFkAh2qnCY9tWMReYkwZOIFwv8gjd7waERHtm+HZ0M+u+IFw2lA8qyLC4WjOKzu4qVR7BeScjsj3WOvPaPcURefmkZQuQBluBGd3iqwjX89ovfNSmLjbkQ4eGijif3u9O2pIwY9+FrQWYx+ZMv9eIweIRJIWFq8RzleXKx6CNlbRkYfLXs51FTHCdzuH/gbc8jj7orlB4LgZG5d04Z89Zfmnfzfh4raycABY+RR6nDc6bXz8mpbEhfN9GHmxsXDYEkWdyvXjqicNwXwgMzUQBqlLiJyw6PrzGX2f2ZjZ/cQ7uA0NYc47kz0NyJTP/rYTZYrNJgKS0WvCJH2laiSnoNqdEf7RTX5Yffk+ksUwpitq724y5BtNuLP5V3RAevH+/hFCJSTzEoiUbsT1i3YlcyxVP5zfDdTY8PIHAKlTCAoRk7giImm8VAZ9Wf1YUaKsCgXz12kIEZTHso+a7eFl9lUbrniPLdRaXdGp7Cns6t9RhU3YLdBoF3R7XLkOd3Mh9mlXXVraXILHKPaKgVHDUgoBuCvz7nMR44abD2Cd/3+Yot2lu1Ac4V1tKxarRuWzmSooxfpEQ0esgVQFWVtMtDQ+sau2+MmyXGR4th96McXxeMu2u6pbjbhVewdrO6aaOiGFzoXSMfHrHEegvay1YOavYR0Ducd87BaYRIHhvP4cDyi0baJAFiPBLlzLBswjTLK/EqXV2t5wrpnT4OLcvWWd+cTK/w2m09ZD1IhsUje4UUeVQqmQ+JRmOrsu1jhTcCA==","timestamp":"2025-06-17T18:34:55.262Z"}'
# Results: {
#   json: { id: '1' },
#   jsonBytes: '0x7b226964223a2231227d',
#   multihash: '0x12205811967f540d300d249ab30ae681359a7815fdb5d3dc71a94be1d491006a6b27',
#   cidBytes: '0x01800412205811967f540d300d249ab30ae681359a7815fdb5d3dc71a94be1d491006a6b27',
#   cid: 'bagaaieralaizm72ubuya2je2wmfonajvtj4bl7nv2pohdkkl4hkjcadknmtq'
# }

sign-cid:
	@pnpm exec tsx src/signature/cid.ts

notarize-cid:
	@pnpm exec tsx src/testamentFactory/notarizeCID.ts


phase3: create-testament signature-transfer

create-testament:
	@pnpm exec tsx src/testamentFactory/createTestament.ts

signature-transfer:
	@pnpm exec tsx src/testament/signatureTransfer.ts