// import { Keccak256, ECDSAUtils } from "./index.js";
// import { Point } from "../../type/index.js";
// import { concatBigInts } from "../../util/conversion.js";
import { AbiCoder, solidityPacked } from "ethers";
import chalk from "chalk";

/*
 * An simplified version of ethers.abiCoder that only encodes 'bytes', 'bytes32', 'address', and 'uint256'
 * Supports both unpacked ('bytes' excluded) and packed encoding. Arrays or objects are not supported.
 */
class AbiEncoder {
    static readonly supportedTypes = ["bytes", "bytes32", "address", "uint256"];

    // Pad hex string to 32 bytes (64 hex chars)
    private static padHex(hex: string): string {
        const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
        return cleanHex.padStart(64, "0");
    }

    static encode(types: string[], values: any[], packed: boolean = false): string {
        if (types.length !== values.length) {
            throw new Error("Length of types and values are not equal");
        }
        let result = "0x";

        for (let i = 0; i < values.length; i++) {
            const type = types[i];
            const value = values[i];

            if (!AbiEncoder.supportedTypes.includes(type)) {
                throw new Error(`Unsupported type: ${type}. Supported types: ${AbiEncoder.supportedTypes.join(", ")}`);
            }

            let hex;

            if (type === "uint256") {
                hex = this.padHex(BigInt(value).toString(16));
            } else {
                hex = value.startsWith("0x") ? value.slice(2) : value;
            }

            if (!packed) {
                result += this.padHex(hex)
            } else {
                result += hex;
            }
        }
        return result;
    }

    // static ecrecover(
    //     messageHash: bigint[],
    //     v: number,
    //     r: bigint[],
    //     s: bigint[],
    // ): bigint {
    //     try {
    //         // Calculate recovery ID
    //         let recoveryId = v;
    //         if (v === 27 || v === 28) {
    //             recoveryId = v - 27;
    //         } else if (v > 28) {
    //             // EIP-155: v = recovery_id + 35 + 2 * chain_id
    //             recoveryId = (v - 35) % 2;
    //         }

    //         const publicKey = ECDSAUtils.recoverPublicKey(
    //             concatBigInts(messageHash),
    //             { r: concatBigInts(r), s: concatBigInts(s) },
    //             recoveryId,
    //         );

    //         if (!publicKey || publicKey.isInfinity) {
    //             return 0n;
    //         }

    //         // Convert public key to address
    //         const address = this.publicKeyToAddress(publicKey);
    //         return address;
    //     } catch {
    //         return 0n;
    //     }
    // }

    // private static publicKeyToAddress(publicKey: Point): bigint {
    //     // Convert coordinates to hex (remove 0x prefix, pad to 64 chars)
    //     const xHex = publicKey.x.toString(16).padStart(64, "0");
    //     const yHex = publicKey.y.toString(16).padStart(64, "0");

    //     // Concatenate x and y coordinates (uncompressed format without 0x04 prefix)
    //     const publicKeyHex = xHex + yHex;

    //     // Hash with keccak256 and take last 20 bytes
    //     const publicKeyHash = Keccak256.hash(publicKeyHex);

    //     return BigInt("0x" + publicKeyHash.slice(-40));
    // }
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

function abiEncoderVerification() {
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

if (
    typeof process !== "undefined" &&
    process.argv?.[1] &&
    process.argv[1].endsWith("abiEncoder.ts")
) {
    abiEncoderVerification();
}

export { AbiEncoder };
