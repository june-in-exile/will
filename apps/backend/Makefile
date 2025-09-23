.PHONY: all

all: clean phase1 phase2 phase3

clean:
	@echo "Resetting environment variables..."
	@pnpm exec tsx ../../shared/utils/file/resetEnvVariable.ts SALT WILL \
        BENEFICIARY0 TOKEN0 AMOUNT0 \
        BENEFICIARY1 TOKEN1 AMOUNT1 \
        NONCE DEADLINE PERMIT2_SIGNATURE \
        CID EXECUTOR_SIGNATURE \
		UPLOAD_TX_HASH UPLOAD_TIMESTAMP \
		NOTARIZE_TX_HASH NOTARIZE_TIMESTAMP \
		CREATE_WILL_TX_HASH CREATE_WILL_TIMESTAMP \
		EXECUTE_WILL_TX_HASH EXECUTE_WILL_TIMESTAMP \
		|| echo "Warning: Failed to reset env variables"
	@echo "Removing generated files..."
	@-rm -f will/3_addressed*.json
	@-rm -f will/4_signed*.json
	@-rm -f will/5_serialized*.json
	@-rm -f will/6_encrypted*.json
	@-rm -f will/7_downloaded*.json
	@-rm -f will/8_decrypted*.json
	@-rm -f will/9_deserialized*.json
	@echo "Removing secret key..."
	@-rm -f ../../shared/utils/cryptography/key.txt

	@@echo "Initialization completed"


phase1: approve-permit2 predict-address sign-permit serialize-will encrypt-will prove-for-cid-upload upload-will upload-cid

approve-permit2:
	@pnpm exec tsx src/onchain/permit2/approveTokenPermit2.ts

predict-address:
	@pnpm exec tsx src/onchain/willFactory/predictWill.ts

sign-permit:
	@pnpm exec tsx src/offchain/signature/permit.ts

serialize-will:
	@pnpm exec tsx src/offchain/serialization/serialize.ts

encrypt-will:
	@pnpm exec tsx src/offchain/cryptography/encryptWill.ts

prove-for-cid-upload:
	@pnpm exec tsx src/offchain/zkp/cidUpload.ts

upload-will:
	@pnpm exec tsx src/offchain/ipfs/upload.ts

upload-cid:
	@pnpm exec tsx src/onchain/willFactory/uploadCid.ts


phase2: download-will decrypt-will deserialize-will sign-cid notarize-cid

download-will:
	@pnpm exec tsx src/offchain/ipfs/download.ts

decrypt-will:
	@pnpm exec tsx src/offchain/cryptography/decryptWill.ts

decrypt-will-local:
	@pnpm exec tsx src/offchain/cryptography/decryptWill.ts --local

deserialize-will:
	@pnpm exec tsx src/offchain/serialization/deserialize.ts

sign-cid:
	@pnpm exec tsx src/offchain/signature/cid.ts

notarize-cid:
	@pnpm exec tsx src/onchain/willFactory/notarizeCid.ts


phase3: prove-for-will-creation create-will signature-transfer

prove-for-will-creation:
	@pnpm exec tsx src/offchain/zkp/willCreation.ts

create-will:
	@pnpm exec tsx src/onchain/willFactory/createWill.ts

signature-transfer:
	@pnpm exec tsx src/onchain/will/signatureTransfer.ts


utils: keccak256 encrypt-data decrypt-data cid-data cid-path submit-proof

keccak256:
	@pnpm exec tsx ../../shared/utils/cryptography/keccak256.ts \
		--input "TokenPermissions(address token,uint256 amount)"
# 0x618358ac3db8dc274f0cd8829da7e234bd48cd73c4a740aede1adec9846d06a1

encrypt-data:
	@pnpm exec tsx ../../shared/utils/cryptography/encrypt.ts	\
		--algorithm aes-256-gcm \
		--plaintext "Hello, World!"
	@pnpm exec tsx ../../shared/utils/cryptography/encrypt.ts \
		--algorithm chacha20-poly1305 \
		--plaintext "Secret message"
	@pnpm exec tsx ../../shared/utils/cryptography/encrypt.ts \
		--algorithm aes-256-gcm \
		--plaintext "Text" \
		--key "qmpEWRQQ+w1hp6xFYkoXFUHZA8Os71XTWxDZIdNAS7o=" \
		--iv "YjgZJzfIXjAYvwt/"
	@pnpm exec tsx ../../shared/utils/cryptography/encrypt.ts \
		--plaintext "AES-256-CTR algorithm"

decrypt-data:
	@pnpm exec tsx ../../shared/utils/cryptography/decrypt.ts \
		--algorithm aes-256-gcm \
		--ciphertext "Gpom0+vuv9teKLYbPg==" \
		--key "6jGDknBabkzOqplZpenhe9M/4iF2hotChGiVvOERQ7k=" \
		--iv "lV8jzMw8l38VL+kA" \
		--authTag "UKLNsX07gXEth4BE2uFCcw=="
# Hello, World!
	@pnpm exec tsx ../../shared/utils/cryptography/decrypt.ts \
		--algorithm chacha20-poly1305 \
		--ciphertext "GbqjqkNZGT1DIEmfPqI=" \
		--key "i3ysCaBP/LhiFIdN9KAxd5PdIq0ptvJGzwd0FuzJmy4=" \
		--iv "grOq8Gex5t4EIWRI" \
		--authTag "Yu1tQXI0/uqRxDIkSPwzrA=="
# Secret message
	@pnpm exec tsx ../../shared/utils/cryptography/decrypt.ts \
		--algorithm aes-256-gcm \
		--ciphertext "PgG52g==" \
		--key "qmpEWRQQ+w1hp6xFYkoXFUHZA8Os71XTWxDZIdNAS7o=" \
		--iv "YjgZJzfIXjAYvwt/" \
		--authTag "u1NxL5uXKyM/8qbZiBtUvQ=="
# Text
	@pnpm exec tsx ../../shared/utils/cryptography/decrypt.ts \
		--ciphertext "pHd5wodomsWb3bpRbVi6/8gUONBa" \
		--key "NPu551h+p/8ZCJxFOE0ZMHQ9GKgONWTUWfFqbIj6vZ0=" \
		--iv "wqoEnM5H2VDxfIcR7NsdAQ=="
# AES-256-CTR algorithm

cid-data:
	@pnpm exec tsx src/offchain/ipfs/cid.ts \
		--data '{"algorithm":"aes-256-gcm","iv":"SXwGj4zpnPz6fJvo","authTag":"tp0VPERBYMhUac8HyQwfFA==","ciphertext":"47ljOJWRts3C03tiY0OWLqCfioKKp9p9RFWPB2j/qJ3P2ZLVKMDVdbTa/DJcf7mqnFhJkBToyiA51e4GfNK4SOjshBi4XdT/bB2JMrb5KJKMbCQ+yWsCpr8Ujx9WyyRYV1CtY4LL3ob0Wm6kCygABaoxFX/6dgUbRmLSrUjK0Xf3lj+jP5Oidx/dDlu308E5VqHDSGj0xAvieJjEbdSEwanoCzSALzBI/wN9JhPar/YU8IWdDs6BMKN98ops4olWiGLZl2MmWI/GqzREyg7bqiLQic3ui2dwI9FrNvMB42NKk+qwJQt8jvlrXpaVRij4KpTUtCJVdRK0v91XdC3sjHRxP1mNzfVz1vjrHauh2m14G9CBZDQEm0qoUwjkiO8zoaGpbhLtX1kYKASe0V1v0amN2FXHKqHAXHGo7VVNFaFH8hHlLD0VXroacsSnMzA5dQQJ6Q5m71Kh6TyuRqmGqmPLg5umt+eqkcYiFkAh2qnCY9tWMReYkwZOIFwv8gjd7waERHtm+HZ0M+u+IFw2lA8qyLC4WjOKzu4qVR7BeScjsj3WOvPaPcURefmkZQuQBluBGd3iqwjX89ovfNSmLjbkQ4eGijif3u9O2pIwY9+FrQWYx+ZMv9eIweIRJIWFq8RzleXKx6CNlbRkYfLXs51FTHCdzuH/gbc8jj7orlB4LgZG5d04Z89Zfmnfzfh4raycABY+RR6nDc6bXz8mpbEhfN9GHmxsXDYEkWdyvXjqicNwXwgMzUQBqlLiJyw6PrzGX2f2ZjZ/cQ7uA0NYc47kz0NyJTP/rYTZYrNJgKS0WvCJH2laiSnoNqdEf7RTX5Yffk+ksUwpitq724y5BtNuLP5V3RAevH+/hFCJSTzEoiUbsT1i3YlcyxVP5zfDdTY8PIHAKlTCAoRk7giImm8VAZ9Wf1YUaKsCgXz12kIEZTHso+a7eFl9lUbrniPLdRaXdGp7Cns6t9RhU3YLdBoF3R7XLkOd3Mh9mlXXVraXILHKPaKgVHDUgoBuCvz7nMR44abD2Cd/3+Yot2lu1Ac4V1tKxarRuWzmSooxfpEQ0esgVQFWVtMtDQ+sau2+MmyXGR4th96McXxeMu2u6pbjbhVewdrO6aaOiGFzoXSMfHrHEegvay1YOavYR0Ducd87BaYRIHhvP4cDyi0baJAFiPBLlzLBswjTLK/EqXV2t5wrpnT4OLcvWWd+cTK/w2m09ZD1IhsUje4UUeVQqmQ+JRmOrsu1jhTcCA==","timestamp":1753835132371}'

cid-path:
	@pnpm exec tsx src/offchain/ipfs/cid.ts \
		--path './will/6_encrypted.json'

submit-proof:
	@pnpm exec tsx src/onchain/groth16Verifier/submitProof.ts