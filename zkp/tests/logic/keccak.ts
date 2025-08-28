import { ethers } from "ethers";
import chalk from "chalk";

class KeccakUtils {
    static bytesToHex(bytes: Buffer): string {
        return bytes.toString("hex");
    }

    static hexToBytes(hex: string): Buffer {
        return Buffer.from(hex, "hex");
    }

    static xor(a: Buffer, b: Buffer): Buffer {
        const result = Buffer.alloc(Math.min(a.length, b.length));
        for (let i = 0; i < result.length; i++) {
            result[i] = a[i] ^ b[i];
        }
        return result;
    }

    static u32ToBytes(value: number): Buffer {
        const buffer = Buffer.alloc(4);
        buffer.writeUInt32BE(value, 0);
        return buffer;
    }

    static bytesToU32(bytes: Buffer, offset: number = 0): number {
        return bytes.readUInt32BE(offset);
    }

    static randomBytes(length: number): Buffer {
        return Buffer.from(crypto.getRandomValues(new Uint8Array(length)));
    }

    static bytesToBase64(bytes: Buffer): string {
        return bytes.toString("base64");
    }

    static base64ToBytes(base64: string): Buffer {
        return Buffer.from(base64, "base64");
    }

    static stringToBytes(str: string): Buffer {
        return Buffer.from(str, "utf8");
    }

    static bytesToString(bytes: Buffer): string {
        return bytes.toString("utf8");
    }
}

class Keccak {
    static hash(inputBytes: Buffer): string {
        // Rnd(stateArray, roundIndex):
        //    stateArray1 = xorBitsWithColumnParities(stateArray)
        //    stateArray2 = rotateLaneByOffset(stateArray1)
        //    stateArray3 = rearrangeLanes(stateArray2)
        //    stateArray4 = xorBitsWithNonLinear(stateArray3)
        //    stateArray5 = modifyCenterLaneByRoundIndex(stateArray4, roundIndex)

        // KeccakPermutation(b: width of permutation, numberOfRounds, S: string of length b)
        //    stateArray = stringToStateArray(S)
        //    for roundIndex from 12 + 2l - numberOfRounds to 12 + 2l - 1:
        //        stateArray = Rnd(stateArray, roundIndex)
        //    S' = stateArrayToString(stateArray)
        //    return S'

        return digest;
    }
}

class KeccakVerification {
    static testKeccak256(): boolean {
        console.log(
            chalk.cyan(
                "\n=== Ether module Keccak256 hash verification ===",
            )
        );

        // Test data
        const input = "Hello World!";
        console.log(`\nTest data: ${input}`);

        const inputBytes = KeccakUtils.stringToBytes(input);

        const tergetDigest = ethers.keccak256(inputBytes);
        console.log(
            "Ether:",
            tergetDigest,
        );

        const digest = Keccak.hash(inputBytes);
        const isEqual = (digest == tergetDigest);

        console.log(
            "Our implementation:",
            digest,
            isEqual ? "✅" : "❌",
        );

        return isEqual;
    }

    static runAllTests(): boolean {
        const kecccak256Passed = this.testKeccak256();


        console.log("\n📊 Complete Test Summary:");
        console.log("Keccak256:", kecccak256Passed ? "✅" : "❌");


        const allPassed =
            kecccak256Passed;

        console.log(
            "Overall status:",
            allPassed ? "🎉 All tests passed!" : "⚠️  Issues need debugging",
        );

        return allPassed;
    }
}

if (
    typeof process !== "undefined" &&
    process.argv?.[1] &&
    process.argv[1].endsWith("keccak.ts")
) {
    KeccakVerification.runAllTests();
}

export {
    KeccakUtils,
    KeccakVerification,
}