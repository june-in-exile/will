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
  p: 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn,
  // Curve parameter a (y^2 = x^3 + ax + b)
  a: 0n,
  // Curve parameter b
  b: 7n,
  // Order of the base point
  n: 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n,
  // Base point G coordinates
  Gx: 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
  Gy: 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n,
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

  /**
   * Modular exponentiation: base^exp mod m
   */
  static modPow(base: bigint, exp: bigint, mod: bigint): bigint {
    let result = 1n;
    base = base % mod;
    while (exp > 0n) {
      if (exp % 2n === 1n) {
        result = (result * base) % mod;
      }
      exp = exp >> 1n;
      base = (base * base) % mod;
    }
    return result;
  }

  /**
   * Convert ethers.js signature format to our format
   * Ethers format: "0x" + r(64) + s(64) + v(2)
   * Our format: { r: bigint, s: bigint }
   */
  static ethersSignatureToOurs(ethersSignature: string): {
    r: bigint;
    s: bigint;
  } {
    // Remove 0x prefix
    const sig = ethersSignature.slice(2);

    // Extract r and s (each 64 hex characters)
    const r = BigInt("0x" + sig.slice(0, 64));
    const s = BigInt("0x" + sig.slice(64, 128));

    return { r, s };
  }

  /**
   * Convert our signature format to ethers.js format
   * Note: This is incomplete as we need recovery ID (v)
   */
  static ourSignatureToEthers(
    signature: { r: bigint; s: bigint },
    v: number = 27,
  ): string {
    const r = signature.r.toString(16).padStart(64, "0");
    const s = signature.s.toString(16).padStart(64, "0");
    const vHex = v.toString(16).padStart(2, "0");

    return "0x" + r + s + vHex;
  }

  /**
   * Recover public key from signature and message hash
   * This is a proper implementation following the ECDSA recovery specification
   */
  static recoverPublicKey(
    messageHash: bigint,
    signature: { r: bigint; s: bigint },
    recoveryId: number,
  ): Point | null {
    try {
      const { r, s } = signature;

      // Recovery ID should be 0 or 1 for standard cases
      if (recoveryId < 0 || recoveryId > 1) {
        return null;
      }

      // Calculate recovery point R from r coordinate
      const x = r;

      // Calculate y coordinate from x: y² = x³ + 7 (mod p)
      const ySquared = this.mod(x * x * x + CURVE.b, CURVE.p);

      // Use Tonelli-Shanks algorithm for square root (simplified for secp256k1)
      // For secp256k1, p ≡ 3 (mod 4), so we can use: y = ±(y²)^((p+1)/4) mod p
      let y = this.modPow(ySquared, (CURVE.p + 1n) / 4n, CURVE.p);

      // Choose the correct y based on recovery ID
      // If recovery ID is odd, we want the odd y coordinate
      if (y % 2n !== BigInt(recoveryId)) {
        y = CURVE.p - y;
      }

      const R: Point = { x, y, isInfinity: false };

      // Verify R is on the curve
      const checkY = this.mod(R.y * R.y, CURVE.p);
      const checkX = this.mod(R.x * R.x * R.x + CURVE.b, CURVE.p);
      if (checkY !== checkX) {
        return null;
      }

      // Calculate public key: Q = r^(-1) * (s * R - e * G)
      const rInv = this.modInverse(r, CURVE.n);
      const sR = this.pointMultiply(s, R);
      // const eG = this.pointMultiply(messageHash, {
      //     x: CURVE.Gx,
      //     y: CURVE.Gy,
      //     isInfinity: false
      // });

      // Calculate s * R - e * G = s * R + (-e) * G
      const negE = this.mod(-messageHash, CURVE.n);
      const negEG = this.pointMultiply(negE, {
        x: CURVE.Gx,
        y: CURVE.Gy,
        isInfinity: false,
      });

      const temp = this.pointAdd(sR, negEG);
      const publicKey = this.pointMultiply(rInv, temp);

      return publicKey;
    } catch {
      return null;
    }
  }

  /**
   * Find the correct recovery ID for a signature
   * This tries recovery IDs 0 and 1 (standard cases) and returns the one that recovers the expected public key
   */
  static findRecoveryId(
    messageHash: bigint,
    signature: { r: bigint; s: bigint },
    expectedPublicKey: Point,
  ): number | null {
    // Try recovery IDs 0 and 1 (most common cases)
    for (let recoveryId = 0; recoveryId < 2; recoveryId++) {
      const recoveredKey = this.recoverPublicKey(
        messageHash,
        signature,
        recoveryId,
      );
      if (
        recoveredKey &&
        recoveredKey.x === expectedPublicKey.x &&
        recoveredKey.y === expectedPublicKey.y
      ) {
        return recoveryId;
      }
    }
    return null;
  }

  /**
   * Normalize signature to canonical form (s <= n/2)
   * This prevents signature malleability attacks
   */
  static normalizeSignature(signature: { r: bigint; s: bigint }): {
    r: bigint;
    s: bigint;
  } {
    const { r, s } = signature;
    const halfN = CURVE.n / 2n;

    // If s > n/2, use n - s instead (canonical form)
    if (s > halfN) {
      return { r, s: CURVE.n - s };
    }

    return { r, s };
  }

  /**
   * Convert our signature format to ethers.js format with correct recovery ID
   * This is a simplified version that should work correctly
   */
  static ourSignatureToEthersWithRecovery(
    signature: { r: bigint; s: bigint },
    messageHash: bigint,
    expectedPublicKey: Point,
  ): string | null {
    // Normalize the signature to canonical form
    const normalizedSignature = this.normalizeSignature(signature);

    // Try both recovery IDs with the normalized signature
    for (let recoveryId = 0; recoveryId < 2; recoveryId++) {
      try {
        const recoveredKey = this.recoverPublicKey(
          messageHash,
          normalizedSignature,
          recoveryId,
        );
        if (
          recoveredKey &&
          recoveredKey.x === expectedPublicKey.x &&
          recoveredKey.y === expectedPublicKey.y
        ) {
          const r = normalizedSignature.r.toString(16).padStart(64, "0");
          const s = normalizedSignature.s.toString(16).padStart(64, "0");
          const v = (recoveryId + 27).toString(16).padStart(2, "0");

          return "0x" + r + s + v;
        }
      } catch {
        continue;
      }
    }

    return null;
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

    // Normalize signature to canonical form (s <= n/2)
    return ECDSAUtils.normalizeSignature({ r, s });
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

    // Try verification with original signature first
    if (this.verifyWithSignature(messageHash, { r, s }, publicKey)) {
      return true;
    }

    // If that fails, try with normalized signature
    const normalized = ECDSAUtils.normalizeSignature({ r, s });
    if (normalized.s !== s) {
      return this.verifyWithSignature(messageHash, normalized, publicKey);
    }

    return false;
  }

  private static verifyWithSignature(
    messageHash: bigint,
    signature: { r: bigint; s: bigint },
    publicKey: Point,
  ): boolean {
    const { r, s } = signature;

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
    console.log(chalk.cyan("\n=== Basic ECDSA signing and verification ==="));

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
    console.log(chalk.cyan("\n=== Invalid signature rejection testing ==="));

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
  static async testEthersCompatibility(): Promise<boolean> {
    console.log(
      chalk.cyan("\n=== Ethers.js algorithm correctness verification ==="),
    );

    let allPassed = true;

    try {
      // Test 1: Cross-validation with known private key
      console.log("\n  Test 1: Cross-validation with fixed private key");
      const fixedPrivateKey =
        0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdefn;
      const privateKeyHex = ECDSAUtils.bigIntToHex(fixedPrivateKey);

      // Create ethers wallet from the same private key
      const ethersWallet = new ethers.Wallet(privateKeyHex);

      // Get ethers public key
      const ethersPublicKey = ethersWallet.signingKey.publicKey;

      // Parse ethers public key by removing '04' prefix
      const ethersX = BigInt("0x" + ethersPublicKey.slice(4, 68));
      const ethersY = BigInt("0x" + ethersPublicKey.slice(68));

      // Generate public key with our implementation
      const ourPublicKey = ECDSAUtils.pointMultiply(fixedPrivateKey, {
        x: CURVE.Gx,
        y: CURVE.Gy,
        isInfinity: false,
      });

      console.log(
        `    Our public key x:     ${ECDSAUtils.bigIntToHex(ourPublicKey.x, 64)}`,
      );
      console.log(
        `    Ethers public key x:  ${ECDSAUtils.bigIntToHex(ethersX, 64)}`,
      );
      console.log(
        `    Public key X match:   ${ourPublicKey.x === ethersX ? "✅" : "❌"}`,
      );

      console.log(
        `    Our public key y:     ${ECDSAUtils.bigIntToHex(ourPublicKey.y, 64)}`,
      );
      console.log(
        `    Ethers public key y:  ${ECDSAUtils.bigIntToHex(ethersY, 64)}`,
      );
      console.log(
        `    Public key Y match:   ${ourPublicKey.y === ethersY ? "✅" : "❌"}`,
      );

      const publicKeyMatch =
        ourPublicKey.x === ethersX && ourPublicKey.y === ethersY;
      allPassed = allPassed && publicKeyMatch;

      // Test 2: Cross-validation of signatures
      console.log("\n  Test 2: Cross-validation of signatures");
      const testMessages = [
        "Hello, ECDSA!",
        "Test message 123",
        "測試中文字符",
      ];

      for (const message of testMessages) {
        console.log(`\n    Testing message: "${message}"`);

        const messageHash = ECDSAUtils.hashMessage(message);
        console.log(
          `    Message hash: ${ECDSAUtils.bigIntToHex(messageHash, 64)}`,
        );

        // Test 2a: Our signature verification
        const ourSignature = ECDSA.sign(messageHash, fixedPrivateKey);
        console.log(
          `    Our signature r: ${ECDSAUtils.bigIntToHex(ourSignature.r, 64)}`,
        );
        console.log(
          `    Our signature s: ${ECDSAUtils.bigIntToHex(ourSignature.s, 64)}`,
        );

        const ourVerification = ECDSA.verify(
          messageHash,
          ourSignature,
          ourPublicKey,
        );
        console.log(
          `    Our signature verification: ${ourVerification ? "✅" : "❌"}`,
        );
        allPassed = allPassed && ourVerification;

        // Test 2b: True cross-validation with same message format
        console.log("\n    Cross-validation test:");

        try {
          // Method 1: Use raw hash signing (bypass ethers message formatting)
          console.log("    Method 1: Direct hash signing");

          const messageHash = ECDSAUtils.hashMessage(message);

          // Sign with our implementation
          const ourSignature = ECDSA.sign(messageHash, fixedPrivateKey);

          // For ethers to sign raw hash, we need to use the signing key directly
          // NOT signMessage which always adds the Ethereum prefix
          const messageHashHex = ECDSAUtils.bigIntToHex(messageHash, 64);
          const ethersSigningKey = ethersWallet.signingKey;
          const ethersDigestSignature = ethersSigningKey.sign(messageHashHex);

          // Parse ethers signature from the Signature object
          const parsedEthersSignature = {
            r: BigInt(ethersDigestSignature.r),
            s: BigInt(ethersDigestSignature.s),
          };

          console.log(
            `      Our signature    r: ${ECDSAUtils.bigIntToHex(ourSignature.r, 64)}`,
          );
          console.log(
            `      Ethers signature r: ${ECDSAUtils.bigIntToHex(parsedEthersSignature.r, 64)}`,
          );
          console.log(
            `      Our signature    s: ${ECDSAUtils.bigIntToHex(ourSignature.s, 64)}`,
          );
          console.log(
            `      Ethers signature s: ${ECDSAUtils.bigIntToHex(parsedEthersSignature.s, 64)}`,
          );

          // Cross-validation 1: Verify ethers signature with our implementation
          const ethersToOursVerification = ECDSA.verify(
            messageHash,
            parsedEthersSignature,
            ourPublicKey,
          );
          console.log(
            `      Ethers sig -> Our verify:   ${ethersToOursVerification ? "✅" : "❌"}`,
          );

          // Cross-validation 2: Verify our signature with our implementation (sanity check)
          const ourToOursVerification = ECDSA.verify(
            messageHash,
            ourSignature,
            ourPublicKey,
          );
          console.log(
            `      Our sig -> Our verify:      ${ourToOursVerification ? "✅" : "❌"}`,
          );

          // Note: We can't easily verify our signature with ethers for raw hash
          // because ethers.verifyMessage always expects the Ethereum message format
        } catch (crossErr) {
          console.log(`    Cross-validation failed: ${String(crossErr)}`);
        }

        // Method 2: Test with ethers message format
        console.log("    Method 2: Ethers message format");

        try {
          // Debug: Check message encoding
          console.log(`      Original message: "${message}"`);
          console.log(`      Message length: ${message.length} characters`);

          // Check byte encoding
          const messageBytes = new TextEncoder().encode(message);
          console.log(
            `      Message bytes length: ${messageBytes.length} bytes`,
          );
          console.log(
            `      Message bytes: ${Array.from(messageBytes)
              .map((b) => `0x${b.toString(16).padStart(2, "0")}`)
              .join(" ")}`,
          );

          // Use ethers standard message format - IMPORTANT: use BYTE length, not character length!
          const messageBytesForFormat = new TextEncoder().encode(message);
          const ethersFormattedMessage =
            "\x19Ethereum Signed Message:\n" +
            messageBytesForFormat.length.toString() +
            message;
          const ethersFormattedHash = ECDSAUtils.hashMessage(
            ethersFormattedMessage,
          );

          console.log(`      Ethers formatted: "${ethersFormattedMessage}"`);
          console.log(
            `      Ethers formatted hash: ${ECDSAUtils.bigIntToHex(ethersFormattedHash, 64)}`,
          );

          // Compare with what ethers.js would do
          const ethersDirectHash = ethers.keccak256(messageBytes);
          console.log(
            `      Direct ethers hash of message: ${ethersDirectHash}`,
          );

          // Check ethers message formatting
          const ethersExpectedFormatted = ethers.hashMessage(message);
          console.log(
            `      Ethers hashMessage result: ${ethersExpectedFormatted}`,
          );

          // Compare our formatted hash with ethers hashMessage
          const hashMatch =
            ECDSAUtils.bigIntToHex(ethersFormattedHash, 64) ===
            ethersExpectedFormatted;
          console.log(`      Hash format match: ${hashMatch ? "✅" : "❌"}`);

          // Sign with ethers (standard message signing)
          const ethersStandardSignature =
            await ethersWallet.signMessage(message);
          const parsedEthersStandardSig = ECDSAUtils.ethersSignatureToOurs(
            ethersStandardSignature,
          );

          // Sign the same formatted message with our implementation
          // Use the ethers hashMessage result to ensure exact compatibility
          const correctFormattedHash = BigInt(ethersExpectedFormatted);
          const ourEthersFormatSignature = ECDSA.sign(
            correctFormattedHash,
            fixedPrivateKey,
          );

          console.log(
            `      Ethers standard   r: ${ECDSAUtils.bigIntToHex(parsedEthersStandardSig.r, 64)}`,
          );
          console.log(
            `      Our ethers-format r: ${ECDSAUtils.bigIntToHex(ourEthersFormatSignature.r, 64)}`,
          );
          console.log(
            `      Ethers standard   s: ${ECDSAUtils.bigIntToHex(parsedEthersStandardSig.s, 64)}`,
          );
          console.log(
            `      Our ethers-format s: ${ECDSAUtils.bigIntToHex(ourEthersFormatSignature.s, 64)}`,
          );

          // Cross-validation 1: Verify ethers signature with our implementation
          const ethersStandardToOurs = ECDSA.verify(
            correctFormattedHash,
            parsedEthersStandardSig,
            ourPublicKey,
          );
          console.log(
            `      Ethers standard sig -> Our verify: ${ethersStandardToOurs ? "✅" : "❌"}`,
          );
          allPassed = allPassed && ethersStandardToOurs;

          // Cross-validation 2: Verify our ethers-format signature with our implementation (sanity check)
          const ourEthersFormatVerification = ECDSA.verify(
            correctFormattedHash,
            ourEthersFormatSignature,
            ourPublicKey,
          );
          console.log(
            `      Our ethers-format sig -> Our verify: ${ourEthersFormatVerification ? "✅" : "❌"}`,
          );
          allPassed = allPassed && ourEthersFormatVerification;

          // Cross-validation 3: Verify with ethers (sanity check)
          const ethersVerifyResult = ethers.verifyMessage(
            message,
            ethersStandardSignature,
          );
          const ethersVerifyValid =
            ethersVerifyResult.toLowerCase() ===
            ethersWallet.address.toLowerCase();
          console.log(
            `      Ethers standard sig -> Ethers verify: ${ethersVerifyValid ? "✅" : "❌"}`,
          );
          allPassed = allPassed && ethersVerifyValid;

          // Cross-validation 4: Try to verify our signature in ethers format with ethers
          try {
            console.log(
              `      Attempting recovery with signature r=${ECDSAUtils.bigIntToHex(ourEthersFormatSignature.r, 64)}, s=${ECDSAUtils.bigIntToHex(ourEthersFormatSignature.s, 64)}`,
            );

            const ourSignatureEthersFormat =
              ECDSAUtils.ourSignatureToEthersWithRecovery(
                ourEthersFormatSignature,
                correctFormattedHash,
                ourPublicKey,
              );

            if (ourSignatureEthersFormat) {
              const vValue = parseInt(ourSignatureEthersFormat.slice(-2), 16);
              console.log(
                `      Our signature in ethers format: ${ourSignatureEthersFormat} (v=${vValue})`,
              );
              const ethersVerifyOurSig = ethers.verifyMessage(
                message,
                ourSignatureEthersFormat,
              );
              const ourSigEthersVerifyValid =
                ethersVerifyOurSig.toLowerCase() ===
                ethersWallet.address.toLowerCase();
              console.log(
                `      Our ethers-format sig -> Ethers verify: ${ourSigEthersVerifyValid ? "✅" : "❌"}`,
              );
              allPassed = allPassed && ourSigEthersVerifyValid;
            } else {
              console.log(
                `      Our ethers-format sig -> Ethers verify: ❌ (Failed to find recovery ID)`,
              );

              // Debug: try manual recovery
              for (
                let testRecoveryId = 0;
                testRecoveryId < 2;
                testRecoveryId++
              ) {
                const testRecovered = ECDSAUtils.recoverPublicKey(
                  correctFormattedHash,
                  ourEthersFormatSignature,
                  testRecoveryId,
                );
                console.log(
                  `        Recovery ID ${testRecoveryId}: ${testRecovered ? `(${ECDSAUtils.bigIntToHex(testRecovered.x, 64).slice(0, 16)}...)` : "null"}`,
                );
              }
            }
          } catch (ethersVerifyErr) {
            console.log(
              `      Our ethers-format sig -> Ethers verify: ❌ (${String(ethersVerifyErr)})`,
            );
          }
        } catch (formatErr) {
          console.log(`    Ethers format test failed: ${String(formatErr)}`);
        }
      }

      // Test 3: Signature format conversion
      console.log("\n  Test 3: Signature format conversion");
      const testMessage = "Format conversion test";
      const testHash = ECDSAUtils.hashMessage(testMessage);
      const testSignature = ECDSA.sign(testHash, fixedPrivateKey);

      // Convert our signature to ethers format (with proper recovery ID calculation)
      const convertedSignature = ECDSAUtils.ourSignatureToEthersWithRecovery(
        testSignature,
        testHash,
        ourPublicKey,
      );

      if (convertedSignature) {
        console.log(
          `    Our signature converted to ethers format: ${convertedSignature}`,
        );

        // Convert back
        const convertedBack =
          ECDSAUtils.ethersSignatureToOurs(convertedSignature);
        const normalizedOriginal = ECDSAUtils.normalizeSignature(testSignature);
        const conversionMatch =
          convertedBack.r === normalizedOriginal.r &&
          convertedBack.s === normalizedOriginal.s;
        console.log(
          `    Round-trip conversion: ${conversionMatch ? "✅" : "❌"}`,
        );
        allPassed = allPassed && conversionMatch;
      } else {
        console.log(
          `    Our signature conversion: ❌ (Failed to find recovery ID)`,
        );
      }

      // Test 4: Key generation consistency
      console.log("\n  Test 4: Public key derivation verification");

      const testPrivateKeys = [
        0x1n,
        0x2n,
        0x3n,
        0xdeadbeefn,
        0x123456789abcdef0n,
      ];

      for (const privKey of testPrivateKeys) {
        const ourPubKey = ECDSAUtils.pointMultiply(privKey, {
          x: CURVE.Gx,
          y: CURVE.Gy,
          isInfinity: false,
        });

        // Verify point is on curve: y^2 = x^3 + 7 (mod p)
        const left = ECDSAUtils.mod(ourPubKey.y * ourPubKey.y, CURVE.p);
        const right = ECDSAUtils.mod(
          ourPubKey.x * ourPubKey.x * ourPubKey.x + CURVE.b,
          CURVE.p,
        );
        const onCurve = left === right;

        console.log(
          `    Private key ${ECDSAUtils.bigIntToHex(privKey, 8)}: ${onCurve ? "✅" : "❌"} (on curve)`,
        );
        allPassed = allPassed && onCurve;

        // Compare with ethers public key for small test keys
        if (privKey <= 0xffffffffn) {
          try {
            const testPrivKeyHex = ECDSAUtils.bigIntToHex(privKey);
            const testEthersWallet = new ethers.Wallet(testPrivKeyHex);
            const testEthersPublicKey = testEthersWallet.signingKey.publicKey;

            const testEthersX = BigInt("0x" + testEthersPublicKey.slice(4, 68));
            const testEthersY = BigInt("0x" + testEthersPublicKey.slice(68));

            const keyMatch =
              ourPubKey.x === testEthersX && ourPubKey.y === testEthersY;
            console.log(`      vs ethers: ${keyMatch ? "✅" : "❌"}`);
            allPassed = allPassed && keyMatch;
          } catch (compareErr) {
            console.log(`      vs ethers: ⚠️  ${String(compareErr)}`);
          }
        }
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
    console.log(chalk.cyan("\n=== ECDSA boundary conditions testing ==="));

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
  static async runAllTests(): Promise<boolean> {
    console.log(chalk.yellow("🧪 Running ECDSA Test Suite...\n"));

    const basicTestPassed = this.testBasicSigningAndVerification();
    const invalidTestPassed = this.testInvalidSignatureRejection();
    const multipleTestPassed = this.testMultipleSignatures();
    const ethersTestPassed = await this.testEthersCompatibility();
    const boundaryTestPassed = this.testBoundaryConditions();

    console.log("\n📊 Complete Test Summary:");
    console.log("Basic signing & verification:", basicTestPassed ? "✅" : "❌");
    console.log(
      "Invalid signature rejection:",
      invalidTestPassed ? "✅" : "❌",
    );
    console.log("Multiple signatures:", multipleTestPassed ? "✅" : "❌");
    console.log("Ethers.js compatibility:", ethersTestPassed ? "✅" : "❌");
    console.log("Boundary conditions:", boundaryTestPassed ? "✅" : "❌");

    const allPassed =
      basicTestPassed &&
      invalidTestPassed &&
      multipleTestPassed &&
      ethersTestPassed &&
      boundaryTestPassed;

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
  ECDSAVerification.runAllTests().catch(console.error);
}

export { ECDSA, ECDSAUtils, ECDSAVerification };
export type { Point };
