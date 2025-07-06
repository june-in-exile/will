import { WitnessTester } from "./utils";

describe("Multiplier2 Circuit", function () {
  let circuit: WitnessTester<["a", "b"], ["c"]>;

  beforeAll(async function (): Promise<void> {
    circuit = await WitnessTester.construct("./multiplier2/multiplier2.circom", "Multiplier2");
    console.info("Multiplier2 circuit constraints:", await circuit.getConstraintCount());
  });

  describe("Basic Multiplication", function (): void {
    const testCases = [
      { a: 3, b: 11, c: 33 },
      { a: 7, b: 6, c: 42 },
      { a: 0, b: 5, c: 0 },
      { a: 12345, b: 67890, c: 12345 * 67890 },
    ];

    testCases.forEach(({ a, b, c }): void => {
      it(`should validate ${a} x ${b} = ${c}`, async function (): Promise<void> {
        await circuit.expectPass({ a, b }, { c });
      });
    });
  });
});
