import { AbiEncoder, Keccak256 } from "./index.js"
import { Bit, Byte, Uint256, Address, Estate, Nonce, Timestamp, Signature } from "../type/index.js";
import { byteToBigInt, concatBigInts, splitBigInt } from "../util/conversion.js";
import { hexToByte } from "../util/index.js";

const _TOKEN_PERMISSIONS_TYPEHASH = "0x618358ac3db8dc274f0cd8829da7e234bd48cd73c4a740aede1adec9846d06a1";
const _PERMIT_BATCH_TRANSFER_FROM_TYPEHASH = "0xfcf35f5ac6a2c28868dc44c302166470266239195f02b0ee408334829333b766";

function hashPermit(
    estates: Estate[],
    nonce: Nonce,
    deadline: Timestamp,
    will: Address,
): Uint256 {
    const tokenPermissionDigests: string[] = [];
    for (let i = 0; i < estates.length; i++) {
        tokenPermissionDigests[i] = Keccak256.hash(AbiEncoder.encode(_TOKEN_PERMISSIONS_TYPEHASH, estates[i].token, estates[i].amount));
    }

    const permitDigest = Keccak256.hash(
        AbiEncoder.encode(
            _PERMIT_BATCH_TRANSFER_FROM_TYPEHASH,
            Keccak256.hash(AbiEncoder.encodePacked(tokenPermissionDigests)),
            will as bigint,
            nonce as bigint,
            deadline as number
        )
    );
    return splitBigInt(BigInt(permitDigest));
}

function eip712Hash(dataHash: Uint256, chainId: number = 421614): Uint256 {
    let DOMAIN_SEPARATOR;
    if (chainId == 421614) {  // Arbitrum Sepolia
        DOMAIN_SEPARATOR = "0x97caedc57dcfc2ae625d68b894a8a814d7be09e29aa5321eebada2423410d9d0";
    } else {// Mainnet
        DOMAIN_SEPARATOR = "0x866a5aba21966af95d6c7ab78eb2b2fc913915c28be3b9aa07cc04ff903e3f28";
    }
    const eip712Digest = Keccak256.hash(AbiEncoder.encodePacked("\x19\x01", DOMAIN_SEPARATOR, concatBigInts(dataHash)));
    return splitBigInt(BigInt(eip712Digest));
}

function decodeSignature(signature: Signature): {
    r: Uint256,
    s: Uint256,
    v: Byte
} {
    const rBytes: Byte[] = signature.slice(0, 32);
    const sBytes: Byte[] = signature.slice(32, 64);
    const v = signature[64];

    const r = byteToBigInt(rBytes);
    const s = byteToBigInt(sBytes);

    return { r: splitBigInt(r), s: splitBigInt(s), v };
}

function verifySignature(signature: Signature, permitDigest: Uint256, testator: Address): Bit {
    const { r, s, v } = decodeSignature(signature);
    const signer: Address = AbiEncoder.ecrecover(permitDigest, v, r, s);
    const isValid = (signer == testator);
    return isValid ? 1 : 0;
}

function verifyPermit(
    testator: Address,
    estates: Estate[],
    nonce: Nonce,
    deadline: Timestamp,
    will: Address,
    signature: Signature
): Bit {
    const permitDigest: Uint256 = hashPermit(estates, nonce, deadline, will);
    const permitEip712Digest = eip712Hash(permitDigest);
    return verifySignature(signature, permitEip712Digest, testator);
}

if (
    typeof process !== "undefined" &&
    process.argv?.[1] &&
    process.argv[1].endsWith("permitVerify.ts")
) {
    const testator: Address = BigInt(
        "0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc",
    );
    const estates: Estate[] = [
        {
            beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
            token: BigInt("0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"),
            amount: 1000n,
        },
        {
            beneficiary: BigInt("0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c"),
            token: BigInt("0xb1D4538B4571d411F07960EF2838Ce337FE1E80E"),
            amount: 5000000n,
        },
    ];
    const will: Address = BigInt(
        "0xf34F996Ba6FcBa4286aBCC4b1B39e5F437823358",
    );
    const nonce: Nonce = 105783975893019489732105565735546954603n;
    const deadline: Timestamp = 1788249624;
    const signature = hexToByte(
        "0x8795d3e26d5166091b9b25a260022e46311ae45cc9d1cc744b787a6e406fecd13f4a6eb5d3ae1a3c2a60590ed36b7a0220b84af1436f435d798b21e0ec4891871c",
    ) as Signature;



    console.log("Result:", verifyPermit(testator, estates, nonce, deadline, will, signature));
}

export { hashPermit, eip712Hash, decodeSignature, verifySignature, verifyPermit }