.PHONY: all

all: clean phase1 phase2 phase3

clean:
	@echo "Resetting environment variables..."
	@pnpm exec tsx ../../shared/utils/env/resetEnvVariable.ts SALT WILL \
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
	@-rm -f will/5_encrypted*.json
	@-rm -f will/6_decrypted*.json
	@echo "Removing secret key..."
	@-rm -f ../../shared/utils/crypto/key.txt

	@@echo "Initialization completed"


phase1: approve-permit predict-address sign-transfer encrypt-will upload-will upload-cid submit-proof

approve-permit:
	@pnpm exec tsx src/onchain/permit2/approveTokenPermit2.ts

predict-address:
	@pnpm exec tsx src/onchain/willFactory/predictWill.ts

sign-transfer:
	@pnpm exec tsx src/offchain/signature/transfer.ts

encrypt-will:
	@pnpm exec tsx src/offchain/encryption/encryptWill.ts

encrypt-data:
	@pnpm exec tsx ../../shared/utils/crypto/encrypt.ts	\
		--plaintext "Hello, World!"
	@pnpm exec tsx ../../shared/utils/crypto/encrypt.ts \
		--algorithm chacha20-poly1305 \
		--plaintext "Secret message"
	@pnpm exec tsx ../../shared/utils/crypto/encrypt.ts \
		--plaintext "Text" \
		--key "qmpEWRQQ+w1hp6xFYkoXFUHZA8Os71XTWxDZIdNAS7o=" \
		--iv "YjgZJzfIXjAYvwt/"

upload-will:
	@pnpm exec tsx src/offchain/IPFS/upload.ts

upload-cid:
	@pnpm exec tsx src/onchain/willFactory/uploadCID.ts

submit-proof:
	@pnpm exec tsx src/onchain/groth16Verifier/submitProof.ts


phase2: download-will decrypt-will sign-cid notarize-cid

download-will:
	@pnpm exec tsx src/offchain/IPFS/download.ts

decrypt-will:
	@pnpm exec tsx src/offchain/encryption/decryptWill.ts

decrypt-will-local:
	@pnpm exec tsx src/offchain/encryption/decryptWill.ts --local

decrypt-data:
	@pnpm exec tsx ../../shared/utils/crypto/decrypt.ts \
		--ciphertext "Gpom0+vuv9teKLYbPg==" \
		--key "6jGDknBabkzOqplZpenhe9M/4iF2hotChGiVvOERQ7k=" \
		--iv "lV8jzMw8l38VL+kA" \
		--authTag "UKLNsX07gXEth4BE2uFCcw=="
# Hello, World!
	@pnpm exec tsx ../../shared/utils/crypto/decrypt.ts \
		--algorithm chacha20-poly1305 \
		--ciphertext "GbqjqkNZGT1DIEmfPqI=" \
		--key "i3ysCaBP/LhiFIdN9KAxd5PdIq0ptvJGzwd0FuzJmy4=" \
		--iv "grOq8Gex5t4EIWRI" \
		--authTag "Yu1tQXI0/uqRxDIkSPwzrA=="
# Secret message
	@pnpm exec tsx ../../shared/utils/crypto/decrypt.ts \
		--ciphertext "PgG52g==" \
		--key "qmpEWRQQ+w1hp6xFYkoXFUHZA8Os71XTWxDZIdNAS7o=" \
		--iv "YjgZJzfIXjAYvwt/" \
		--authTag "u1NxL5uXKyM/8qbZiBtUvQ=="
# Text

hash-will:
	@pnpm exec tsx ../../shared/utils/hash/cid.ts \
		--path './will/5_encrypted.json'

hash-data:
	@pnpm exec tsx ../../shared/utils/hash/cid.ts \
		--json '{"algorithm":"aes-256-gcm","iv":"SXwGj4zpnPz6fJvo","authTag":"tp0VPERBYMhUac8HyQwfFA==","ciphertext":"47ljOJWRts3C03tiY0OWLqCfioKKp9p9RFWPB2j/qJ3P2ZLVKMDVdbTa/DJcf7mqnFhJkBToyiA51e4GfNK4SOjshBi4XdT/bB2JMrb5KJKMbCQ+yWsCpr8Ujx9WyyRYV1CtY4LL3ob0Wm6kCygABaoxFX/6dgUbRmLSrUjK0Xf3lj+jP5Oidx/dDlu308E5VqHDSGj0xAvieJjEbdSEwanoCzSALzBI/wN9JhPar/YU8IWdDs6BMKN98ops4olWiGLZl2MmWI/GqzREyg7bqiLQic3ui2dwI9FrNvMB42NKk+qwJQt8jvlrXpaVRij4KpTUtCJVdRK0v91XdC3sjHRxP1mNzfVz1vjrHauh2m14G9CBZDQEm0qoUwjkiO8zoaGpbhLtX1kYKASe0V1v0amN2FXHKqHAXHGo7VVNFaFH8hHlLD0VXroacsSnMzA5dQQJ6Q5m71Kh6TyuRqmGqmPLg5umt+eqkcYiFkAh2qnCY9tWMReYkwZOIFwv8gjd7waERHtm+HZ0M+u+IFw2lA8qyLC4WjOKzu4qVR7BeScjsj3WOvPaPcURefmkZQuQBluBGd3iqwjX89ovfNSmLjbkQ4eGijif3u9O2pIwY9+FrQWYx+ZMv9eIweIRJIWFq8RzleXKx6CNlbRkYfLXs51FTHCdzuH/gbc8jj7orlB4LgZG5d04Z89Zfmnfzfh4raycABY+RR6nDc6bXz8mpbEhfN9GHmxsXDYEkWdyvXjqicNwXwgMzUQBqlLiJyw6PrzGX2f2ZjZ/cQ7uA0NYc47kz0NyJTP/rYTZYrNJgKS0WvCJH2laiSnoNqdEf7RTX5Yffk+ksUwpitq724y5BtNuLP5V3RAevH+/hFCJSTzEoiUbsT1i3YlcyxVP5zfDdTY8PIHAKlTCAoRk7giImm8VAZ9Wf1YUaKsCgXz12kIEZTHso+a7eFl9lUbrniPLdRaXdGp7Cns6t9RhU3YLdBoF3R7XLkOd3Mh9mlXXVraXILHKPaKgVHDUgoBuCvz7nMR44abD2Cd/3+Yot2lu1Ac4V1tKxarRuWzmSooxfpEQ0esgVQFWVtMtDQ+sau2+MmyXGR4th96McXxeMu2u6pbjbhVewdrO6aaOiGFzoXSMfHrHEegvay1YOavYR0Ducd87BaYRIHhvP4cDyi0baJAFiPBLlzLBswjTLK/EqXV2t5wrpnT4OLcvWWd+cTK/w2m09ZD1IhsUje4UUeVQqmQ+JRmOrsu1jhTcCA==","timestamp":"2025-06-17T18:34:55.262Z"}'
# Results: {
#   json: { id: '1' },
#   jsonBytes: '0x7b226964223a2231227d',
#   multihash: '0x12205811967f540d300d249ab30ae681359a7815fdb5d3dc71a94be1d491006a6b27',
#   cidBytes: '0x01800412205811967f540d300d249ab30ae681359a7815fdb5d3dc71a94be1d491006a6b27',
#   cid: 'bagaaieralaizm72ubuya2je2wmfonajvtj4bl7nv2pohdkkl4hkjcadknmtq'
# }

sign-cid:
	@pnpm exec tsx src/offchain/signature/cid.ts

notarize-cid:
	@pnpm exec tsx src/onchain/willFactory/notarizeCID.ts


phase3: create-will signature-transfer

create-will:
	@pnpm exec tsx src/onchain/willFactory/createWill.ts

signature-transfer:
	@pnpm exec tsx src/onchain/will/signatureTransfer.ts