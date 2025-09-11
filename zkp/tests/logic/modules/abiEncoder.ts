import { AbiCoder, solidityPacked } from "ethers";
import chalk from "chalk";

/*
 * An simplified version of ethers.abiCoder that only encodes 'bytes', 'bytes32', 'address', and 'uint256'
 * Supports both unpacked ('bytes' excluded) and packed encoding. Arrays or objects are not supported.
 */
class AbiEncoder {
  static readonly supportedTypes = ["bytes", "bytes32", "address", "uint256"];

  // Pad hex string to given bytes (default: 32 bytes = 64 hex chars)
  static padHex(hex: string, bytes: number = 32): string {
    const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
    return cleanHex.padStart(bytes * 2, "0");
  }

  // Convert number to hex string with padding
  static numberToPaddedHex(value: number | bigint, bytes: number = 32): string {
    const hex = BigInt(value).toString(16);
    return this.padHex(hex, bytes);
  }

  static encode(
    types: string[],
    values: any[],
    packed: boolean = false,
  ): string {
    if (types.length !== values.length) {
      throw new Error("Length of types and values are not equal");
    }
    let result = "0x";

    for (let i = 0; i < values.length; i++) {
      const type = types[i];
      const value = values[i];

      if (!AbiEncoder.supportedTypes.includes(type)) {
        throw new Error(
          `Unsupported type: ${type}. Supported types: ${AbiEncoder.supportedTypes.join(", ")}`,
        );
      }

      let hex;
      
      if (type === "uint256") {
        hex = this.numberToPaddedHex(value);
      } else {
        hex = value.startsWith("0x") ? value.slice(2) : value;
      }

      if (!packed) {
        result += this.padHex(hex);
      } else {
        result += hex;
      }
    }
    return result;
  }
}

function truncateHex(hex: string) {
  if (hex.length <= 62) return `${hex} (${hex.length} chars)`;
  return `${hex.slice(0, 42)}...${hex.slice(-20)} (${hex.length} chars)`;
}

function validateEncoding(
  abiCoder: AbiCoder,
  types: string[],
  values: any[],
): boolean {
  let allPessed = true;

  if (values.length === 0) {
    throw new Error("At least one value is required");
  }

  console.log(`\nInputs  : ${values.join(", ")}`);
  console.log(`Types   : ${types.join(", ")}`);

  const ethersEncoded = abiCoder.encode(types, values);
  const encoded = AbiEncoder.encode(types, values);
  const encodedMatches = ethersEncoded.toLowerCase() === encoded.toLowerCase();

  const ethersEncodedPacked = solidityPacked(types, values);
  const encodedPacked = AbiEncoder.encode(types, values, true);
  const encodedPackedMatches =
    ethersEncodedPacked.toLowerCase() === encodedPacked.toLowerCase();

  console.log(chalk.gray("/* Unpacked */"));
  console.log(
    "Ethers  :",
    encodedMatches ? truncateHex(ethersEncoded) : ethersEncoded,
  );
  console.log(
    "Our impl:",
    encodedMatches ? truncateHex(encoded) : encoded,
    encodedMatches ? "✅" : "❌",
  );

  console.log(chalk.gray("/* Packed */"));
  console.log(
    "Ethers  :",
    encodedPackedMatches
      ? truncateHex(ethersEncodedPacked)
      : ethersEncodedPacked,
  );
  console.log(
    "Our impl:",
    encodedPackedMatches ? truncateHex(encodedPacked) : encodedPacked,
    encodedPackedMatches ? "✅" : "❌",
  );

  allPessed = allPessed && encodedMatches;
  allPessed = allPessed && encodedPackedMatches;

  return allPessed;
}

class AbiEncoderVerification {
  static runAllTests() {
    const abiCoder = AbiCoder.defaultAbiCoder();

    let allPassed = true;

    console.log(chalk.cyan("\n=== Single element encoding ==="));
    allPassed =
      allPassed &&
      validateEncoding(abiCoder, ["uint256"], [BigInt("1000000000000000000")]);
    allPassed =
      allPassed &&
      validateEncoding(
        abiCoder,
        ["bytes32"],
        ["0x618358ac3db8dc274f0cd8829da7e234bd48cd73c4a740aede1adec9846d06a1"],
      );
    allPassed =
      allPassed &&
      validateEncoding(
        abiCoder,
        ["address"],
        ["0x742d35cc6634c0532925a3b8d6ac68d2dc26e203"],
      );

    console.log(
      chalk.cyan("\n=== Multiple elements of the same type encoding ==="),
    );
    allPassed =
      allPassed &&
      validateEncoding(
        abiCoder,
        ["uint256", "uint256", "uint256"],
        [BigInt("1000000000000000000"), BigInt("2000000000000000000"), 1n],
      );
    allPassed =
      allPassed &&
      validateEncoding(
        abiCoder,
        ["bytes32", "bytes32"],
        [
          "0x618358ac3db8dc274f0cd8829da7e234bd48cd73c4a740aede1adec9846d06a1",
          "0xfcf35f5ac6a2c28868dc44c302166470266239195f02b0ee408334829333b766",
        ],
      );
    allPassed =
      allPassed &&
      validateEncoding(
        abiCoder,
        ["address", "address", "address"],
        [
          "0x742d35cc6634c0532925a3b8d6ac68d2dc26e203",
          "0x75faf114eafb1bdbe2f0316df893fd58ce46aa4d",
          "0xb1d4538b4571d411f07960ef2838ce337fe1e80e",
        ],
      );

    console.log(
      chalk.cyan("\n=== Multiple elements of mixed types encoding ==="),
    );

    allPassed =
      allPassed &&
      validateEncoding(
        abiCoder,
        ["bytes32", "address", "uint256"],
        [
          "0x618358ac3db8dc274f0cd8829da7e234bd48cd73c4a740aede1adec9846d06a1",
          "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
          1000n,
        ],
      );

    console.log(
      "\nOverall status:",
      allPassed ? "🎉 All tests passed!" : "❌  Issues need debugging",
    );
  }
}

if (
  typeof process !== "undefined" &&
  process.argv?.[1] &&
  process.argv[1].endsWith("abiEncoder.ts")
) {
  AbiEncoderVerification.runAllTests();
}

export { AbiEncoder, AbiEncoderVerification };
