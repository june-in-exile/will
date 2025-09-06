import { EllipticCurve } from "./modules/ecdsa.js";
import {
  bigIntsToPoint,
  concatBigInts,
  pointToBigInts,
} from "../util/index.js";

function addUnequalCubicConstraint(
  x1: bigint[],
  y1: bigint[],
  x2: bigint[],
  y2: bigint[],
  x3: bigint[],
  y3: bigint[],
): boolean {
  const p1 = { x: concatBigInts(x1), y: concatBigInts(y1), isInfinity: false };
  const p2 = { x: concatBigInts(x2), y: concatBigInts(y2), isInfinity: false };
  const p3 = { x: concatBigInts(x3), y: concatBigInts(y3), isInfinity: false };

  return EllipticCurve.verifyCubicConstraint(p1, p2, p3);
}

function secp256k1PointOnLine(
  x1: bigint[],
  y1: bigint[],
  x2: bigint[],
  y2: bigint[],
  x3: bigint[],
  y3: bigint[],
): boolean {
  const p1 = { x: concatBigInts(x1), y: concatBigInts(y1), isInfinity: false };
  const p2 = { x: concatBigInts(x2), y: concatBigInts(y2), isInfinity: false };
  const p3 = { x: concatBigInts(x3), y: concatBigInts(y3), isInfinity: false };

  return EllipticCurve.pointOnLine(p1, p2, p3);
}

function secp256k1PointOnTangent(
  x1: bigint[],
  y1: bigint[],
  x3: bigint[],
  y3: bigint[],
): boolean {
  const p1 = { x: concatBigInts(x1), y: concatBigInts(y1), isInfinity: false };
  const p3 = { x: concatBigInts(x3), y: concatBigInts(y3), isInfinity: false };

  return EllipticCurve.pointOnTangent(p1, p3);
}

function secp256k1PointOnCurve(x: bigint[], y: bigint[]): boolean {
  const p = { x: concatBigInts(x), y: concatBigInts(y), isInfinity: false };

  return EllipticCurve.pointOnCurve(p);
}

function secp256k1AddUnequal(a: bigint[][], b: bigint[][]): bigint[][] {
  const p1 = bigIntsToPoint(a);
  const p2 = bigIntsToPoint(b);

  const p3 = EllipticCurve.pointAdd(p1, p2);
  const out = pointToBigInts(p3);
  return out;
}

function secp256k1Double(_in: bigint[][]): bigint[][] {
  const pin = bigIntsToPoint(_in);
  const pout = EllipticCurve.pointDouble(pin);
  return pointToBigInts(pout);
}

function secp256k1ScalarMult(scalar: bigint[], point: bigint[][]): bigint[][] {
  const p = bigIntsToPoint(point);
  const scalarBigInt = concatBigInts(scalar);
  const out = EllipticCurve.pointMultiply(scalarBigInt, p);
  return pointToBigInts(out);
}

export {
  addUnequalCubicConstraint,
  secp256k1PointOnLine,
  secp256k1PointOnTangent,
  secp256k1PointOnCurve,
  secp256k1AddUnequal,
  secp256k1Double,
  secp256k1ScalarMult
};
