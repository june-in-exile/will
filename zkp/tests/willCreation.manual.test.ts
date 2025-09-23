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
        expectedTestator: "0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc",
        expectedEstates: [
          {
            beneficiary: "0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c",
            token: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
            amount: 1000,
          },
        ],
      },
      {
        // This should pass
        ciphertext:
          "gwz1zYGR0sTE7obS/VEP7eaCivXEHtJiKFGTzWzMRT+gPK+wih235SHEg7uC481hJGU+hwB4kD+dp5EnG0QoJEESSAWPIXq8Cl1wmKGLYHv1qGGeixjaDZRcr0v6QoqisrEj1AL4itP5LHsij+9EBYPIXIuim1ihKzQOgZRot59G4YX8ewQ8UpMo4hF/7iDgOHqLiYMjNYa+GhojZfJsgbs8mWAo5Y2Qni5pxwlol0sV3Ij9kDaEzC5UKTRJGSE9l3IhNwMtld8KebTi990k/BtpjA6RLQpn81s6jZwS5ANgLOH7zJfJOvF/77oiCaT8n2ANeXM8V+lMgLhMzKl2P8/niyKyf6InRArcvlo=",
        key: "hZFRjYb+JWLLCAAj09eaVn/QZYAZ713OBudFsSAODzQ=",
        iv: "4SG7x28cTS7qZCI7cie9sg==",
        expectedTestator: "0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc",
        expectedEstates: [
          {
            beneficiary: "0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c",
            token: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
            amount: 1000,
          },
          {
            beneficiary: "0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c",
            token: "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E",
            amount: 5000000,
          },
        ],
      },
      {
        // This should fail due to incorrect testator
        ciphertext:
          "gwz1zYGR0sTE7obS/VEP7eaCivXEHtJiKFGTzWzMRT+gPK+wih235SHEg7uC481hJGU+hwB4kD+dp5EnG0QoJEESSAWPIXq8Cl1wmKGLYHv1qGGeixjaDZRcr0v6QoqisrEj1AL4itP5LHsij+9EBYPIXIuim1ihKzQOgZRot59G4YX8ewQ8UpMo4hF/7iDgOHqLiYMjNYa+GhojZfJsgbs8mWAo5Y2Qni5pxwlol0sV3Ij9kDaEzC5UKTRJGSE9l3IhNwMtld8KebTi990k/BtpjA6RLQpn81s6jZwS5ANgLOH7zJfJOvF/77oiCaT8n2ANeXM8V+lMgLhMzKl2P8/niyKyf6InRArcvlo=",
        key: "hZFRjYb+JWLLCAAj09eaVn/QZYAZ713OBudFsSAODzQ=",
        iv: "4SG7x28cTS7qZCI7cie9sg==",
        expectedTestator: "0x041F57c4492760aaE44ECed29b49a30DaAD3D4Dd",
        expectedEstates: [
          {
            beneficiary: "0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c",
            token: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
            amount: 1000,
          },
          {
            beneficiary: "0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c",
            token: "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E",
            amount: 5000000,
          },
        ],
      },
      {
        // This should fail due to incorrect beneficiaries
        ciphertext:
          "gwz1zYGR0sTE7obS/VEP7eaCivXEHtJiKFGTzWzMRT+gPK+wih235SHEg7uC481hJGU+hwB4kD+dp5EnG0QoJEESSAWPIXq8Cl1wmKGLYHv1qGGeixjaDZRcr0v6QoqisrEj1AL4itP5LHsij+9EBYPIXIuim1ihKzQOgZRot59G4YX8ewQ8UpMo4hF/7iDgOHqLiYMjNYa+GhojZfJsgbs8mWAo5Y2Qni5pxwlol0sV3Ij9kDaEzC5UKTRJGSE9l3IhNwMtld8KebTi990k/BtpjA6RLQpn81s6jZwS5ANgLOH7zJfJOvF/77oiCaT8n2ANeXM8V+lMgLhMzKl2P8/niyKyf6InRArcvlo=",
        key: "hZFRjYb+JWLLCAAj09eaVn/QZYAZ713OBudFsSAODzQ=",
        iv: "4SG7x28cTS7qZCI7cie9sg==",
        expectedTestator: "0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc",
        expectedEstates: [
          {
            beneficiary: "0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8D",
            token: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
            amount: 1000,
          },
          {
            beneficiary: "0x3fF1F826E1180d151200A4d5431a3Aa3142C4A81",
            token: "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E",
            amount: 5000000,
          },
        ],
      },
      {
        // This should fail due to incorrect tokens
        ciphertext:
          "gwz1zYGR0sTE7obS/VEP7eaCivXEHtJiKFGTzWzMRT+gPK+wih235SHEg7uC481hJGU+hwB4kD+dp5EnG0QoJEESSAWPIXq8Cl1wmKGLYHv1qGGeixjaDZRcr0v6QoqisrEj1AL4itP5LHsij+9EBYPIXIuim1ihKzQOgZRot59G4YX8ewQ8UpMo4hF/7iDgOHqLiYMjNYa+GhojZfJsgbs8mWAo5Y2Qni5pxwlol0sV3Ij9kDaEzC5UKTRJGSE9l3IhNwMtld8KebTi990k/BtpjA6RLQpn81s6jZwS5ANgLOH7zJfJOvF/77oiCaT8n2ANeXM8V+lMgLhMzKl2P8/niyKyf6InRArcvlo=",
        key: "hZFRjYb+JWLLCAAj09eaVn/QZYAZ713OBudFsSAODzQ=",
        iv: "4SG7x28cTS7qZCI7cie9sg==",
        expectedTestator: "0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc",
        expectedEstates: [
          {
            beneficiary: "0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c",
            token: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4e",
            amount: 1000,
          },
          {
            beneficiary: "0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c",
            token: "0xb1D4538B4571d411F07960EF2838Ce337FE1E80D",
            amount: 5000000,
          },
        ],
      },
      {
        // This should fail due to incorrect amounts
        ciphertext:
          "gwz1zYGR0sTE7obS/VEP7eaCivXEHtJiKFGTzWzMRT+gPK+wih235SHEg7uC481hJGU+hwB4kD+dp5EnG0QoJEESSAWPIXq8Cl1wmKGLYHv1qGGeixjaDZRcr0v6QoqisrEj1AL4itP5LHsij+9EBYPIXIuim1ihKzQOgZRot59G4YX8ewQ8UpMo4hF/7iDgOHqLiYMjNYa+GhojZfJsgbs8mWAo5Y2Qni5pxwlol0sV3Ij9kDaEzC5UKTRJGSE9l3IhNwMtld8KebTi990k/BtpjA6RLQpn81s6jZwS5ANgLOH7zJfJOvF/77oiCaT8n2ANeXM8V+lMgLhMzKl2P8/niyKyf6InRArcvlo=",
        key: "hZFRjYb+JWLLCAAj09eaVn/QZYAZ713OBudFsSAODzQ=",
        iv: "4SG7x28cTS7qZCI7cie9sg==",
        expectedTestator: "0x041F57c4492760aaE44ECed29b49a30DaAD3D4Cc",
        expectedEstates: [
          {
            beneficiary: "0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c",
            token: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
            amount: 999,
          },
          {
            beneficiary: "0x3fF1F826E1180d151200A4d5431a3Aa3142C4A8c",
            token: "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E",
            amount: 5000001,
          },
        ],
      },
    ];
    console.log(`Circuit input (copy and paste to input file directly):`);
    for (const {
      ciphertext,
      key,
      iv,
      expectedTestator,
      expectedEstates,
    } of inputs) {
      const processedInput = {
        ciphertext: base64ToBytes(ciphertext),
        key: base64ToBytes(key),
        iv: base64ToBytes(iv),
        expectedTestator: BigInt(expectedTestator),
        expectedEstates: expectedEstates.flatMap((estate) => [
          BigInt(estate.beneficiary),
          BigInt(estate.token),
          estate.amount,
        ]),
      };
      const formatted = Object.entries(processedInput)
        .map(([key, value]) => `  "${key}": ${JSON.stringify(value)}`)
        .join(",\n");
      console.log(`\nCreateWill(256, ${base64ToBytes(ciphertext).length}):`);
      console.log(`{\n${formatted}\n}`);
    }
  });
});
