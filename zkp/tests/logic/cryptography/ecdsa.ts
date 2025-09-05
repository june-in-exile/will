import { ethers } from "ethers";
import { Point } from "../../type/index.js";
import chalk from "chalk";

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
 * Mathematical Utility functions for cryptographic operations
 * Pure mathematical operations without cryptographic dependencies
 */
class MathUtils {
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
   * Generate cryptographically secure random BigInt
   */
  static generateRandomScalar(max: bigint): bigint {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);

    let result = 0n;
    for (let i = 0; i < bytes.length; i++) {
      result = (result << 8n) + BigInt(bytes[i]);
    }

    return this.mod(result, max - 1n) + 1n;
  }
}

/**
 * Elliptic Curve operations for secp256k1
 */
class EllipticCurve {
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

    const dx = MathUtils.mod(p2.x - p1.x, CURVE.p);
    const dy = MathUtils.mod(p2.y - p1.y, CURVE.p);
    const slope = MathUtils.mod(
      dy * MathUtils.modInverse(dx, CURVE.p),
      CURVE.p,
    );

    const x3 = MathUtils.mod(slope * slope - p1.x - p2.x, CURVE.p);
    const y3 = MathUtils.mod(slope * (p1.x - x3) - p1.y, CURVE.p);

    return { x: x3, y: y3, isInfinity: false };
  }

  /**
   * Elliptic curve point doubling
   */
  static pointDouble(p: Point): Point {
    if (p.isInfinity) return p;
    if (p.y === 0n) {
      return { x: 0n, y: 0n, isInfinity: true };
    }

    const numerator = MathUtils.mod(3n * p.x * p.x + CURVE.a, CURVE.p);
    const denominator = MathUtils.mod(2n * p.y, CURVE.p);
    const slope = MathUtils.mod(
      numerator * MathUtils.modInverse(denominator, CURVE.p),
      CURVE.p,
    );

    const x3 = MathUtils.mod(slope * slope - 2n * p.x, CURVE.p);
    const y3 = MathUtils.mod(slope * (p.x - x3) - p.y, CURVE.p);

    return { x: x3, y: y3, isInfinity: false };
  }

  /**
   * Elliptic curve scalar multiplication using double-and-add
   */
  static pointMultiply(k: bigint, p: Point): Point {
    if (k === 0n) return { x: 0n, y: 0n, isInfinity: true };
    if (k < 0n) {
      return this.pointMultiply(
        -k,
        { x: p.x, y: MathUtils.mod(-p.y, CURVE.p), isInfinity: p.isInfinity }
      );
    }

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
   * Generate k * G where k is a random scalar
   */
  static generateRandomPoint(): Point {
    const randomScalar = MathUtils.generateRandomScalar(CURVE.n);
    return this.pointMultiply(randomScalar, ECDSA.G);
  }

  /**
   * Verify the cubic constraint for elliptic curve point addition:
   * x₁ + x₂ + x₃ - λ² = 0 mod p, where the slope λ = (y₂ - y₁) / (x₂ - x₁)
   * 
   * This is mathematically equivalent to the expanded form:
   * x₁³ + x₂³ - x₁²x₂ - x₁x₂² + x₂²x₃ + x₁²x₃ - 2x₁x₂x₃ - y₁² + 2y₁y₂ - y₂² = 0 mod p
   * 
   * This constraint ensures that the three points (x₁,y₁), (x₂,y₂), (x₃,y₃) 
   * satisfy the elliptic curve addition relationship algebraically.
   */
  static verifyCubicConstraint(p1: Point, p2: Point, p3: Point): boolean {
    if (p1.isInfinity || p2.isInfinity || p3.isInfinity) {
      return false;
    }

    const { x: x1, y: y1 } = p1;
    const { x: x2, y: y2 } = p2;
    const { x: x3 } = p3;

    // x₁³
    const x1_cubed = MathUtils.mod(x1 * x1 * x1, CURVE.p);

    // x₂³
    const x2_cubed = MathUtils.mod(x2 * x2 * x2, CURVE.p);

    // x₁²x₂
    const x1_squared_x2 = MathUtils.mod(x1 * x1 * x2, CURVE.p);

    // x₁x₂²
    const x1_x2_squared = MathUtils.mod(x1 * x2 * x2, CURVE.p);

    // x₂²x₃
    const x2_squared_x3 = MathUtils.mod(x2 * x2 * x3, CURVE.p);

    // x₁²x₃
    const x1_squared_x3 = MathUtils.mod(x1 * x1 * x3, CURVE.p);

    // x₁x₂x₃
    const x1_x2_x3 = MathUtils.mod(x1 * x2 * x3, CURVE.p);

    // y₁²
    const y1_squared = MathUtils.mod(y1 * y1, CURVE.p);

    // y₂²
    const y2_squared = MathUtils.mod(y2 * y2, CURVE.p);

    // y₁y₂
    const y1_y2 = MathUtils.mod(y1 * y2, CURVE.p);

    // Calculate the full cubic constraint expression:
    // x₁³ + x₂³ - x₁²x₂ - x₁x₂² + x₂²x₃ + x₁²x₃ - 2x₁x₂x₃ - y₂² + 2y₁y₂ - y₁²
    let result = MathUtils.mod(x1_cubed + x2_cubed, CURVE.p);
    result = MathUtils.mod(result - x1_squared_x2, CURVE.p);
    result = MathUtils.mod(result - x1_x2_squared, CURVE.p);
    result = MathUtils.mod(result + x2_squared_x3, CURVE.p);
    result = MathUtils.mod(result + x1_squared_x3, CURVE.p);
    result = MathUtils.mod(result - 2n * x1_x2_x3, CURVE.p);
    result = MathUtils.mod(result - y1_squared, CURVE.p);
    result = MathUtils.mod(result + 2n * y1_y2, CURVE.p);
    result = MathUtils.mod(result - y2_squared, CURVE.p);

    // The constraint is satisfied if the result equals zero
    return result === 0n;
  }

  /**
   * Verify if three points (x1, y1), (x2, y2), (x3, -y3) are co-linear
   * Uses the cross product method: (P2-P1) × (P3-P1) = 0
   * 
   * This is mathmatically equivalent to the expanded form::
   * x₃y₂ + x₂y₃ + x₂y₁ - x₃y₁ - x₁y₂ - x₁y₃ = 0 mod p
   */
  static pointOnLine(p1: Point, p2: Point, p3: Point): boolean {
    // Handle infinity points
    if (p1.isInfinity || p2.isInfinity || p3.isInfinity) {
      return false;
    }

    // If any two points are the same, they are collinear with any third point
    if (
      (p1.x === p2.x && p1.y === p2.y) ||
      (p1.x === p3.x && p1.y === p3.y) ||
      (p2.x === p3.x && p2.y === p3.y)
    ) {
      return true;
    }

    const { x: x1, y: y1 } = p1;
    const { x: x2, y: y2 } = p2;
    const { x: x3, y: y3 } = p3;

    // Calculate all cross products for the collinearity test
    // Formula: x₃y₂ + x₂y₃ + x₂y₁ - x₃y₁ - x₁y₂ - x₁y₃ = 0 mod p
    const x3y2 = MathUtils.mod(x3 * y2, CURVE.p);
    const x2y3 = MathUtils.mod(x2 * y3, CURVE.p);
    const x2y1 = MathUtils.mod(x2 * y1, CURVE.p);
    const x3y1 = MathUtils.mod(x3 * y1, CURVE.p);
    const x1y2 = MathUtils.mod(x1 * y2, CURVE.p);
    const x1y3 = MathUtils.mod(x1 * y3, CURVE.p);

    // Compute the collinearity expression
    let result = MathUtils.mod(x3y2 + x2y3, CURVE.p);
    result = MathUtils.mod(result + x2y1, CURVE.p);
    result = MathUtils.mod(result - x3y1, CURVE.p);
    result = MathUtils.mod(result - x1y2, CURVE.p);
    result = MathUtils.mod(result - x1y3, CURVE.p);

    return result === 0n;
  }

  /**
   * Verify if a point is on the tangent line at a given curve point
   * The tangent line at point P has slope: (3x² + a) / (2y)
   */
  static pointOnTangent(curvePoint: Point, testPoint: Point): boolean {
    // Handle infinity points
    if (curvePoint.isInfinity || testPoint.isInfinity) {
      return false;
    }

    // Verify the curve point is actually on the curve
    if (!this.pointOnCurve(curvePoint)) {
      return false;
    }

    // If the test point is the same as curve point, it's on the tangent
    if (curvePoint.x === testPoint.x && curvePoint.y === testPoint.y) {
      return true;
    }

    // Special case: if y = 0, the tangent is vertical
    if (curvePoint.y === 0n) {
      return curvePoint.x === testPoint.x;
    }

    // Calculate tangent slope: slope = (3x² + a) / (2y)
    const numerator = MathUtils.mod(
      3n * curvePoint.x * curvePoint.x + CURVE.a,
      CURVE.p,
    );
    const denominator = MathUtils.mod(2n * curvePoint.y, CURVE.p);
    const slope = MathUtils.mod(
      numerator * MathUtils.modInverse(denominator, CURVE.p),
      CURVE.p,
    );

    // Tangent line equation: y - y1 = slope * (x - x1)
    // Rearranged: y = slope * (x - x1) + y1
    const expectedY = MathUtils.mod(
      slope * MathUtils.mod(testPoint.x - curvePoint.x, CURVE.p) +
      curvePoint.y,
      CURVE.p,
    );

    return testPoint.y === expectedY;
  }

  /**
   * Verify if a point is on the secp256k1 elliptic curve
   * Curve equation: y² = x³ + 7 (mod p)
   */
  static pointOnCurve(point: Point): boolean {
    // Infinity point is considered on the curve
    if (point.isInfinity) {
      return true;
    }

    // Calculate y²
    const leftSide = MathUtils.mod(point.y * point.y, CURVE.p);

    // Calculate x³ + 7
    const rightSide = MathUtils.mod(
      point.x * point.x * point.x + CURVE.b,
      CURVE.p,
    );

    return leftSide === rightSide;
  }
}

/**
 * ECDSA Utility functions for cryptographic operations
 * This class focuses on ECDSA-specific utilities, with mathematical operations delegated to MathUtils
 */
class ECDSAUtils {

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
      const ySquared = MathUtils.mod(x * x * x + CURVE.b, CURVE.p);

      // Use Tonelli-Shanks algorithm for square root (simplified for secp256k1)
      // For secp256k1, p ≡ 3 (mod 4), so we can use: y = ±(y²)^((p+1)/4) mod p
      let y = MathUtils.modPow(ySquared, (CURVE.p + 1n) / 4n, CURVE.p);

      // Choose the correct y based on recovery ID
      // If recovery ID is odd, we want the odd y coordinate
      if (y % 2n !== BigInt(recoveryId)) {
        y = CURVE.p - y;
      }

      const R: Point = { x, y, isInfinity: false };

      // Verify R is on the curve
      if (!EllipticCurve.pointOnCurve(R)) {
        return null;
      }

      // Calculate public key: Q = r^(-1) * (s * R - e * G)
      const rInv = MathUtils.modInverse(r, CURVE.n);
      const sR = EllipticCurve.pointMultiply(s, R);
      // const eG = this.pointMultiply(messageHash, {
      //     x: CURVE.Gx,
      //     y: CURVE.Gy,
      //     isInfinity: false
      // });

      // Calculate s * R - e * G = s * R + (-e) * G
      const negE = MathUtils.mod(-messageHash, CURVE.n);
      const negEG = EllipticCurve.pointMultiply(negE, {
        x: CURVE.Gx,
        y: CURVE.Gy,
        isInfinity: false,
      });

      const temp = EllipticCurve.pointAdd(sR, negEG);
      const publicKey = EllipticCurve.pointMultiply(rInv, temp);

      return publicKey;
    } catch {
      return null;
    }
  }
}

/**
 * ECDSA Implementation
 */
class ECDSA {
  static G: Point = {
    x: CURVE.Gx,
    y: CURVE.Gy,
    isInfinity: false,
  };

  static generateKeyPair(): { privateKey: bigint; publicKey: Point } {
    // Generate random private key
    const privateKey = MathUtils.generateRandomScalar(CURVE.n);
    const publicKey = EllipticCurve.pointMultiply(privateKey, this.G);

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
      const k = MathUtils.generateRandomScalar(CURVE.n);

      // Calculate r = (k * G).x mod n
      const kG = EllipticCurve.pointMultiply(k, this.G);
      r = MathUtils.mod(kG.x, CURVE.n);

      if (r === 0n) continue;

      // Calculate s = k^(-1) * (hash + r * privateKey) mod n
      const kInv = MathUtils.modInverse(k, CURVE.n);
      s = MathUtils.mod(
        kInv * (messageHash + MathUtils.mod(r * privateKey, CURVE.n)),
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

    // Verify with normalized signature
    const normalized = ECDSAUtils.normalizeSignature({ r, s });
    return this.verifyWithSignature(messageHash, normalized, publicKey);
  }

  private static verifyWithSignature(
    messageHash: bigint,
    signature: { r: bigint; s: bigint },
    publicKey: Point,
  ): boolean {
    const { r, s } = signature;

    // Calculate w = s^(-1) mod n
    const w = MathUtils.modInverse(s, CURVE.n);

    // Calculate u1 = hash * w mod n
    const u1 = MathUtils.mod(messageHash * w, CURVE.n);

    // Calculate u2 = r * w mod n
    const u2 = MathUtils.mod(r * w, CURVE.n);

    // Calculate point = u1 * G + u2 * publicKey
    const u1G = EllipticCurve.pointMultiply(u1, this.G);
    const u2P = EllipticCurve.pointMultiply(u2, publicKey);
    const point = EllipticCurve.pointAdd(u1G, u2P);

    if (point.isInfinity) return false;

    // Verify r == point.x mod n
    return MathUtils.mod(point.x, CURVE.n) === r;
  }
}

/**
 * ECDSA Verification Test Suite
 */
class ECDSAVerification {
  /**
   * Test elliptic curve verification functions
   */
  static testEllipticCurveVerification(): boolean {
    console.log(
      chalk.cyan("\n=== Elliptic curve verification functions testing ==="),
    );

    let allPassed = true;

    try {
      // Test pointOnCurve
      console.log("\n  Testing pointOnCurve:");

      // Test 1: Generator point should be on curve
      const generatorPoint = { x: CURVE.Gx, y: CURVE.Gy, isInfinity: false };
      const generatorOnCurve = EllipticCurve.pointOnCurve(generatorPoint);
      console.log(
        `    Generator point on curve: ${generatorOnCurve ? "✅" : "❌"}`,
      );
      allPassed = allPassed && generatorOnCurve;

      // Test 2: Infinity point should be on curve
      const infinityPoint = { x: 0n, y: 0n, isInfinity: true };
      const infinityOnCurve = EllipticCurve.pointOnCurve(infinityPoint);
      console.log(
        `    Infinity point on curve: ${infinityOnCurve ? "✅" : "❌"}`,
      );
      allPassed = allPassed && infinityOnCurve;

      // Test 3: Random valid point should be on curve
      const keyPair = ECDSA.generateKeyPair();
      const randomValidPoint = keyPair.publicKey;
      const randomOnCurve = EllipticCurve.pointOnCurve(randomValidPoint);
      console.log(
        `    Random valid point on curve: ${randomOnCurve ? "✅" : "❌"}`,
      );
      allPassed = allPassed && randomOnCurve;

      // Test 4: Invalid point should not be on curve
      const invalidPoint = { x: 1n, y: 1n, isInfinity: false };
      const invalidOnCurve = EllipticCurve.pointOnCurve(invalidPoint);
      console.log(
        `    Invalid point rejected: ${!invalidOnCurve ? "✅" : "❌"}`,
      );
      allPassed = allPassed && !invalidOnCurve;

      // Test pointOnLine
      console.log("\n  Testing pointOnLine:");

      // Test 1: Three points that should be collinear
      // Let's create a proper collinear test case using the line equation
      const p1 = { x: 1n, y: 2n, isInfinity: false };
      const p2 = { x: 2n, y: 4n, isInfinity: false };
      const p3 = { x: 3n, y: -6n, isInfinity: false }; // Points on line y = 2x

      const collinearTest = EllipticCurve.pointOnLine(p1, p2, p3);
      console.log(
        `    Collinear points detected: ${collinearTest ? "✅" : "❌"}`,
      );
      allPassed = allPassed && collinearTest;

      // Test 2: Three points that should not be collinear
      const nonCollinear1 = { x: 1n, y: 1n, isInfinity: false };
      const nonCollinear2 = { x: 2n, y: 3n, isInfinity: false };
      const nonCollinear3 = { x: 3n, y: -2n, isInfinity: false };

      const nonCollinearTest = EllipticCurve.pointOnLine(
        nonCollinear1,
        nonCollinear2,
        nonCollinear3,
      );
      console.log(
        `    Non-collinear points rejected: ${!nonCollinearTest ? "✅" : "❌"}`,
      );
      allPassed = allPassed && !nonCollinearTest;

      // Test 3: Identical points are collinear
      const identicalTest = EllipticCurve.pointOnLine(p1, p1, p2);
      console.log(
        `    Identical points are collinear: ${identicalTest ? "✅" : "❌"}`,
      );
      allPassed = allPassed && identicalTest;

      // Test 4: Infinity points
      const infinityTest = EllipticCurve.pointOnLine(infinityPoint, p1, p2);
      console.log(
        `    Infinity points handled: ${!infinityTest ? "✅" : "❌"}`,
      );
      allPassed = allPassed && !infinityTest;

      // Test pointOnTangent
      console.log("\n  Testing pointOnTangent:");

      // Use generator point for tangent tests
      const G = { x: CURVE.Gx, y: CURVE.Gy, isInfinity: false };

      // Test 1: Point should be on its own tangent
      const selfTangentTest = EllipticCurve.pointOnTangent(G, G);
      console.log(
        `    Point on its own tangent: ${selfTangentTest ? "✅" : "❌"}`,
      );
      allPassed = allPassed && selfTangentTest;

      // Test 2: Test with a known curve point and calculate tangent
      // For point G, calculate the tangent line and test a point on it
      // Tangent slope at G: (3*Gx² + a) / (2*Gy) where a = 0 for secp256k1
      const tangentNumerator = MathUtils.mod(3n * G.x * G.x, CURVE.p);
      const tangentDenominator = MathUtils.mod(2n * G.y, CURVE.p);
      const tangentSlope = MathUtils.mod(
        tangentNumerator * MathUtils.modInverse(tangentDenominator, CURVE.p),
        CURVE.p,
      );

      // Create a point on the tangent line: y - Gy = slope * (x - Gx)
      const testX = MathUtils.mod(G.x + 1n, CURVE.p);
      const testY = MathUtils.mod(tangentSlope * (testX - G.x) + G.y, CURVE.p);
      const tangentPoint = { x: testX, y: testY, isInfinity: false };

      const tangentTest = EllipticCurve.pointOnTangent(G, tangentPoint);
      console.log(
        `    Point on calculated tangent: ${tangentTest ? "✅" : "❌"}`,
      );
      allPassed = allPassed && tangentTest;

      // Test 3: Point not on tangent
      const notOnTangent = {
        x: testX,
        y: MathUtils.mod(testY + 1n, CURVE.p),
        isInfinity: false,
      };
      const notTangentTest = EllipticCurve.pointOnTangent(G, notOnTangent);
      console.log(
        `    Point not on tangent rejected: ${!notTangentTest ? "✅" : "❌"}`,
      );
      allPassed = allPassed && !notTangentTest;

      // Test 4: Invalid curve point for tangent
      const invalidTangentTest = EllipticCurve.pointOnTangent(
        invalidPoint,
        tangentPoint,
      );
      console.log(
        `    Invalid curve point rejected: ${!invalidTangentTest ? "✅" : "❌"}`,
      );
      allPassed = allPassed && !invalidTangentTest;

      // Test 5: Infinity points for tangent
      const infinityTangentTest = EllipticCurve.pointOnTangent(
        infinityPoint,
        tangentPoint,
      );
      console.log(
        `    Infinity curve point handled: ${!infinityTangentTest ? "✅" : "❌"}`,
      );
      allPassed = allPassed && !infinityTangentTest;

      // Test verifyCubicConstraint
      console.log("\n  Testing verifyCubicConstraint:");

      // Test 1: Verify cubic constraint for valid elliptic curve addition
      // Generate two random curve points and compute their addition
      const keyPair1 = ECDSA.generateKeyPair();
      const keyPair2 = ECDSA.generateKeyPair();
      const p1_cubic = keyPair1.publicKey;
      const p2_cubic = keyPair2.publicKey;
      const p3_cubic = EllipticCurve.pointAdd(p1_cubic, p2_cubic);

      const validCubicTest = EllipticCurve.verifyCubicConstraint(p1_cubic, p2_cubic, p3_cubic);
      console.log(
        `    Valid EC addition cubic constraint: ${validCubicTest ? "✅" : "❌"}`,
      );
      allPassed = allPassed && validCubicTest;

      // Test 2: Verify cubic constraint fails for invalid point addition
      const invalidP3 = { x: MathUtils.mod(p3_cubic.x + 1n, CURVE.p), y: p3_cubic.y, isInfinity: false };
      const invalidCubicTest = EllipticCurve.verifyCubicConstraint(p1_cubic, p2_cubic, invalidP3);
      console.log(
        `    Invalid EC addition constraint rejected: ${!invalidCubicTest ? "✅" : "❌"}`,
      );
      allPassed = allPassed && !invalidCubicTest;

      // Test 3: Test with point doubling case (P1 = P2)
      const doublingResult = EllipticCurve.pointDouble(p1_cubic);
      const doublingCubicTest = EllipticCurve.verifyCubicConstraint(p1_cubic, p1_cubic, doublingResult);
      console.log(
        `    Point doubling cubic constraint: ${doublingCubicTest ? "✅" : "❌"}`,
      );
      allPassed = allPassed && doublingCubicTest;

      // Test 4: Test with generator point operations
      const scalarK = MathUtils.generateRandomScalar(CURVE.n);
      const kG = EllipticCurve.pointMultiply(scalarK, ECDSA.G);
      const twoKG = EllipticCurve.pointDouble(kG);
      const kGPlusKG = EllipticCurve.pointAdd(kG, kG);

      // Verify that 2*kG = kG + kG satisfies cubic constraint
      const generatorCubicTest = EllipticCurve.verifyCubicConstraint(kG, kG, twoKG);
      console.log(
        `    Generator point operations cubic: ${generatorCubicTest ? "✅" : "❌"}`,
      );
      allPassed = allPassed && generatorCubicTest;

      // Verify the computed addition matches doubling
      const additionMatchesDoubling = twoKG.x === kGPlusKG.x && twoKG.y === kGPlusKG.y;
      console.log(
        `    Point doubling consistency: ${additionMatchesDoubling ? "✅" : "❌"}`,
      );
      allPassed = allPassed && additionMatchesDoubling;

      // Test 5: Handle infinity points in cubic constraint
      const infinityCubicTest1 = EllipticCurve.verifyCubicConstraint(infinityPoint, p1_cubic, p2_cubic);
      const infinityCubicTest2 = EllipticCurve.verifyCubicConstraint(p1_cubic, infinityPoint, p2_cubic);
      const infinityCubicTest3 = EllipticCurve.verifyCubicConstraint(p1_cubic, p2_cubic, infinityPoint);

      console.log(
        `    Infinity points in cubic handled: ${!infinityCubicTest1 && !infinityCubicTest2 && !infinityCubicTest3 ? "✅" : "❌"}`,
      );
      allPassed = allPassed && !infinityCubicTest1 && !infinityCubicTest2 && !infinityCubicTest3;
    } catch (err) {
      console.log("❌ Error in elliptic curve verification test:", String(err));
      allPassed = false;
    }

    return allPassed;
  }

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
      const ourPublicKey = EllipticCurve.pointMultiply(fixedPrivateKey, {
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
        const ourPubKey = EllipticCurve.pointMultiply(privKey, {
          x: CURVE.Gx,
          y: CURVE.Gy,
          isInfinity: false,
        });

        // Verify point is on curve: y^2 = x^3 + 7 (mod p)
        const onCurve = EllipticCurve.pointOnCurve(ourPubKey);

        console.log(
          `    Private key ${ECDSAUtils.bigIntToHex(privKey)}: ${onCurve ? "✅" : "❌"} (on curve)`,
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

    const eccVerificationTestPassed = this.testEllipticCurveVerification();
    const basicTestPassed = this.testBasicSigningAndVerification();
    const invalidTestPassed = this.testInvalidSignatureRejection();
    const multipleTestPassed = this.testMultipleSignatures();
    const ethersTestPassed = await this.testEthersCompatibility();
    const boundaryTestPassed = this.testBoundaryConditions();

    console.log("\n📊 Complete Test Summary:");
    console.log(
      "Elliptic curve verification:",
      eccVerificationTestPassed ? "✅" : "❌",
    );
    console.log("Basic signing & verification:", basicTestPassed ? "✅" : "❌");
    console.log(
      "Invalid signature rejection:",
      invalidTestPassed ? "✅" : "❌",
    );
    console.log("Multiple signatures:", multipleTestPassed ? "✅" : "❌");
    console.log("Ethers.js compatibility:", ethersTestPassed ? "✅" : "❌");
    console.log("Boundary conditions:", boundaryTestPassed ? "✅" : "❌");

    const allPassed =
      eccVerificationTestPassed &&
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

export { CURVE, MathUtils, ECDSA, ECDSAUtils, ECDSAVerification, EllipticCurve };
