import { concat, SigningKey } from "ethers";
import { AbiEncoder, Keccak256 } from "./index.js";
import {
  Bit,
  Byte,
  Uint256,
  Address,
  Estate,
  Nonce,
  Timestamp,
  Signature,
  Point,
} from "../type/index.js";
import {
  byteToBigInt,
  concatBigInts,
  splitBigInt,
  hexToPoint,
  hexToByte,
} from "../util/index.js";

const _TOKEN_PERMISSIONS_TYPEHASH =
  "0x618358ac3db8dc274f0cd8829da7e234bd48cd73c4a740aede1adec9846d06a1";
const _PERMIT_BATCH_TRANSFER_FROM_TYPEHASH =
  "0xfcf35f5ac6a2c28868dc44c302166470266239195f02b0ee408334829333b766";

function hashPermit(
  estates: Estate[],
  nonce: Nonce,
  deadline: Timestamp,
  will: Address,
): Uint256 {
  const tokenPermissionDigests: string[] = [];
  for (let i = 0; i < estates.length; i++) {
    const tokenPermission = AbiEncoder.encode(
      ["bytes32", "uint256", "uint256"],
      [_TOKEN_PERMISSIONS_TYPEHASH, estates[i].token, estates[i].amount],
    );
    tokenPermissionDigests[i] = Keccak256.hash(tokenPermission);
  }

  const concatedPermissions = concat(tokenPermissionDigests);
  const hashedPermissions = Keccak256.hash(concatedPermissions);

  const permitBatchTransferFrom = AbiEncoder.encode(
    ["bytes32", "bytes32", "uint256", "uint256", "uint256"],
    [
      _PERMIT_BATCH_TRANSFER_FROM_TYPEHASH,
      hashedPermissions,
      will,
      nonce,
      deadline,
    ],
  );
  const permitDigest = Keccak256.hash(permitBatchTransferFrom);
  return splitBigInt(BigInt(permitDigest));
}

function hashTypedData(dataHash: Uint256, chainId: number = 421614): Uint256 {
  let DOMAIN_SEPARATOR;
  if (chainId == 421614) {
    // Arbitrum Sepolia
    DOMAIN_SEPARATOR =
      "0x97caedc57dcfc2ae625d68b894a8a814d7be09e29aa5321eebada2423410d9d0";
  } else {
    // Mainnet
    DOMAIN_SEPARATOR =
      "0x866a5aba21966af95d6c7ab78eb2b2fc913915c28be3b9aa07cc04ff903e3f28";
  }
  const eip712Digest = Keccak256.hash(
    AbiEncoder.encode(
      ["bytes", "bytes32", "uint256"],
      ["0x1901", DOMAIN_SEPARATOR, concatBigInts(dataHash)],
      true,
    ),
  );
  return splitBigInt(BigInt(eip712Digest));
}

function decodeSignature(signature: Signature): {
  r: Uint256;
  s: Uint256;
  v: Byte;
} {
  const r = byteToBigInt(signature.slice(0, 32));
  const s = byteToBigInt(signature.slice(32, 64));
  const v = signature[64];

  return { r: splitBigInt(r), s: splitBigInt(s), v };
}

function recoverPublicKey(
  msghash: Uint256,
  r: Uint256,
  s: Uint256,
  v: Byte,
): Point {
  const signature =
    "0x" +
    (concatBigInts(r).toString(16).padStart(64, "0") +
      concatBigInts(s).toString(16).padStart(64, "0") +
      v.toString(16).padStart(2, "0"));
  const digest = "0x" + concatBigInts(msghash).toString(16);
  const recoveredPublicKey = SigningKey.recoverPublicKey(digest, signature);
  return hexToPoint(recoveredPublicKey);
}

function publicKeyToAddress(publicKey: Point): Address {
  const xHex = AbiEncoder.numberToPaddedHex(publicKey.x);
  const yHex = AbiEncoder.numberToPaddedHex(publicKey.y);

  const publicKeyHash = Keccak256.hash("0x" + xHex + yHex);
  const signer = "0x" + publicKeyHash.slice(-40);

  return BigInt(signer);
}

function verifySignature(
  signature: Signature,
  typedPermitDigest: Uint256,
  testator: Address,
): Bit {
  try {
    const { r, s, v } = decodeSignature(signature);
    const recoveredPublicKey = recoverPublicKey(typedPermitDigest, r, s, v);
    const signer = publicKeyToAddress(recoveredPublicKey);
    const isValid = signer === testator;
    return isValid ? 1 : 0;
  } catch (error) {
    console.error("Failed to verify signature:", error);
    return 0;
  }
}

function verifyPermit(
  testator: Address,
  estates: Estate[],
  nonce: Nonce,
  deadline: Timestamp,
  spender: Address,
  signature: Signature,
): Bit {
  const permitDigest = hashPermit(estates, nonce, deadline, spender);
  const typedPermitDigest = hashTypedData(permitDigest);
  return verifySignature(signature, typedPermitDigest, testator) ? 1 : 0;
}

const testator: Address = BigInt("0x871F339373430f7F0FCfa092C3449B884984E41a");
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
const will: Address = BigInt("0x80515F00edB3D90891D6494b63a58Dc06543bEF0");
const nonce: Nonce = 139895343447235933714306105636108089805n;
const deadline: Timestamp = 1788798363;
const signature = hexToByte(
  "0x8792602093a4f8d68e2fa48bf50cd105c45f95f6a614ed3632737ee9c4ae75a2081cb24113bfec49fbf8e52236f132bc292a15f82e6f475cccf0e2846b26c8861c",
) as Signature;

console.log(
  "Result:",
  verifyPermit(testator, estates, nonce, deadline, will, signature),
);

export {
  hashPermit,
  hashTypedData,
  decodeSignature,
  publicKeyToAddress,
  verifySignature,
  verifyPermit,
};
