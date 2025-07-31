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
	@-rm -f will/5_encrypted*.json
	@-rm -f will/6_decrypted*.json
	@echo "Removing secret key..."
	@-rm -f ../../shared/utils/cryptography/key.txt

	@@echo "Initialization completed"


phase1: approve-permit predict-address sign-permit encrypt-will upload-will upload-cid

approve-permit:
	@pnpm exec tsx src/onchain/permit2/approveTokenPermit2.ts

predict-address:
	@pnpm exec tsx src/onchain/willFactory/predictWill.ts

sign-permit:
	@pnpm exec tsx src/offchain/signature/permit.ts

encrypt-will:
	@pnpm exec tsx src/offchain/cryptography/encryptWill.ts

encrypt-data:
	@pnpm exec tsx ../../shared/utils/cryptography/encrypt.ts	\
		--plaintext "Hello, World!"
	@pnpm exec tsx ../../shared/utils/cryptography/encrypt.ts \
		--algorithm chacha20-poly1305 \
		--plaintext "Secret message"
	@pnpm exec tsx ../../shared/utils/cryptography/encrypt.ts \
		--plaintext "Text" \
		--key "qmpEWRQQ+w1hp6xFYkoXFUHZA8Os71XTWxDZIdNAS7o=" \
		--iv "YjgZJzfIXjAYvwt/"
# PgG52g==

upload-will:
	@pnpm exec tsx src/offchain/ipfs/upload.ts

upload-cid:
	@pnpm exec tsx src/onchain/willFactory/uploadCid.ts

submit-proof:
	@pnpm exec tsx src/onchain/groth16Verifier/submitProof.ts


phase2: download-will decrypt-will sign-cid notarize-cid

download-will:
	@pnpm exec tsx src/offchain/ipfs/download.ts

decrypt-will:
	@pnpm exec tsx src/offchain/cryptography/decryptWill.ts

decrypt-will-local:
	@pnpm exec tsx src/offchain/cryptography/decryptWill.ts --local

decrypt-data:
	@pnpm exec tsx ../../shared/utils/cryptography/decrypt.ts \
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
		--ciphertext "PgG52g==" \
		--key "qmpEWRQQ+w1hp6xFYkoXFUHZA8Os71XTWxDZIdNAS7o=" \
		--iv "YjgZJzfIXjAYvwt/" \
		--authTag "u1NxL5uXKyM/8qbZiBtUvQ=="
# Text

hash-will:
	@pnpm exec tsx ../../shared/utils/cryptography/cid.ts \
		--path './will/5_encrypted.json'

hash-data:
	@pnpm exec tsx ../../shared/utils/cryptography/cid.ts \
		--json '{"algorithm":"aes-256-gcm","iv":"SXwGj4zpnPz6fJvo","authTag":"tp0VPERBYMhUac8HyQwfFA==","ciphertext":"47ljOJWRts3C03tiY0OWLqCfioKKp9p9RFWPB2j/qJ3P2ZLVKMDVdbTa/DJcf7mqnFhJkBToyiA51e4GfNK4SOjshBi4XdT/bB2JMrb5KJKMbCQ+yWsCpr8Ujx9WyyRYV1CtY4LL3ob0Wm6kCygABaoxFX/6dgUbRmLSrUjK0Xf3lj+jP5Oidx/dDlu308E5VqHDSGj0xAvieJjEbdSEwanoCzSALzBI/wN9JhPar/YU8IWdDs6BMKN98ops4olWiGLZl2MmWI/GqzREyg7bqiLQic3ui2dwI9FrNvMB42NKk+qwJQt8jvlrXpaVRij4KpTUtCJVdRK0v91XdC3sjHRxP1mNzfVz1vjrHauh2m14G9CBZDQEm0qoUwjkiO8zoaGpbhLtX1kYKASe0V1v0amN2FXHKqHAXHGo7VVNFaFH8hHlLD0VXroacsSnMzA5dQQJ6Q5m71Kh6TyuRqmGqmPLg5umt+eqkcYiFkAh2qnCY9tWMReYkwZOIFwv8gjd7waERHtm+HZ0M+u+IFw2lA8qyLC4WjOKzu4qVR7BeScjsj3WOvPaPcURefmkZQuQBluBGd3iqwjX89ovfNSmLjbkQ4eGijif3u9O2pIwY9+FrQWYx+ZMv9eIweIRJIWFq8RzleXKx6CNlbRkYfLXs51FTHCdzuH/gbc8jj7orlB4LgZG5d04Z89Zfmnfzfh4raycABY+RR6nDc6bXz8mpbEhfN9GHmxsXDYEkWdyvXjqicNwXwgMzUQBqlLiJyw6PrzGX2f2ZjZ/cQ7uA0NYc47kz0NyJTP/rYTZYrNJgKS0WvCJH2laiSnoNqdEf7RTX5Yffk+ksUwpitq724y5BtNuLP5V3RAevH+/hFCJSTzEoiUbsT1i3YlcyxVP5zfDdTY8PIHAKlTCAoRk7giImm8VAZ9Wf1YUaKsCgXz12kIEZTHso+a7eFl9lUbrniPLdRaXdGp7Cns6t9RhU3YLdBoF3R7XLkOd3Mh9mlXXVraXILHKPaKgVHDUgoBuCvz7nMR44abD2Cd/3+Yot2lu1Ac4V1tKxarRuWzmSooxfpEQ0esgVQFWVtMtDQ+sau2+MmyXGR4th96McXxeMu2u6pbjbhVewdrO6aaOiGFzoXSMfHrHEegvay1YOavYR0Ducd87BaYRIHhvP4cDyi0baJAFiPBLlzLBswjTLK/EqXV2t5wrpnT4OLcvWWd+cTK/w2m09ZD1IhsUje4UUeVQqmQ+JRmOrsu1jhTcCA==","timestamp":1753835132371}'
# Results: {
#   json: {
#     algorithm: 'aes-256-gcm',
#     iv: 'SXwGj4zpnPz6fJvo',
#     authTag: 'tp0VPERBYMhUac8HyQwfFA==',
#     ciphertext: '47ljOJWRts3C03tiY0OWLqCfioKKp9p9RFWPB2j/qJ3P2ZLVKMDVdbTa/DJcf7mqnFhJkBToyiA51e4GfNK4SOjshBi4XdT/bB2JMrb5KJKMbCQ+yWsCpr8Ujx9WyyRYV1CtY4LL3ob0Wm6kCygABaoxFX/6dgUbRmLSrUjK0Xf3lj+jP5Oidx/dDlu308E5VqHDSGj0xAvieJjEbdSEwanoCzSALzBI/wN9JhPar/YU8IWdDs6BMKN98ops4olWiGLZl2MmWI/GqzREyg7bqiLQic3ui2dwI9FrNvMB42NKk+qwJQt8jvlrXpaVRij4KpTUtCJVdRK0v91XdC3sjHRxP1mNzfVz1vjrHauh2m14G9CBZDQEm0qoUwjkiO8zoaGpbhLtX1kYKASe0V1v0amN2FXHKqHAXHGo7VVNFaFH8hHlLD0VXroacsSnMzA5dQQJ6Q5m71Kh6TyuRqmGqmPLg5umt+eqkcYiFkAh2qnCY9tWMReYkwZOIFwv8gjd7waERHtm+HZ0M+u+IFw2lA8qyLC4WjOKzu4qVR7BeScjsj3WOvPaPcURefmkZQuQBluBGd3iqwjX89ovfNSmLjbkQ4eGijif3u9O2pIwY9+FrQWYx+ZMv9eIweIRJIWFq8RzleXKx6CNlbRkYfLXs51FTHCdzuH/gbc8jj7orlB4LgZG5d04Z89Zfmnfzfh4raycABY+RR6nDc6bXz8mpbEhfN9GHmxsXDYEkWdyvXjqicNwXwgMzUQBqlLiJyw6PrzGX2f2ZjZ/cQ7uA0NYc47kz0NyJTP/rYTZYrNJgKS0WvCJH2laiSnoNqdEf7RTX5Yffk+ksUwpitq724y5BtNuLP5V3RAevH+/hFCJSTzEoiUbsT1i3YlcyxVP5zfDdTY8PIHAKlTCAoRk7giImm8VAZ9Wf1YUaKsCgXz12kIEZTHso+a7eFl9lUbrniPLdRaXdGp7Cns6t9RhU3YLdBoF3R7XLkOd3Mh9mlXXVraXILHKPaKgVHDUgoBuCvz7nMR44abD2Cd/3+Yot2lu1Ac4V1tKxarRuWzmSooxfpEQ0esgVQFWVtMtDQ+sau2+MmyXGR4th96McXxeMu2u6pbjbhVewdrO6aaOiGFzoXSMfHrHEegvay1YOavYR0Ducd87BaYRIHhvP4cDyi0baJAFiPBLlzLBswjTLK/EqXV2t5wrpnT4OLcvWWd+cTK/w2m09ZD1IhsUje4UUeVQqmQ+JRmOrsu1jhTcCA==',
#     timestamp: 1753824424
#   },
#   jsonBytes: '0x7b22616c676f726974686d223a226165732d3235362d67636d222c226976223a22535877476a347a706e507a36664a766f222c2261757468546167223a227470305650455242594d6855616338487951776646413d3d222c2263697068657274657874223a2234376c6a4f4a5752747333433033746959304f574c714366696f4b4b703970395246575042326a2f714a3350325a4c564b4d4456646254612f444a6366376d716e46684a6b42546f7969413531653447664e4b34534f6a73684269345864542f6242324a4d7262354b4a4b4d6243512b79577343707238556a783957797952595631437459344c4c336f6230576d366b4379674142616f7846582f3664675562526d4c5372556a4b305866336c6a2b6a50354f6964782f64446c7533303845355671484453476a3078417669654a6a456264534577616e6f437a53414c7a42492f774e394a685061722f595538495764447336424d4b4e39386f7073346f6c5769474c5a6c324d6d57492f47717a52457967376271694c516963337569326477493946724e764d4234324e4b6b2b71774a5174386a766c725870615652696a344b70545574434a5664524b3076393158644333736a48527850316d4e7a66567a31766a7248617568326d3134473943425a4451456d30716f55776a6b694f387a6f61477062684c7458316b594b4153653056317630616d4e324658484b7148415848476f3756564e466146483868486c4c44305658726f616373536e4d7a41356451514a3651356d37314b683654797552716d47716d504c6735756d742b65716b635969466b416832716e43593974574d5265596b775a4f4946777638676a64377761455248746d2b485a304d2b752b494677326c413871794c4334576a4f4b7a753471565237426553636a736a33574f7650615063555265666d6b5a517551426c75424764336971776a5838396f76664e536d4c6a626b51346547696a69663375394f3270497759392b4672515759782b5a4d76396549776549524a4957467138527a6c65584b7836434e6c62526b59664c5873353146544843647a75482f676263386a6a376f726c42344c675a47356430345a38395a666d6e667a666834726179634142592b5252366e44633662587a386d70624568664e3947486d7873584459456b57647976586a7169634e775877674d7a555142716c4c694a79773650727a47583266325a6a5a2f6351377541304e596334376b7a304e794a54502f7259545a59724e4a674b53305776434a48326c6169536e6f4e7164456637525458355966666b2b6b73557770697471373234793542744e754c5035563352416576482b2f6846434a53547a456f6955627354316933596c6379785650357a664464545938504948414b6c5443416f526b376769496d6d3856415a395766315955614b734367587a31326b49455a5448736f2b613765466c396c5562726e69504c6452615864477037436e7336743952685533594c64426f46335237584c6b4f64334d68396d6c585856726158494c484b50614b6756484455676f427543767a376e4d5234346162443243642f332b596f74326c75314163345631744b7861725275577a6d536f6f7866704551306573675651465756744d7444512b736175322b4d6d7958475234746839364d635878654d7532753670626a626856657764724f3661614f6947467a6f58534d6648724845656776617931594f617659523044756364383742615952494868765034634479693062614a41466950424c6c7a4c4273776a544c4b2f457158563274357772706e54344f4c63765757642b63544b2f77326d30395a4431496873556a65345555655651716d512b4a526d4f727375316a68546343413d3d222c2274696d657374616d70223a313735333832343432347d',
#   multihash: '0x1220a68196f308c4cdce043053e7083e6ef26767bb46ab08d31f32fe692b584b869a',
#   cidBytes: '0x0180041220a68196f308c4cdce043053e7083e6ef26767bb46ab08d31f32fe692b584b869a',
#   cid: 'bagaaierau2azn4yiytg44bbqkptqqpto6jtwpo2gvmenghzs7zuswwclq2na'
# }

sign-cid:
	@pnpm exec tsx src/offchain/signature/cid.ts

notarize-cid:
	@pnpm exec tsx src/onchain/willFactory/notarizeCid.ts


phase3: create-will signature-transfer

create-will:
	@pnpm exec tsx src/onchain/willFactory/createWill.ts

signature-transfer:
	@pnpm exec tsx src/onchain/will/signatureTransfer.ts