import { WitnessTester, pointToBigInts, splitBigInt } from "./util/index.js";
import { EllipticCurve, ECDSAUtils, secp256k1PointOnLine, secp256k1PointOnCurve, secp256k1AddUnequal, secp256k1PointOnTangent } from "./logic/index.js";

describe("Secp256k1PointOnLine Circuit", function () {
    let circuit: WitnessTester<["x1", "y1", "x2", "y2", "x3", "y3"]>;

    describe("Check 3 Points Collinear", function (): void {
        beforeAll(async function (): Promise<void> {
            circuit = await WitnessTester.construct(
                "circuits/shared/components/ecdsa/secp256k1.circom",
                "Secp256k1PointOnLine",
            );
            circuit.setConstraint("check 3 points are collinear");
        });

        it("should accept 3 collinear random points", async function (): Promise<void> {
            const p1 = EllipticCurve.generateRandomPoint();
            const x1 = splitBigInt(p1.x);
            const y1 = splitBigInt(p1.y);

            const p2 = EllipticCurve.generateRandomPoint();
            const x2 = splitBigInt(p2.x);
            const y2 = splitBigInt(p2.y);

            const p3 = EllipticCurve.pointAdd(p1, p2);
            const x3 = splitBigInt(p3.x);
            const y3 = splitBigInt(p3.y);

            if (!secp256k1PointOnLine(x1, y1, x2, y2, x3, y3)) {
                throw new Error("p1, p2, p3 should be collinear");
            }

            await circuit.expectPass({ x1, y1, x2, y2, x3, y3 });
        });

        it("should reject 3 non-collinear random points", async function (): Promise<void> {
            const p1 = EllipticCurve.generateRandomPoint();
            const x1 = splitBigInt(p1.x);
            const y1 = splitBigInt(p1.y);

            const p2 = EllipticCurve.generateRandomPoint();
            const x2 = splitBigInt(p2.x);
            const y2 = splitBigInt(p2.y);

            let p3 = EllipticCurve.generateRandomPoint();
            let x3 = splitBigInt(p3.x);
            let y3 = splitBigInt(p3.y);

            while (secp256k1PointOnLine(x1, y1, x2, y2, x3, y3)) {
                p3 = EllipticCurve.generateRandomPoint();
                x3 = splitBigInt(p3.x);
                y3 = splitBigInt(p3.y);
            }

            await circuit.expectFail({ x1, y1, x2, y2, x3, y3 });
        });
    });
});

describe("Secp256k1PointOnTangent Circuit", function () {
    let circuit: WitnessTester<["x1", "y1", "x3", "y3"]>;

    describe("Check 2 Points Satisfy Point Doubling", function (): void {
        beforeAll(async function (): Promise<void> {
            circuit = await WitnessTester.construct(
                "circuits/shared/components/ecdsa/secp256k1.circom",
                "Secp256k1PointOnTangent",
            );
            circuit.setConstraint("check 2 points satisfy the point doubling relationship");
        });

        it("should accept 2 points with doubling relationship", async function (): Promise<void> {
            const p1 = EllipticCurve.generateRandomPoint();
            const x1 = splitBigInt(p1.x);
            const y1 = splitBigInt(p1.y);

            const p3 = EllipticCurve.pointDouble(p1);
            const x3 = splitBigInt(p3.x);
            const y3 = splitBigInt(p3.y);

            if (!secp256k1PointOnTangent(x1, y1, x3, y3)) {
                throw new Error("p3 should equal 2 * p1");
            }

            await circuit.expectPass({ x1, y1, x3, y3 });
        });

        it("should reject 2 points without doubling relationship", async function (): Promise<void> {
            const p1 = EllipticCurve.generateRandomPoint();
            const x1 = splitBigInt(p1.x);
            const y1 = splitBigInt(p1.y);

            let p3 = EllipticCurve.generateRandomPoint();
            let x3 = splitBigInt(p3.x);
            let y3 = splitBigInt(p3.y);

            while (secp256k1PointOnTangent(x1, y1, x3, y3)) {
                p3 = EllipticCurve.generateRandomPoint();
                x3 = splitBigInt(p3.x);
                y3 = splitBigInt(p3.y);
            }

            await circuit.expectFail({ x1, y1, x3, y3 });
        });
    });
});

describe("Secp256k1PointOnCurve Circuit", function () {
    let circuit: WitnessTester<["x", "y"]>;

    describe("Check Point on Curve", function (): void {
        beforeAll(async function (): Promise<void> {
            circuit = await WitnessTester.construct(
                "circuits/shared/components/ecdsa/secp256k1.circom",
                "Secp256k1PointOnCurve",
            );
            circuit.setConstraint("check point is on curve");
        });

        it("should accept point on curve", async function (): Promise<void> {
            const p = EllipticCurve.generateRandomPoint();
            const x = splitBigInt(p.x);
            const y = splitBigInt(p.y);

            if (!secp256k1PointOnCurve(x, y)) {
                throw new Error("p should be on curve");
            }

            await circuit.expectPass({ x, y });
        });

        it("should reject point not on curve", async function (): Promise<void> {
            let x = splitBigInt(ECDSAUtils.generateRandomScalar());
            let y = splitBigInt(ECDSAUtils.generateRandomScalar());

            while (secp256k1PointOnCurve(x, y)) {
                x = splitBigInt(ECDSAUtils.generateRandomScalar());
                y = splitBigInt(ECDSAUtils.generateRandomScalar());
            }

            await circuit.expectFail({ x, y });
        });
    });
});

describe("Secp256k1AddUnequal Circuit", function () {
    let circuit: WitnessTester<["a", "b"], ["out"]>;

    describe("Point Addition on Secp256k1 Curve", function (): void {
        beforeAll(async function (): Promise<void> {
            circuit = await WitnessTester.construct(
                "circuits/shared/components/ecdsa/secp256k1.circom",
                "Secp256k1AddUnequal",
                {
                    templateParams: ["64", "4"],
                },
            );
            circuit.setConstraint("point addition on secp256k1 curve");
        });

        it("should add two random point correctly", async function (): Promise<void> {
            const p1 = EllipticCurve.generateRandomPoint();
            const p2 = EllipticCurve.generateRandomPoint();

            const a = pointToBigInts(p1);
            const b = pointToBigInts(p2);
            const out = secp256k1AddUnequal(a, b);

            await circuit.expectPass({ a, b }, { out });
        });
    });
});