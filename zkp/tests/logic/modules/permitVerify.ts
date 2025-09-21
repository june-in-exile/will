import { AbiEncoder } from "./abiEncoder.js";
import { Keccak256 } from "./keccak256.js";
import { ECDSAUtils } from "./ecdsa.js";
import chalk from "chalk";

class Permit2 {
  static readonly TOKEN_PERMISSIONS_TYPEHASH = Keccak256.hash(
    "TokenPermissions(address token,uint256 amount)",
  );
  // "0x618358ac3db8dc274f0cd8829da7e234bd48cd73c4a740aede1adec9846d06a1";
  static readonly PERMIT_BATCH_TRANSFER_FROM_TYPEHASH = Keccak256.hash(
    "PermitBatchTransferFrom(TokenPermissions[] permitted,address spender,uint256 nonce,uint256 deadline)TokenPermissions(address token,uint256 amount)",
  );
  // "0xfcf35f5ac6a2c28868dc44c302166470266239195f02b0ee408334829333b766";
  static readonly TYPE_HASH = Keccak256.hash(
    "EIP712Domain(string name,uint256 chainId,address verifyingContract)",
  );
  // 0x8cad95687ba82c2ce50e74f7b754645e5117c3a5bec8151c0726d5857980a866
  static readonly HASHED_NAME = Keccak256.hash("Permit2");
  // 0x9ac997416e8ff9d2ff6bebeb7149f65cdae5e32e2b90440b566bb3044041d36a

  static readonly PERMIT2_ADDRESS =
    "0x000000000022d473030f116ddee9f6b43ac78ba3";

  static DOMAIN_SEPARATOR(chainId: number): string {
    // if (chainId === 31337) {
    //   DOMAIN_SEPARATOR =
    //     "0x4d553c58ae79a6c4ba64f0e690a5d1cd2deff8c6b91cf38300e0f2b76f9ee346";
    // } else if (chainId === 421614) {
    //   // Arbitrum Sepolia
    //   DOMAIN_SEPARATOR =
    //     "0x97caedc57dcfc2ae625d68b894a8a814d7be09e29aa5321eebada2423410d9d0";
    // } else {
    //   // Mainnet
    //   DOMAIN_SEPARATOR =
    //     "0x866a5aba21966af95d6c7ab78eb2b2fc913915c28be3b9aa07cc04ff903e3f28";
    // }
    return Keccak256.hash(
      AbiEncoder.encode(
        ["bytes32", "bytes32", "uint256", "address"],
        [this.TYPE_HASH, this.HASHED_NAME, chainId, this.PERMIT2_ADDRESS],
      ),
    );
  }

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

  static hashTypedData(permitDigest: string, chainId: number = 31337): string {
    const DOMAIN_SEPARATOR = this.DOMAIN_SEPARATOR(chainId);
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
    msghash: string,
    r: bigint,
    s: bigint,
    v: number,
  ): { x: bigint; y: bigint } {
    const messageHash = BigInt(
      msghash.startsWith("0x") ? msghash : "0x" + msghash,
    );
    const signature = {
      r,
      s,
    };
    const recoveryId = v - 27;

    const recoveredPublicKey = ECDSAUtils.recoverPublicKey(
      messageHash,
      signature,
      recoveryId,
    );

    if (!recoveredPublicKey) {
      throw new Error("Failed to recover public key");
    }

    return recoveredPublicKey;
  }

  static publicKeyToAddress(publicKey: { x: bigint; y: bigint }): string {
    const xHex = AbiEncoder.numberToPaddedHex(publicKey.x);
    const yHex = AbiEncoder.numberToPaddedHex(publicKey.y);

    const publicKeyHash = Keccak256.hash("0x" + xHex + yHex);
    const signer = "0x" + publicKeyHash.slice(-40);

    return signer;
  }

  static recoverSigner(signature: string, typedPermitDigest: string): string {
    const { r, s, v } = this.decodeSignature(signature);

    const recoveredPublicKey = this.recoverPublicKey(
      typedPermitDigest,
      r,
      s,
      v,
    );

    const signer = this.publicKeyToAddress(recoveredPublicKey);
    return signer;
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
    const signer = this.recoverSigner(signature, typedPermitDigest);
    return testator.toLowerCase() === signer.toLowerCase();
  }
}

class Permit2Verification {
  static testPermitVerification() {
    console.log(chalk.cyan("\n=== Permit verification testing ==="));

    let allPassed = true;

    const testCases = [
      {
        testator: "0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc",
        permitted: [
          {
            token: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
            amount: 1000n,
          },
          {
            token: "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E",
            amount: 5000000n,
          },
        ],
        will: "0xCfD7d00d14F04c021cB76647ACe8976580B83D54",
        nonce: 307798376644172688526653206965886192621n,
        deadline: 1789652776,
        signature:
          "0xe2c3427d586d098f41d41f1a6c45dc61bc47bdf47ea0b74bbacee7e1fdaa8af873434b90e656c5332de72de6e9ede658973947bc497fa4edafd9789de84b38ef1b",
      },
      {
        testator: "0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc",
        permitted: [
          {
            token: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
            amount: 1000n,
          },
          {
            token: "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E",
            amount: 5000000n,
          },
        ],
        will: "0x80515F00edB3D90891D6494b63a58Dc06543bEF0",
        nonce: 139895343447235933714306105636108089805n,
        deadline: 1788798363,
        signature:
          "0x8792602093a4f8d68e2fa48bf50cd105c45f95f6a614ed3632737ee9c4ae75a2081cb24113bfec49fbf8e52236f132bc292a15f82e6f475cccf0e2846b26c8861c",
      },
    ];

    for (const {
      testator,
      permitted,
      will,
      nonce,
      deadline,
      signature,
    } of testCases) {
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

      allPassed = allPassed && isValid;
    }

    return allPassed;
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
