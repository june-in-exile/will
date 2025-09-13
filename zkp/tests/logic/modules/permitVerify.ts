import { SigningKey } from "ethers";
import { AbiEncoder, Keccak256 } from "../index.js";
import { hexToPoint } from "../../util/index.js";
import chalk from "chalk";

class Permit2 {
  static readonly TOKEN_PERMISSIONS_TYPEHASH =
    "0x618358ac3db8dc274f0cd8829da7e234bd48cd73c4a740aede1adec9846d06a1";
  static readonly PERMIT_BATCH_TRANSFER_FROM_TYPEHASH =
    "0xfcf35f5ac6a2c28868dc44c302166470266239195f02b0ee408334829333b766";

  static hashPermit(
    permit: {
      permitted: { token: string; amount: bigint }[];
      nonce: bigint;
      deadline: number;
    },
    spender: string,
  ): string {
    const tokenPermissionDigests: string[] = [];
    for (let i = 0; i < permit.permitted.length; i++) {
      const tokenPermission = AbiEncoder.encode(
        ["bytes32", "address", "uint256"],
        [
          this.TOKEN_PERMISSIONS_TYPEHASH,
          permit.permitted[i].token,
          permit.permitted[i].amount,
        ],
      );
      tokenPermissionDigests[i] = Keccak256.hash(tokenPermission);
    }

    const concatedTokenPermissionDigests = AbiEncoder.encode(
      Array(permit.permitted.length).fill("bytes32"),
      tokenPermissionDigests,
    );
    const permissionDigest = Keccak256.hash(concatedTokenPermissionDigests);

    const betchPermit = AbiEncoder.encode(
      ["bytes32", "bytes32", "address", "uint256", "uint256"],
      [
        this.PERMIT_BATCH_TRANSFER_FROM_TYPEHASH,
        permissionDigest,
        spender,
        permit.nonce,
        permit.deadline,
      ],
    );
    return Keccak256.hash(betchPermit);
  }

  static hashTypedData(permitDigest: string, chainId: number = 421614): string {
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
    const typedDigest = AbiEncoder.encode(
      ["bytes", "bytes32", "uint256"],
      ["0x1901", DOMAIN_SEPARATOR, BigInt(permitDigest)],
      true,
    );
    const typedPermitDigest = Keccak256.hash(typedDigest);
    return typedPermitDigest;
  }

  static decodeSignature(signature: string): {
    r: bigint;
    s: bigint;
    v: number;
  } {
    const cleanHex = signature.startsWith("0x")
      ? signature.slice(2)
      : signature;

    const r = BigInt("0x" + cleanHex.slice(0, 64));
    const s = BigInt("0x" + cleanHex.slice(64, 128));
    const v = Number("0x" + cleanHex.slice(128, 130));

    return { r, s, v };
  }

  static recoverPublicKey(
    msgDigest: string,
    r: bigint,
    s: bigint,
    v: number,
  ): { x: bigint; y: bigint } {
    const signature =
      "0x" +
      (r.toString(16).padStart(64, "0") +
        s.toString(16).padStart(64, "0") +
        v.toString(16).padStart(2, "0"));
    const recoveredPublicKey = SigningKey.recoverPublicKey(
      msgDigest,
      signature,
    );
    return hexToPoint(recoveredPublicKey);
  }

  static publicKeyToAddress(publicKey: { x: bigint; y: bigint }): string {
    const xHex = AbiEncoder.numberToPaddedHex(publicKey.x);
    const yHex = AbiEncoder.numberToPaddedHex(publicKey.y);

    const publicKeyHash = Keccak256.hash("0x" + xHex + yHex);
    const signer = "0x" + publicKeyHash.slice(-40);

    return signer;
  }

  static recoverSigner(
    signature: string,
    typedPermitDigest: string,
    testator: string,
  ): boolean {
    const { r, s, v } = this.decodeSignature(signature);
    console.log("typedPermitDigest:", typedPermitDigest);
    console.log("r:", r);
    console.log("s:", s);
    console.log("v:", v);

    const recoveredPublicKey = this.recoverPublicKey(
      typedPermitDigest,
      r,
      s,
      v,
    );
    const signer = this.publicKeyToAddress(recoveredPublicKey);
    return signer.toLowerCase() == testator.toLowerCase();
  }

  static verifyPermit(
    testator: string,
    estates: { token: string; amount: bigint }[],
    nonce: bigint,
    deadline: number,
    spender: string,
    signature: string,
  ): boolean {
    const permitted = estates.map((estate) => ({
      token: estate.token,
      amount: estate.amount,
    }));
    const permitDigest = this.hashPermit(
      {
        permitted,
        nonce,
        deadline,
      },
      spender,
    );
    const typedPermitDigest = this.hashTypedData(permitDigest);
    return this.recoverSigner(signature, typedPermitDigest, testator);
  }
}

class Permit2Verification {
  static testPermitVerification() {
    console.log(chalk.cyan("\n=== Permit verification testing ==="));

    const testator = "0x871F339373430f7F0FCfa092C3449B884984E41a";
    const permitted: { token: string; amount: bigint }[] = [
      {
        token: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
        amount: 1000n,
      },
      {
        token: "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E",
        amount: 5000000n,
      },
    ];
    const will = "0x80515F00edB3D90891D6494b63a58Dc06543bEF0";
    const nonce = 139895343447235933714306105636108089805n;
    const deadline = 1788798363;
    const signature =
      "0x8792602093a4f8d68e2fa48bf50cd105c45f95f6a614ed3632737ee9c4ae75a2081cb24113bfec49fbf8e52236f132bc292a15f82e6f475cccf0e2846b26c8861c";

    const isValid = Permit2.verifyPermit(
      testator,
      permitted,
      nonce,
      deadline,
      will,
      signature,
    );

    console.log(chalk.yellow("\nInput parameters:"));
    console.log(chalk.gray("testator:"), testator);
    console.log(chalk.gray("estates:"));
    permitted.forEach((estate, index) => {
      console.log(chalk.gray(`  [${index}]:`));
      console.log(chalk.gray("    token:"), estate.token);
      console.log(chalk.gray("    amount:"), estate.amount.toString());
    });
    console.log(chalk.gray("will:"), will);
    console.log(chalk.gray("nonce:"), nonce);
    console.log(chalk.gray("deadline:"), deadline);
    console.log(chalk.gray("signature:"), signature, isValid ? "✅" : "❌");

    return isValid;
  }

  static runAllTests(): boolean {
    const permitPassed = this.testPermitVerification();
    const allPassed = permitPassed;

    console.log("\n📊 Complete Test Summary:");
    console.log("Permit verification:", permitPassed ? "✅" : "❌");

    console.log(
      "\nOverall status:",
      allPassed ? "🎉 All tests passed!" : "❌  Issues need debugging",
    );

    return allPassed;
  }
}

if (
  typeof process !== "undefined" &&
  process.argv?.[1] &&
  process.argv[1].endsWith("permitVerify.ts")
) {
  Permit2Verification.runAllTests();
}

export { Permit2, Permit2Verification };
