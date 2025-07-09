import { WitnessTester } from "./utils";

describe("ExpandKey Circuit", function () {
  let circuit: WitnessTester<["key"], ["expandedKey"]>;

  describe("Key Expansion", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/aes256gcm/expandKey.circom",
        "ExpandKey",
      );
      console.info(
        "Key expansion circuit constraints:",
        await circuit.getConstraintCount(),
      );
    });

    it("should expand 32-byte key to 240-byte", async function (): Promise<void> {
      const keyBase64 = "gqngitQZdS6ihWF34xmxSkwN9fPhteFwvMrpDG6G5gY";
      const keyBuffer = Buffer.from(keyBase64, "base64");
      const key = Array.from(keyBuffer.values());
      console.debug("key:", key);

      const expandedKeyBase64 =
        "gqngitQZdS6ihWF34xmxSkwN9fPhteFwvMrpDG6G5gbHJ48VEz76O7G7m0xSoioGTDcQnK2C8ewRSBjgf87+5k6cAcddovv87BlgsL67Srbi3cbST183Pl4XL94h2dE4f6IGOiIA/cbOGZ12cKLXwLPnyGj8uP9Woq/QiIN2AbBP3uHWbd4cEKPHgWbTZVam1ap5TCkShhqLvVaSCMtXIkCFcuYtW272jpzvkF35uTaZMy9JsCGpUzuc/8EzV6jjO0djJRYcDdOYgOJDxXlbdT+FFtSPpL+HtDhARodv6KXT3GUyxcBo4V1AiqKYOdHX";
      const expandedKeyBuffer = Buffer.from(expandedKeyBase64, "base64");
      const expandedKey = Array.from(expandedKeyBuffer.values());
      console.debug("expandedKey:", expandedKey);

      await circuit.expectPass({ key }, { expandedKey });
    });
  });
});
