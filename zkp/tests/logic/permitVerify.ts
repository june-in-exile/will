import { AbiEncoder, Keccak256 } from "./index.js"
import { Bit, Byte, Address, Estate, Nonce, Timestamp, Signature } from "../type/index.js";
import { byteToBigInt, concatBigInts, splitBigInt } from "../util/conversion.js";

const _TOKEN_PERMISSIONS_TYPEHASH = "0x618358ac3db8dc274f0cd8829da7e234bd48cd73c4a740aede1adec9846d06a1";
const _PERMIT_BATCH_TRANSFER_FROM_TYPEHASH = "0xfcf35f5ac6a2c28868dc44c302166470266239195f02b0ee408334829333b766";

function hashPermit(
    estates: Estate[],
    nonce: Nonce,
    deadline: Timestamp,
    will: Address,
): bigint[] {
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

function eip712Hash(dataHash: bigint[], chainId: number = 421614): bigint[] {
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
    r: bigint[],
    s: bigint[],
    v: Byte
} {
    const rBytes: Byte[] = signature.slice(0, 32);
    const sBytes: Byte[] = signature.slice(32, 64);
    const v = signature[64];

    const r = byteToBigInt(rBytes);
    const s = byteToBigInt(sBytes);

    return { r: splitBigInt(r), s: splitBigInt(s), v };
}

function verifySignature(signature: Signature, permitDigest: bigint[], testator: Address): Bit {
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
    const permitDigest: bigint[] = hashPermit(estates, nonce, deadline, will);
    const permitEip712Digest = eip712Hash(permitDigest);
    return verifySignature(signature, permitEip712Digest, testator);
}

export { hashPermit, eip712Hash, decodeSignature, verifySignature, verifyPermit }