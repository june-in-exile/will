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
