import { WitnessTester } from "./utils";

describe("Base64Decoder Circuit", function () {
  let circuit: WitnessTester<["asciis"], ["bytes"]>;

  beforeAll(async function (): Promise<void> {
    circuit = await WitnessTester.construct("./base64/base64.circom", {
      templateName: "Base64Decoder",
      templateParams: ["4", "3"],
    });
    console.info("Base64Decoder circuit constraints:", await circuit.getConstraintCount());
  });

  describe("Realword Decode Cases", function (): void {
    test("should decode 'TWFu' into 'Man'", async function (): Promise<void> {
      const asciis = [84, 87, 70, 117];
      const bytes = [77, 97, 110];
      await circuit.expectPass({ asciis }, { bytes });
    });

    test.skip("should decode 'QkM=' into 'A'", async function (): Promise<void> {
      const asciis = [81, 107, 77, 61];
      const bytes = [65, 0, 0];
      await circuit.expectPass({ asciis }, { bytes });
    });
  });
});