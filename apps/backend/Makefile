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
	@pnpm exec tsx ../../shared/utils/hash/cid.ts --json '{"algorithm": "aes-256-gcm","iv": "9jESTqILJek00GDq","authTag": "drpeTcbsxic9s2quNm/Lng==","ciphertext": "yRZRY6ZR78ugBRwdSkpbwjL0z/q0ib8Aizedrb1QmzJVaI1bLqlgPmY4j6t7Ds1Yvp2IBz+R2Whe4IZNWnGA/RvvUZJQ510MMU5hmJLtFrMmTYEmOQXP+Bpa5IORKu+k2zB95UPEK+hkOHo+LOT1TEtu/AH/X5EbNXTzuHxx3VUmh7lb8Gf4w4kPK+9FD5mbVxDqKm9jF+QvjhTpQavmFXOAZtXubFDOYd4JvG7JFdtVVcUh0B3RiUXNJV80B4/3IG2mDJLCCzNvr9KrgIuJOEXNCKeKwjIc7Spjsw67YcyjkYzs1oHP0UgUpMBbmY6WFpGjFMdbZHGzi//yuA/QYxiHPnQvrHFsgDbhG6zDqG4smT5bLAj9RkPN+J0mq7sIwSfs7VwQaZvHR9IwiZfxoV63Pkam8m+uCSRW/6MOb3oYgYolNtgM/VrOBmpi/69/drX4aaZRnJMHxkuisBPLGOfGQxciz4QkN1kvVXJgtaKjBuzjsiADX3Ln2tAgZ1Z+Lh4yhyBJALb1MPHmhJM0bfREEf/G9ZYRILNcjEF6+pyDsXpSac1r/vSK0GOJDa1zOtsYWB9dNAFpVY8oOs6/gyEko5GoqDh5FOcPkJu+twWPlCp8rsqN2FrMAm75D9WlfGqQzJUDn80XvuJ/gCUAz29GADxyu3H3COGJHHsKkCHEvP45xfcsNttIUS5Fq1ObonoKG+L2wTNX9C36H6uRLw/KGgfHATgOYzfNS5I2vfEHqeSDntL5Rwj7Nqur+GoC7AaJUfqZesMVs5JxWNGTQjcJB8yVYknuz+aOBwybr2Wl6tmTSejWr+6c3qE+Zc37Y2j/gM/sUkxO7x2Wi0p74c5Fsf2zxtK/qmWXrju9OXdOHmX/0jZYytoVJjR7QLHjAV8/EQ1c2tUEaqJdL4rpOUIBBDak4oA2zdetHBOriO1c2JHXV48Wf+fh9WP+8ikn8EAFzKBR/2T7PcveFtjJQWIm5Qqeg4/LIhKv4XlMwr+gsTel1oBdAPy0Bi21OM90XV1RkL6Kntq7oyE4GM1BRRubIXDfQ1MAJdCf5/7Tvjwpn97KYJy88unNGv78DnwIMSZGMHXOD+3jag5oYxc6keuJytN1WR7I+/Z/k7YXfkpmRmn3kgig71/NpOdsAndWri9a6U+pDW1FItlaLIqbQjKUHlOh5f59+/2YQqZm4ncJlqXRLPSkuGYXvCCaQt3plADspFGUFWpAlbSZh8jk3XzqINkQjZiNEo+4Tbg=","timestamp": "2025-06-16T15:48:00.913Z"}'
# @pnpm exec tsx ../../shared/utils/hash/cid.ts --json '{"id":1}'
# Results: {
#   json: { id: 1 },
#   contentBytes: '0x7b226964223a317d',
#   contentMultiHash: '0x1220037c9214eef74cc3887f3a4f085b4e17d76280dafd273b0ee160c09c4ba1cfd4',
#   cidBytes: '0x0180041220037c9214eef74cc3887f3a4f085b4e17d76280dafd273b0ee160c09c4ba1cfd4',
#   cid: 'bagaaieraan6jefho65gmhcd7hjhqqw2oc7lwfag27uttwdxbmdajys5bz7ka'
# }

sign-cid:
	@pnpm exec tsx src/signature/cid.ts


	