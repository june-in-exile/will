import { base64ToBytes } from "./util/index.js";

describe("Show CreateWill Input", function (): void {
  it("prints input for will creation circuit (i.e., ciphertext, key, iv in bytes, testator and estates)", async function (): Promise<void> {
    const inputs = [
      {
        // This should pass
        ciphertext:
          "8MDaLCLS/WgDf4F313JTSSiWo/pnUbeXWPtr2v25lVvgKflkg84al2xYpTWaZFj67RgsJUBc//GSryWq647omm8Li2vzinx2UwAUNTE8rpSHUr7oNjvzVJWmChhhTHl1cOgpc1PK0JWfpuRNIkrSCf1MIYCGvT8L3OPeUn2gBFMKbFmrctS2daQbenRNi+S619T17OBkZRLNVOsHozZ5md9wEvznnrbkvkC7vPvGuUmu5vaefZzR7migKShphXE+EEINw0dzEDMRjmzDQnrhh9+vDsMO",
        key: "5IlnCukhi59uvDirh9p1KaJ8k5qPIq1MRpvyRGxJvRo=",
        iv: "B+chVOVUruHHcafplMBFSA==",
      },
      {
        // This should pass
        ciphertext:
          "gwz1zYGR0sTE7obS/VEP7eaCivXEHtJiKFGTzWzMRT+gPK+wih235SHEg7uC481hJGU+hwB4kD+dp5EnG0QoJEESSAWPIXq8Cl1wmKGLYHv1qGGeixjaDZRcr0v6QoqisrEj1AL4itP5LHsij+9EBYPIXIuim1ihKzQOgZRot59G4YX8ewQ8UpMo4hF/7iDgOHqLiYMjNYa+GhojZfJsgbs8mWAo5Y2Qni5pxwlol0sV3Ij9kDaEzC5UKTRJGSE9l3IhNwMtld8KebTi990k/BtpjA6RLQpn81s6jZwS5ANgLOH7zJfJOvF/77oiCaT8n2ANeXM8V+lMgLhMzKl2P8/niyKyf6InRArcvlo=",
        key: "hZFRjYb+JWLLCAAj09eaVn/QZYAZ713OBudFsSAODzQ=",
        iv: "4SG7x28cTS7qZCI7cie9sg==",
      },
    ];
    console.log(`Circuit input (copy and paste to input file directly):`);
    for (const {
      ciphertext,
      key,
      iv,
    } of inputs) {
      const processedInput = {
        ciphertext: base64ToBytes(ciphertext),
        key: base64ToBytes(key),
        iv: base64ToBytes(iv),
      };
      const formatted = Object.entries(processedInput)
        .map(([key, value]) => `  "${key}": ${JSON.stringify(value)}`)
        .join(",\n");
      console.log(`\nCreateWill(256, ${base64ToBytes(ciphertext).length}):`);
      console.log(`{\n${formatted}\n}`);
    }
  });
});
