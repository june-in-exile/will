import { ethers } from "ethers";
import chalk from "chalk";

/**
 * ECDSA Implementation for secp256k1 curve
 * This is an educational implementation - DO NOT use in production
 */

/**
 * secp256k1 curve parameters
 */
const CURVE = {
    // Field prime: 2^256 - 2^32 - 977
    p: 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn,
    // Curve parameter a (y^2 = x^3 + ax + b)
    a: 0n,
    // Curve parameter b
    b: 7n,
    // Order of the base point
    n: 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n,
    // Base point G coordinates
    Gx: 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n,
    Gy: 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n
};

/**
 * Point on elliptic curve
 */
interface Point {
    x: bigint;
    y: bigint;
    isInfinity: boolean;
}

/**
 * ECDSA Utility functions for mathematical operations
 */
class ECDSAUtils {
    /**
     * Modular arithmetic - ensures result is positive
     */
    static mod(a: bigint, m: bigint): bigint {
        return ((a % m) + m) % m;
    }

    /**
     * Modular inverse using Extended Euclidean Algorithm
     */
    static modInverse(a: bigint, m: bigint): bigint {
        if (a < 0n) a = this.mod(a, m);
        let [oldR, r] = [a, m];
        let [oldS, s] = [1n, 0n];

        while (r !== 0n) {
            const quotient = oldR / r;
            [oldR, r] = [r, oldR - quotient * r];
            [oldS, s] = [s, oldS - quotient * s];
        }

        return this.mod(oldS, m);
    }

    /**
     * Elliptic curve point addition
     */
    static pointAdd(p1: Point, p2: Point): Point {
        if (p1.isInfinity) return p2;
        if (p2.isInfinity) return p1;

        if (p1.x === p2.x) {
            if (p1.y === p2.y) {
                return this.pointDouble(p1);
            } else {
                return { x: 0n, y: 0n, isInfinity: true };
            }
        }

        const dx = this.mod(p2.x - p1.x, CURVE.p);
        const dy = this.mod(p2.y - p1.y, CURVE.p);
        const slope = this.mod(dy * this.modInverse(dx, CURVE.p), CURVE.p);

        const x3 = this.mod(slope * slope - p1.x - p2.x, CURVE.p);
        const y3 = this.mod(slope * (p1.x - x3) - p1.y, CURVE.p);

        return { x: x3, y: y3, isInfinity: false };
    }

    /**
     * Elliptic curve point doubling
     */
    static pointDouble(p: Point): Point {
        if (p.isInfinity) return p;

        const numerator = this.mod(3n * p.x * p.x + CURVE.a, CURVE.p);
        const denominator = this.mod(2n * p.y, CURVE.p);
        const slope = this.mod(
            numerator * this.modInverse(denominator, CURVE.p),
            CURVE.p,
        );

        const x3 = this.mod(slope * slope - 2n * p.x, CURVE.p);
        const y3 = this.mod(slope * (p.x - x3) - p.y, CURVE.p);

        return { x: x3, y: y3, isInfinity: false };
    }

    /**
     * Elliptic curve scalar multiplication using double-and-add
     */
    static pointMultiply(k: bigint, p: Point): Point {
        if (k === 0n) return { x: 0n, y: 0n, isInfinity: true };
        if (k === 1n) return p;

        let result: Point = { x: 0n, y: 0n, isInfinity: true };
        let addend = p;

        while (k > 0n) {
            if (k % 2n === 1n) {
                result = this.pointAdd(result, addend);
            }
            addend = this.pointDouble(addend);
            k = k >> 1n;
        }

        return result;
    }

    /**
     * Generate cryptographically secure random BigInt
     */
    static generateRandomBigInt(max: bigint): bigint {
        const bytes = new Uint8Array(32);
        crypto.getRandomValues(bytes);

        let result = 0n;
        for (let i = 0; i < bytes.length; i++) {
            result = (result << 8n) + BigInt(bytes[i]);
        }

        return this.mod(result, max - 1n) + 1n;
    }

    /**
     * Convert BigInt to hex string with padding
     */
    static bigIntToHex(value: bigint, length: number = 64): string {
        return "0x" + value.toString(16).padStart(length, "0");
    }

    /**
     * Hash function using Keccak256 (as used by Ethereum)
     */
    static hashMessage(message: string | Uint8Array): bigint {
        const messageBytes =
            typeof message === "string" ? new TextEncoder().encode(message) : message;
        const hash = ethers.keccak256(messageBytes);
        return BigInt(hash);
    }
}

/**
 * ECDSA Implementation
 */
class ECDSA {
    private static G: Point = {
        x: CURVE.Gx,
        y: CURVE.Gy,
        isInfinity: false,
    };

    static generateKeyPair(): { privateKey: bigint; publicKey: Point } {
        // Generate random private key
        const privateKey = ECDSAUtils.generateRandomBigInt(CURVE.n);
        const publicKey = ECDSAUtils.pointMultiply(privateKey, this.G);

        return { privateKey, publicKey };
    }

    static sign(
        messageHash: bigint,
        privateKey: bigint,
    ): { r: bigint; s: bigint } {
        let r = 0n,
            s = 0n;

        while (r === 0n || s === 0n) {
            // Generate random k
            const k = ECDSAUtils.generateRandomBigInt(CURVE.n);

            // Calculate r = (k * G).x mod n
            const kG = ECDSAUtils.pointMultiply(k, this.G);
            r = ECDSAUtils.mod(kG.x, CURVE.n);

            if (r === 0n) continue;

            // Calculate s = k^(-1) * (hash + r * privateKey) mod n
            const kInv = ECDSAUtils.modInverse(k, CURVE.n);
            s = ECDSAUtils.mod(
                kInv * (messageHash + ECDSAUtils.mod(r * privateKey, CURVE.n)),
                CURVE.n,
            );
        }

        return { r, s };
    }

    static verify(
        messageHash: bigint,
        signature: { r: bigint; s: bigint },
        publicKey: Point,
    ): boolean {
        const { r, s } = signature;

        // Check signature bounds
        if (r <= 0n || r >= CURVE.n || s <= 0n || s >= CURVE.n) {
            return false;
        }

        // Calculate w = s^(-1) mod n
        const w = ECDSAUtils.modInverse(s, CURVE.n);

        // Calculate u1 = hash * w mod n
        const u1 = ECDSAUtils.mod(messageHash * w, CURVE.n);

        // Calculate u2 = r * w mod n
        const u2 = ECDSAUtils.mod(r * w, CURVE.n);

        // Calculate point = u1 * G + u2 * publicKey
        const u1G = ECDSAUtils.pointMultiply(u1, this.G);
        const u2P = ECDSAUtils.pointMultiply(u2, publicKey);
        const point = ECDSAUtils.pointAdd(u1G, u2P);

        if (point.isInfinity) return false;

        // Verify r == point.x mod n
        return ECDSAUtils.mod(point.x, CURVE.n) === r;
    }

}


/**
 * ECDSA Verification Test Suite
 */
class ECDSAVerification {
    /**
     * Test basic ECDSA signing and verification
     */
    static testBasicSigningAndVerification(): boolean {
        console.log(
            chalk.cyan("\n=== Basic ECDSA signing and verification ==="),
        );

        let allPassed = true;

        try {
            const keyPair = ECDSA.generateKeyPair();
            const message = "Hello, ECDSA!";
            const messageHash = ECDSAUtils.hashMessage(message);

            const signature = ECDSA.sign(messageHash, keyPair.privateKey);
            const isValid = ECDSA.verify(messageHash, signature, keyPair.publicKey);

            console.log(`Signature valid: ${isValid ? "✅" : "❌"}`);
            console.log(`Private key: ${ECDSAUtils.bigIntToHex(keyPair.privateKey)}`);
            console.log(
                `Public key: (${ECDSAUtils.bigIntToHex(keyPair.publicKey.x)}, ${ECDSAUtils.bigIntToHex(keyPair.publicKey.y)})`,
            );
            console.log(
                `Signature: r=${ECDSAUtils.bigIntToHex(signature.r)}, s=${ECDSAUtils.bigIntToHex(signature.s)}`,
            );

            allPassed = allPassed && isValid;
        } catch (err) {
            console.log("❌ Error in basic signing test:", String(err));
            allPassed = false;
        }

        return allPassed;
    }

    /**
     * Test invalid signature rejection
     */
    static testInvalidSignatureRejection(): boolean {
        console.log(
            chalk.cyan("\n=== Invalid signature rejection testing ==="),
        );

        let allPassed = true;

        try {
            const keyPair = ECDSA.generateKeyPair();
            const message = "Test message";
            const messageHash = ECDSAUtils.hashMessage(message);

            const signature = ECDSA.sign(messageHash, keyPair.privateKey);

            // Test 1: Modified signature should fail
            const invalidSignature1 = { r: signature.r, s: signature.s + 1n };
            const isInvalid1 = ECDSA.verify(
                messageHash,
                invalidSignature1,
                keyPair.publicKey,
            );
            console.log(`Modified signature rejected: ${!isInvalid1 ? "✅" : "❌"}`);
            allPassed = allPassed && !isInvalid1;

            // Test 2: Wrong message hash should fail
            const wrongHash = ECDSAUtils.hashMessage("Different message");
            const isInvalid2 = ECDSA.verify(wrongHash, signature, keyPair.publicKey);
            console.log(`Wrong message hash rejected: ${!isInvalid2 ? "✅" : "❌"}`);
            allPassed = allPassed && !isInvalid2;

            // Test 3: Wrong public key should fail
            const wrongKeyPair = ECDSA.generateKeyPair();
            const isInvalid3 = ECDSA.verify(
                messageHash,
                signature,
                wrongKeyPair.publicKey,
            );
            console.log(`Wrong public key rejected: ${!isInvalid3 ? "✅" : "❌"}`);
            allPassed = allPassed && !isInvalid3;
        } catch (err) {
            console.log("❌ Error in invalid signature test:", String(err));
            allPassed = false;
        }

        return allPassed;
    }

    /**
     * Test multiple signatures consistency
     */
    static testMultipleSignatures(): boolean {
        console.log(
            chalk.cyan("\n=== Multiple signatures consistency testing ==="),
        );

        let allPassed = true;

        try {
            const keyPair = ECDSA.generateKeyPair();
            let allValid = true;

            for (let i = 0; i < 10; i++) {
                const testMessage = `Test message ${i}`;
                const testHash = ECDSAUtils.hashMessage(testMessage);
                const testSig = ECDSA.sign(testHash, keyPair.privateKey);
                const testValid = ECDSA.verify(testHash, testSig, keyPair.publicKey);

                if (!testValid) {
                    console.log(`❌ Signature ${i} failed verification`);
                }

                allValid = allValid && testValid;
            }

            console.log(`All signatures valid: ${allValid ? "✅" : "❌"}`);
            allPassed = allPassed && allValid;
        } catch (err) {
            console.log("❌ Error in multiple signatures test:", String(err));
            allPassed = false;
        }

        return allPassed;
    }

    /**
     * Test ethers.js compatibility and algorithm correctness
     */
    static testEthersCompatibility(): boolean {
        console.log(
            chalk.cyan("\n=== Ethers.js algorithm correctness verification ==="),
        );

        let allPassed = true;

        try {
            // Test 1: Cross-validation with known private key
            console.log("\n  Test 1: Cross-validation with fixed private key");
            const fixedPrivateKey = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdefn;
            const privateKeyHex = ECDSAUtils.bigIntToHex(fixedPrivateKey);

            // Create ethers wallet from the same private key
            const ethersWallet = new ethers.Wallet(privateKeyHex);

            // Get ethers public key
            const ethersPublicKey = ethersWallet.signingKey.publicKey;

            // parse ethers public key by removing '04' prefix
            const ethersX = BigInt('0x' + ethersPublicKey.slice(4, 68));
            const ethersY = BigInt('0x' + ethersPublicKey.slice(68));

            // Generate public key with our implementation
            const ourPublicKey = ECDSAUtils.pointMultiply(fixedPrivateKey, {
                x: CURVE.Gx,
                y: CURVE.Gy,
                isInfinity: false
            });

            console.log(`    Our public key x:     ${ECDSAUtils.bigIntToHex(ourPublicKey.x, 64)}`);
            console.log(`    Ethers public key x:  ${ECDSAUtils.bigIntToHex(ethersX, 64)}`);
            console.log(`    Public key X match:   ${ourPublicKey.x === ethersX ? "✅" : "❌"}`);

            console.log(`    Our public key y:     ${ECDSAUtils.bigIntToHex(ourPublicKey.y, 64)}`);
            console.log(`    Ethers public key y:  ${ECDSAUtils.bigIntToHex(ethersY, 64)}`);
            console.log(`    Public key Y match:   ${ourPublicKey.y === ethersY ? "✅" : "❌"}`);

            const publicKeyMatch = (ourPublicKey.x === ethersX) && (ourPublicKey.y === ethersY);

            allPassed = allPassed && publicKeyMatch;

            // Test 2: Message signing comparison
            console.log("\n  Test 2: Message signing verification");
            const testMessages = [
                "Hello, ECDSA!",
                "Test message 123",
                "測試中文字符"
            ];

            for (const message of testMessages) {
                console.log(`\n    Testing message: "${message}"`);

                const messageHash = ECDSAUtils.hashMessage(message);
                console.log(`    Message hash: ${ECDSAUtils.bigIntToHex(messageHash, 64)}`);

                // Our signature
                const ourSignature = ECDSA.sign(messageHash, fixedPrivateKey);
                console.log(`    Our signature r: ${ECDSAUtils.bigIntToHex(ourSignature.r, 64)}`);
                console.log(`    Our signature s: ${ECDSAUtils.bigIntToHex(ourSignature.s, 64)}`);

                // Verify our signature with our implementation
                const ourVerification = ECDSA.verify(messageHash, ourSignature, ourPublicKey);
                console.log(`    Our verification: ${ourVerification ? "✅" : "❌"}`);
                allPassed = allPassed && ourVerification;

                // Test signature format compatibility with ethers.js
                try {
                    // Verify message hash format
                    const messageBytes = new TextEncoder().encode(message);
                    const ethersMessageHash = ethers.keccak256(messageBytes);
                    const hashMatch = ethersMessageHash === ECDSAUtils.bigIntToHex(messageHash, 64);
                    console.log(`    Hash compatibility: ${hashMatch ? "✅" : "❌"}`);
                    allPassed = allPassed && hashMatch;

                    if (!hashMatch) {
                        console.log(`    Ethers hash:  ${ethersMessageHash}`);
                        console.log(`    Our hash:     ${ECDSAUtils.bigIntToHex(messageHash, 64)}`);
                    }

                } catch (ethersErr) {
                    console.log(`    Ethers signature test: ⚠️  ${String(ethersErr)}`);
                }
            }

            // Test 3: Key generation consistency
            console.log("\n  Test 3: Public key derivation verification");

            // Test multiple known private keys
            const testPrivateKeys = [
                0x1n,
                0x2n,
                0x3n,
                0xdeadbeefn,
                0x123456789abcdef0n
            ];

            for (const privKey of testPrivateKeys) {
                const ourPubKey = ECDSAUtils.pointMultiply(privKey, {
                    x: CURVE.Gx,
                    y: CURVE.Gy,
                    isInfinity: false
                });

                // Verify point is on curve
                const left = ECDSAUtils.mod(ourPubKey.y * ourPubKey.y, CURVE.p);
                const right = ECDSAUtils.mod(ourPubKey.x * ourPubKey.x * ourPubKey.x + CURVE.b, CURVE.p);
                const onCurve = left === right;

                console.log(`    Private key ${ECDSAUtils.bigIntToHex(privKey, 8)}: ${onCurve ? "✅" : "❌"} (on curve)`);
                allPassed = allPassed && onCurve;
            }

        } catch (err) {
            console.log("❌ Ethers.js compatibility error:", String(err));
            allPassed = false;
        }

        return allPassed;
    }

    /**
     * Test curve parameters and boundary conditions
     */
    static testBoundaryConditions(): boolean {
        console.log(
            chalk.cyan("\n=== ECDSA boundary conditions testing ==="),
        );

        let allPassed = true;

        try {
            // Test with edge case messages
            const testCases = [
                { name: "Empty message", message: "" },
                { name: "Single character", message: "A" },
                { name: "Long message", message: "A".repeat(1000) },
                { name: "Unicode message", message: "測試中文🎉" },
            ];

            for (const { name, message } of testCases) {
                console.log(`\n  Testing ${name}:`);

                const keyPair = ECDSA.generateKeyPair();
                const messageHash = ECDSAUtils.hashMessage(message);
                const signature = ECDSA.sign(messageHash, keyPair.privateKey);
                const isValid = ECDSA.verify(messageHash, signature, keyPair.publicKey);

                console.log(`    ${name}: ${isValid ? "✅" : "❌"}`);
                allPassed = allPassed && isValid;
            }
        } catch (err) {
            console.log("❌ Error in boundary conditions test:", String(err));
            allPassed = false;
        }

        return allPassed;
    }

    /**
     * Run all ECDSA tests
     */
    static runAllTests(): boolean {
        console.log(chalk.yellow("🧪 Running ECDSA Test Suite...\n"));

        const basicTestPassed = this.testBasicSigningAndVerification();
        const invalidTestPassed = this.testInvalidSignatureRejection();
        const multipleTestPassed = this.testMultipleSignatures();
        const ethersTestPassed = this.testEthersCompatibility();
        const boundaryTestPassed = this.testBoundaryConditions();

        console.log("\n📊 Complete Test Summary:");
        console.log("Basic signing & verification:", basicTestPassed ? "✅" : "❌");
        console.log("Invalid signature rejection:", invalidTestPassed ? "✅" : "❌");
        console.log("Multiple signatures:", multipleTestPassed ? "✅" : "❌");
        console.log("Ethers.js compatibility:", ethersTestPassed ? "✅" : "❌");
        console.log("Boundary conditions:", boundaryTestPassed ? "✅" : "❌");

        const allPassed =
            basicTestPassed && invalidTestPassed && multipleTestPassed && ethersTestPassed && boundaryTestPassed;

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
    process.argv[1].endsWith("ecdsa.ts")
) {
    ECDSAVerification.runAllTests();
}

export { ECDSA, ECDSAUtils, ECDSAVerification };
export type { Point };