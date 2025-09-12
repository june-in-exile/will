import { EllipticCurve } from "./modules/ecdsa.js";
import {
  bigIntsToEcdsaPoint,
  concatBigInts,
  ecdsaPointToBigInts,
} from "../util/index.js";
import { Uint256, ConcatedEcdsaPoint } from "../type/index.js";

function addUnequalCubicConstraint(
  x1: Uint256,
  y1: Uint256,
  x2: Uint256,
  y2: Uint256,
  x3: Uint256,
  y3: Uint256,
): boolean {
  const p1 = { x: concatBigInts(x1), y: concatBigInts(y1), isInfinity: false };
  const p2 = { x: concatBigInts(x2), y: concatBigInts(y2), isInfinity: false };
  const p3 = { x: concatBigInts(x3), y: concatBigInts(y3), isInfinity: false };

  return EllipticCurve.verifyCubicConstraint(p1, p2, p3);
}

function secp256k1PointOnLine(
  x1: Uint256,
  y1: Uint256,
  x2: Uint256,
  y2: Uint256,
  x3: Uint256,
  y3: Uint256,
): boolean {
  const p1 = { x: concatBigInts(x1), y: concatBigInts(y1), isInfinity: false };
  const p2 = { x: concatBigInts(x2), y: concatBigInts(y2), isInfinity: false };
  const p3 = { x: concatBigInts(x3), y: concatBigInts(y3), isInfinity: false };

  return EllipticCurve.pointOnLine(p1, p2, p3);
}

function secp256k1PointOnTangent(
  x1: Uint256,
  y1: Uint256,
  x3: Uint256,
  y3: Uint256,
): boolean {
  const p1 = { x: concatBigInts(x1), y: concatBigInts(y1), isInfinity: false };
  const p3 = { x: concatBigInts(x3), y: concatBigInts(y3), isInfinity: false };

  return EllipticCurve.pointOnTangent(p1, p3);
}

function secp256k1PointOnCurve(x: Uint256, y: Uint256): boolean {
  const p = { x: concatBigInts(x), y: concatBigInts(y), isInfinity: false };

  return EllipticCurve.pointOnCurve(p);
}

function secp256k1AddUnequal(a: Uint256[], b: Uint256[]): Uint256[] {
  const p1 = bigIntsToEcdsaPoint(a, true) as ConcatedEcdsaPoint;
  const p2 = bigIntsToEcdsaPoint(b, true) as ConcatedEcdsaPoint;

  const p3 = EllipticCurve.pointAdd(p1, p2);
  const out = ecdsaPointToBigInts(p3);
  return out;
}

function secp256k1Double(_in: Uint256[]): Uint256[] {
  const pin = bigIntsToEcdsaPoint(_in, true) as ConcatedEcdsaPoint;
  const pout = EllipticCurve.pointDouble(pin);
  return ecdsaPointToBigInts(pout);
}

function secp256k1ScalarMult(scalar: Uint256, point: Uint256[]): Uint256[] {
  const p = bigIntsToEcdsaPoint(point, true) as ConcatedEcdsaPoint;
  const scalarBigInt = concatBigInts(scalar);
  const out = EllipticCurve.pointMultiply(scalarBigInt, p);
  return ecdsaPointToBigInts(out);
}

export {
  addUnequalCubicConstraint,
  secp256k1PointOnLine,
  secp256k1PointOnTangent,
  secp256k1PointOnCurve,
  secp256k1AddUnequal,
  secp256k1Double,
  secp256k1ScalarMult,
};
