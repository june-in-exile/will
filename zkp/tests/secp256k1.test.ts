import { WitnessTester, pointToBigInts } from "./util/index.js";
import { ECDSAUtils, secp256k1AddUnequal } from "./logic/index.js";

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
            const p1 = ECDSAUtils.generateRandomPoint();
            const p2 = ECDSAUtils.generateRandomPoint();

            const a = pointToBigInts(p1);
            const b = pointToBigInts(p2);
            const out = secp256k1AddUnequal(a, b);

            await circuit.expectPass({ a, b }, { out });
        });
    });
});