import { base64ToBytes } from "./util/index.js";

describe("Show UploadCid Input", function (): void {
  it("prints input for cid upload circuit (i.e., ciphertext, key, and iv in bytes)", async function (): Promise<void> {
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
          "wt8TqRBTJhTSOSN7evitCjUXnakYuxZP3ZSyoB+etoOAIyMyYfdjOKr45C77CTp83I08sItg4HXcete61Mh9l4h9UddeyJLLOXHH12oKCeIXffyrJ3hnxwW7UspMPlptu9GaAb35DkvNPRdds3KXJ650UEIFkvafcN3/tdVnxbE5F9fxcVH/DCNZRg83URD2kyHMqqxayTRJZxufqbDlbTRDmDpwvJCnWgxtGWSGhblQCwaMYFWHTtas+hJ97xUS8coh6XpMRKTgz8eiF/EMLXqM9xZpG2KqB2vJdoutYDhQFO015bdmvk661zGqT1ISuGPZ+zjouN7gASDEmXS4QV5Xqh4fIcBzcNGK5bo=",
        key: "UIO+oDKTff4Yno2ZbgE2jjx9r+bh38JxdDxooXlMQco=",
        iv: "yo8ODo2e8/VmUwQaPsewGA==",
      },
      {
        // This should fail due to incorrect key
        ciphertext:
          "wt8TqRBTJhTSOSN7evitCjUXnakYuxZP3ZSyoB+etoOAIyMyYfdjOKr45C77CTp83I08sItg4HXcete61Mh9l4h9UddeyJLLOXHH12oKCeIXffyrJ3hnxwW7UspMPlptu9GaAb35DkvNPRdds3KXJ650UEIFkvafcN3/tdVnxbE5F9fxcVH/DCNZRg83URD2kyHMqqxayTRJZxufqbDlbTRDmDpwvJCnWgxtGWSGhblQCwaMYFWHTtas+hJ97xUS8coh6XpMRKTgz8eiF/EMLXqM9xZpG2KqB2vJdoutYDhQFO015bdmvk661zGqT1ISuGPZ+zjouN7gASDEmXS4QV5Xqh4fIcBzcNGK5bo=",
        key: "KIO+oDKTff4Yno2ZbgE2jjx9r+bh38JxdDxooXlMQco=",
        iv: "yo8ODo2e8/VmUwQaPsewGA==",
      },
      {
        // This should fail due to incorrect IV
        ciphertext:
          "wt8TqRBTJhTSOSN7evitCjUXnakYuxZP3ZSyoB+etoOAIyMyYfdjOKr45C77CTp83I08sItg4HXcete61Mh9l4h9UddeyJLLOXHH12oKCeIXffyrJ3hnxwW7UspMPlptu9GaAb35DkvNPRdds3KXJ650UEIFkvafcN3/tdVnxbE5F9fxcVH/DCNZRg83URD2kyHMqqxayTRJZxufqbDlbTRDmDpwvJCnWgxtGWSGhblQCwaMYFWHTtas+hJ97xUS8coh6XpMRKTgz8eiF/EMLXqM9xZpG2KqB2vJdoutYDhQFO015bdmvk661zGqT1ISuGPZ+zjouN7gASDEmXS4QV5Xqh4fIcBzcNGK5bo=",
        key: "UIO+oDKTff4Yno2ZbgE2jjx9r+bh38JxdDxooXlMQco=",
        iv: "mo8ODo2e8/VmUwQaPsewGA==",
      },
      {
        // This should fail due to invalid signature
        ciphertext:
          "RL2Lv5NTrbDZMyqCoTDaGUzNbeJsnOxghzD+7RKrXF7lnfiXDeRAIUvzq3stdVaayQKjPIPLNMez1yhR2N49jjCArumnlCENeMOXQot05k3z1gz01GINfB/vlAWEUcrhaN7TSVMiK8FMWtM4lUaTNUywSOt/5oJgOsqZV8YT+bNO0X5LJyVQSe7kXgb7UM2oy83wl5wVdU3WxH8eco7IbFlnCI7vBmgKr1hsTCwCCQqOi0lctjBtMaBOl6cnelnnnZiGXI9C4pxf9nE6/tdyNtt0MJdFQMUWzB9qlKZJ1rYVfBMhcyMu7oSt64ynNArg8dhkSN4g3h9qpinFWW/vW1mKGEob6mGCPolxUVY=",
        key: "g/8JPmwATzTcor0bSVNEiawDynKZXyWEPDIgUFGKlkM=",
        iv: "WOc1gfJGldp6c+3xk6M46Q==",
      },
    ];
    console.log(`Circuit input (copy and paste to input file directly):`);
    for (const input of inputs) {
      const bytesInput = Object.entries(input)
        .map(
          ([key, value]) =>
            `  "${key}": ${JSON.stringify(base64ToBytes(value))}`,
        )
        .join(",\n");

      console.log(
        `\nUploadCid(256, ${base64ToBytes(input.ciphertext).length}):`,
      );
      console.log(`{\n${bytesInput}\n}`);
    }
  });
});

// describe("UploadCid Circuit", { timeout: 1800_000 }, function () {
//   let circuit: WitnessTester<["ciphertext", "key", "iv"]>;

//   describe("Verify 213-Byte ciphertext (Including 1 Estate)", function (): void {
//     beforeAll(async function (): Promise<void> {
//       circuit = await WitnessTester.construct(
//         "circuits/cidUpload/cidUpload.circom",
//         "UploadCid",
//         {
//           templateParams: ["213"],
//         },
//       );
//       circuit.setConstraint("213-byte ciphertext");
//     });

//     afterAll(async function (): Promise<void> {
//       if (circuit) {
//         await circuit.release();
//       }
//     });

//     it("should accept correct key, correct iv, and ciphertext from valid permit", async function (): Promise<void> {
//       const base64ciphertext = "BRdh7mzdjZXnmmJPru+5A81eXrbdLuAZ51Rmg8Yrc20Nx/DqdnIqNhB7V1D7h7U04JaKS5Q9vk7pu0MGyfAsG8FGHH41U8w+JiU5KxXST3COeMzALqYknkMUvSEjEtxOHaNnBqnSXf6J8ANc4S9IkvhWyt2CpyaJE6RMRbZpjVVZJ+Qv5nO7aO5ipOq91kqNBFqjUkeQmIP1hk/MWuK62S6tmQ1IoDOZ73l+Kd9gFk6TNMQ8p73PAxCAvxhmvNP21h/NM9mbSQL+w5GSsqxa5eJ9Xe/f"
//       const base64Key = "rSIxx5FLKaclQbtSyGFkN0VVVBFq6vwmyQTYosKL4Uo=";
//       const base64IV = "c+tpqi2vEwyudJIDFWNVog==";

//       await circuit.expectPass({
//         ciphertext: base64ToBytes(base64ciphertext),
//         key: base64ToBytes(base64Key),
//         iv: base64ToBytes(base64IV),
//       })
//     });

//     it("should reject incorrect key", async function (): Promise<void> {
//       const base64ciphertext = "BRdh7mzdjZXnmmJPru+5A81eXrbdLuAZ51Rmg8Yrc20Nx/DqdnIqNhB7V1D7h7U04JaKS5Q9vk7pu0MGyfAsG8FGHH41U8w+JiU5KxXST3COeMzALqYknkMUvSEjEtxOHaNnBqnSXf6J8ANc4S9IkvhWyt2CpyaJE6RMRbZpjVVZJ+Qv5nO7aO5ipOq91kqNBFqjUkeQmIP1hk/MWuK62S6tmQ1IoDOZ73l+Kd9gFk6TNMQ8p73PAxCAvxhmvNP21h/NM9mbSQL+w5GSsqxa5eJ9Xe/f"
//       const base64Key = "3SQjQSJvr0FgzKiApuvUhkVk6/JAmckogFXhtTaa03k="; // incorrect key
//       const base64IV = "c+tpqi2vEwyudJIDFWNVog==";

//       await circuit.expectFail({
//         ciphertext: base64ToBytes(base64ciphertext),
//         key: base64ToBytes(base64Key),
//         iv: base64ToBytes(base64IV),
//       })
//     });

//     it("should reject incorrect iv", async function (): Promise<void> {
//       const base64ciphertext = "BRdh7mzdjZXnmmJPru+5A81eXrbdLuAZ51Rmg8Yrc20Nx/DqdnIqNhB7V1D7h7U04JaKS5Q9vk7pu0MGyfAsG8FGHH41U8w+JiU5KxXST3COeMzALqYknkMUvSEjEtxOHaNnBqnSXf6J8ANc4S9IkvhWyt2CpyaJE6RMRbZpjVVZJ+Qv5nO7aO5ipOq91kqNBFqjUkeQmIP1hk/MWuK62S6tmQ1IoDOZ73l+Kd9gFk6TNMQ8p73PAxCAvxhmvNP21h/NM9mbSQL+w5GSsqxa5eJ9Xe/f"
//       const base64Key = "rSIxx5FLKaclQbtSyGFkN0VVVBFq6vwmyQTYosKL4Uo=";
//       const base64IV = "Do0cIxKbgadV1z3v"; // incorrect IV

//       await circuit.expectFail({
//         ciphertext: base64ToBytes(base64ciphertext),
//         key: base64ToBytes(base64Key),
//         iv: base64ToBytes(base64IV),
//       })
//     });

//     it("should reject ciphertext from invalid permit data", async function (): Promise<void> {
//       const base64ciphertext = "78io5bCvYpZKiEXIdQz9AAAKT6EbzFS8SJFhXACDBSNLnEp3p7SD9pAitA+RuR160L1dSa7L50ey8+NHEMSr6tv6OAjKMh3gqiw3AQEhWKkrPakcZlo72L36PxuLjwptF0pHi4f5yCFrFVmxPg0pZa+K0amp9aaxmYAvqDELh9+5UuMEu9bwccXcrmmuMW1r6an/p27mgnVLSa8jTgZ5wLRwDJSQ6P5Ywf2JPeDG9YFtRQ+3Uzhd1RpqPQ20ru81Ld/UlMbHMVRMvcRGL3UQxr4b04mH"; // ciphertext from invalid permit data
//       const base64Key = "870/dVx8oCY3JDPWZKI/7J3s/kMIOPPQuNuvaU/sXPA=";
//       const base64IV = "a+d6U5XSnEFyxeUyA0OLpQ==";

//       await circuit.expectFail({
//         ciphertext: base64ToBytes(base64ciphertext),
//         key: base64ToBytes(base64Key),
//         iv: base64ToBytes(base64IV),
//       })
//     });
//   });

//   describe("Verify 269-Byte ciphertext (Including 2 Estates)", function (): void {
//     beforeAll(async function (): Promise<void> {
//       circuit = await WitnessTester.construct(
//         "circuits/cidUpload/cidUpload.circom",
//         "UploadCid",
//         {
//           templateParams: ["269"],
//         },
//       );
//       circuit.setConstraint("269-byte ciphertext");
//     });

//     afterAll(async function (): Promise<void> {
//       if (circuit) {
//         await circuit.release();
//       }
//     });

//     it("should accept correct key, correct iv, and ciphertext from valid permit", async function (): Promise<void> {
//       const base64ciphertext = "wt8TqRBTJhTSOSN7evitCjUXnakYuxZP3ZSyoB+etoOAIyMyYfdjOKr45C77CTp83I08sItg4HXcete61Mh9l4h9UddeyJLLOXHH12oKCeIXffyrJ3hnxwW7UspMPlptu9GaAb35DkvNPRdds3KXJ650UEIFkvafcN3/tdVnxbE5F9fxcVH/DCNZRg83URD2kyHMqqxayTRJZxufqbDlbTRDmDpwvJCnWgxtGWSGhblQCwaMYFWHTtas+hJ97xUS8coh6XpMRKTgz8eiF/EMLXqM9xZpG2KqB2vJdoutYDhQFO015bdmvk661zGqT1ISuGPZ+zjouN7gASDEmXS4QV5Xqh4fIcBzcNGK5bo="
//       const base64Key = "UIO+oDKTff4Yno2ZbgE2jjx9r+bh38JxdDxooXlMQco=";
//       const base64IV = "yo8ODo2e8/VmUwQaPsewGA==";

//       await circuit.expectPass({
//         ciphertext: base64ToBytes(base64ciphertext),
//         key: base64ToBytes(base64Key),
//         iv: base64ToBytes(base64IV),
//       })
//     });

//     it("should reject incorrect key", async function (): Promise<void> {
//       const base64ciphertext = "wt8TqRBTJhTSOSN7evitCjUXnakYuxZP3ZSyoB+etoOAIyMyYfdjOKr45C77CTp83I08sItg4HXcete61Mh9l4h9UddeyJLLOXHH12oKCeIXffyrJ3hnxwW7UspMPlptu9GaAb35DkvNPRdds3KXJ650UEIFkvafcN3/tdVnxbE5F9fxcVH/DCNZRg83URD2kyHMqqxayTRJZxufqbDlbTRDmDpwvJCnWgxtGWSGhblQCwaMYFWHTtas+hJ97xUS8coh6XpMRKTgz8eiF/EMLXqM9xZpG2KqB2vJdoutYDhQFO015bdmvk661zGqT1ISuGPZ+zjouN7gASDEmXS4QV5Xqh4fIcBzcNGK5bo="
//       const base64Key = "dcWGbuq/R2D2qExhIvobH9ux2T+tKhx/w0wta8PbJNM="; // incorrect key
//       const base64IV = "yo8ODo2e8/VmUwQaPsewGA==";

//       await circuit.expectFail({
//         ciphertext: base64ToBytes(base64ciphertext),
//         key: base64ToBytes(base64Key),
//         iv: base64ToBytes(base64IV),
//       })
//     });

//     it("should reject incorrect iv", async function (): Promise<void> {
//       const base64ciphertext = "wt8TqRBTJhTSOSN7evitCjUXnakYuxZP3ZSyoB+etoOAIyMyYfdjOKr45C77CTp83I08sItg4HXcete61Mh9l4h9UddeyJLLOXHH12oKCeIXffyrJ3hnxwW7UspMPlptu9GaAb35DkvNPRdds3KXJ650UEIFkvafcN3/tdVnxbE5F9fxcVH/DCNZRg83URD2kyHMqqxayTRJZxufqbDlbTRDmDpwvJCnWgxtGWSGhblQCwaMYFWHTtas+hJ97xUS8coh6XpMRKTgz8eiF/EMLXqM9xZpG2KqB2vJdoutYDhQFO015bdmvk661zGqT1ISuGPZ+zjouN7gASDEmXS4QV5Xqh4fIcBzcNGK5bo="
//       const base64Key = "UIO+oDKTff4Yno2ZbgE2jjx9r+bh38JxdDxooXlMQco=";
//       const base64IV = "KLpNadSdX8qjZvDx"; // incorrect IV

//       await circuit.expectFail({
//         ciphertext: base64ToBytes(base64ciphertext),
//         key: base64ToBytes(base64Key),
//         iv: base64ToBytes(base64IV),
//       })
//     });

//     it("should reject ciphertext from invalid permit data", async function (): Promise<void> {
//       const base64ciphertext = "t8K3LkQRzs4kxlnIfkpf2Xu2m5elg1DwUbVfrKclnJXE1P01/fo/UC/XZt2k/OfTEJl863f8ObDWMBK+htWvwWVV3vko6bIORIkUBfAU7Ixi5BUMbwchbF+qWvTfktR6eZMR0vcSJwUdLBnJWqi2N1clrqzES3Wf3oyE3h1zMW1e5CPMOsrUQMCXtI9OLHZ04PfPXUiZEDDWxSiPnBbZG5EwTAJ4u7yffq9gk9AvEACD3LqY5QXxIIw6fNA9eNxV18VjnzsLQGkMtmow2ZCD0YRiOnqahMMjEBSYU9pB+Xy0IHMmPP+vIWiOHIyZTLXurwY9vQA3sUjrB0WtiX9ULZbskymble/zyXUIg74="; // ciphertext from invalid permit data
//       const base64Key = "Wni/AtHMbofKApaXCGfVHqmKV8PEh82Lk9GU6dAP7k4=";
//       const base64IV = "5maSV+G7OZDqQGogQYMhsg==";

//       await circuit.expectFail({
//         ciphertext: base64ToBytes(base64ciphertext),
//         key: base64ToBytes(base64Key),
//         iv: base64ToBytes(base64IV),
//       })
//     });
//   });
// });
