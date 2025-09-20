import { WitnessTester } from "./util/index.js";
import { base64ToBytes } from "./util/index.js";

describe.only("Verify Permit with 2 Estates", function (): void {
  it("should accept the cyphertext from valid permit data", async function (): Promise<void> {
    const base64Cyphertext = "wt8TqRBTJhTSOSN7evitCjUXnakYuxZP3ZSyoB+etoOAIyMyYfdjOKr45C77CTp83I08sItg4HXcete61Mh9l4h9UddeyJLLOXHH12oKCeIXffyrJ3hnxwW7UspMPlptu9GaAb35DkvNPRdds3KXJ650UEIFkvafcN3/tdVnxbE5F9fxcVH/DCNZRg83URD2kyHMqqxayTRJZxufqbDlbTRDmDpwvJCnWgxtGWSGhblQCwaMYFWHTtas+hJ97xUS8coh6XpMRKTgz8eiF/EMLXqM9xZpG2KqB2vJdoutYDhQFO015bdmvk661zGqT1ISuGPZ+zjouN7gASDEmXS4QV5Xqh4fIcBzcNGK5bo="
    const base64Key = "UIO+oDKTff4Yno2ZbgE2jjx9r+bh38JxdDxooXlMQco=";
    const base64IV = "yo8ODo2e8/VmUwQaPsewGA==";
    console.debug(base64ToBytes(base64Cyphertext).length);
    console.debug(base64ToBytes(base64Cyphertext).toString());
    console.debug(base64ToBytes(base64Key));
    console.debug(base64ToBytes(base64IV));
  });
});

describe("UploadCid Circuit", { timeout: 1800_000 }, function () {
  let circuit: WitnessTester<["cyphertext", "key", "iv"]>;

  describe("Verify 426-Byte Cyphertext (Including 1 Estate)", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/cidUpload/cidUpload.circom",
        "UploadCid",
        {
          templateParams: ["426"],
        },
      );
      circuit.setConstraint("426-byte cyphertext");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should accept correct key, correct iv, and cyphertext from valid permit", async function (): Promise<void> {
      const base64Cyphertext = "BRdh7mzdjZXnmmJPru+5A81eXrbdLuAZ51Rmg8Yrc20Nx/DqdnIqNhB7V1D7h7U04JaKS5Q9vk7pu0MGyfAsG8FGHH41U8w+JiU5KxXST3COeMzALqYknkMUvSEjEtxOHaNnBqnSXf6J8ANc4S9IkvhWyt2CpyaJE6RMRbZpjVVZJ+Qv5nO7aO5ipOq91kqNBFqjUkeQmIP1hk/MWuK62S6tmQ1IoDOZ73l+Kd9gFk6TNMQ8p73PAxCAvxhmvNP21h/NM9mbSQL+w5GSsqxa5eJ9Xe/f"
      const base64Key = "rSIxx5FLKaclQbtSyGFkN0VVVBFq6vwmyQTYosKL4Uo=";
      const base64IV = "c+tpqi2vEwyudJIDFWNVog==";

      await circuit.expectPass({
        cyphertext: base64ToBytes(base64Cyphertext),
        key: base64ToBytes(base64Key),
        iv: base64ToBytes(base64IV),
      })
    });

    it("should reject incorrect key", async function (): Promise<void> {
      const base64Cyphertext = "BRdh7mzdjZXnmmJPru+5A81eXrbdLuAZ51Rmg8Yrc20Nx/DqdnIqNhB7V1D7h7U04JaKS5Q9vk7pu0MGyfAsG8FGHH41U8w+JiU5KxXST3COeMzALqYknkMUvSEjEtxOHaNnBqnSXf6J8ANc4S9IkvhWyt2CpyaJE6RMRbZpjVVZJ+Qv5nO7aO5ipOq91kqNBFqjUkeQmIP1hk/MWuK62S6tmQ1IoDOZ73l+Kd9gFk6TNMQ8p73PAxCAvxhmvNP21h/NM9mbSQL+w5GSsqxa5eJ9Xe/f"
      const base64Key = "3SQjQSJvr0FgzKiApuvUhkVk6/JAmckogFXhtTaa03k="; // incorrect key
      const base64IV = "c+tpqi2vEwyudJIDFWNVog==";

      await circuit.expectFail({
        cyphertext: base64ToBytes(base64Cyphertext),
        key: base64ToBytes(base64Key),
        iv: base64ToBytes(base64IV),
      })
    });

    it("should reject incorrect iv", async function (): Promise<void> {
      const base64Cyphertext = "BRdh7mzdjZXnmmJPru+5A81eXrbdLuAZ51Rmg8Yrc20Nx/DqdnIqNhB7V1D7h7U04JaKS5Q9vk7pu0MGyfAsG8FGHH41U8w+JiU5KxXST3COeMzALqYknkMUvSEjEtxOHaNnBqnSXf6J8ANc4S9IkvhWyt2CpyaJE6RMRbZpjVVZJ+Qv5nO7aO5ipOq91kqNBFqjUkeQmIP1hk/MWuK62S6tmQ1IoDOZ73l+Kd9gFk6TNMQ8p73PAxCAvxhmvNP21h/NM9mbSQL+w5GSsqxa5eJ9Xe/f"
      const base64Key = "rSIxx5FLKaclQbtSyGFkN0VVVBFq6vwmyQTYosKL4Uo=";
      const base64IV = "Do0cIxKbgadV1z3v"; // incorrect IV

      await circuit.expectFail({
        cyphertext: base64ToBytes(base64Cyphertext),
        key: base64ToBytes(base64Key),
        iv: base64ToBytes(base64IV),
      })
    });

    it("should reject cyphertext from invalid permit data", async function (): Promise<void> {
      const base64Cyphertext = "78io5bCvYpZKiEXIdQz9AAAKT6EbzFS8SJFhXACDBSNLnEp3p7SD9pAitA+RuR160L1dSa7L50ey8+NHEMSr6tv6OAjKMh3gqiw3AQEhWKkrPakcZlo72L36PxuLjwptF0pHi4f5yCFrFVmxPg0pZa+K0amp9aaxmYAvqDELh9+5UuMEu9bwccXcrmmuMW1r6an/p27mgnVLSa8jTgZ5wLRwDJSQ6P5Ywf2JPeDG9YFtRQ+3Uzhd1RpqPQ20ru81Ld/UlMbHMVRMvcRGL3UQxr4b04mH"; // cyphertext from invalid permit data
      const base64Key = "870/dVx8oCY3JDPWZKI/7J3s/kMIOPPQuNuvaU/sXPA=";
      const base64IV = "a+d6U5XSnEFyxeUyA0OLpQ==";

      await circuit.expectFail({
        cyphertext: base64ToBytes(base64Cyphertext),
        key: base64ToBytes(base64Key),
        iv: base64ToBytes(base64IV),
      })
    });
  });

  describe("Verify 538-Byte Cyphertext (Including 2 Estates)", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/cidUpload/cidUpload.circom",
        "UploadCid",
        {
          templateParams: ["538"],
        },
      );
      circuit.setConstraint("538-byte cyphertext");
    });

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should accept correct key, correct iv, and cyphertext from valid permit", async function (): Promise<void> {
      const base64Cyphertext = "wt8TqRBTJhTSOSN7evitCjUXnakYuxZP3ZSyoB+etoOAIyMyYfdjOKr45C77CTp83I08sItg4HXcete61Mh9l4h9UddeyJLLOXHH12oKCeIXffyrJ3hnxwW7UspMPlptu9GaAb35DkvNPRdds3KXJ650UEIFkvafcN3/tdVnxbE5F9fxcVH/DCNZRg83URD2kyHMqqxayTRJZxufqbDlbTRDmDpwvJCnWgxtGWSGhblQCwaMYFWHTtas+hJ97xUS8coh6XpMRKTgz8eiF/EMLXqM9xZpG2KqB2vJdoutYDhQFO015bdmvk661zGqT1ISuGPZ+zjouN7gASDEmXS4QV5Xqh4fIcBzcNGK5bo="
      const base64Key = "UIO+oDKTff4Yno2ZbgE2jjx9r+bh38JxdDxooXlMQco=";
      const base64IV = "yo8ODo2e8/VmUwQaPsewGA==";

      await circuit.expectPass({
        cyphertext: base64ToBytes(base64Cyphertext),
        key: base64ToBytes(base64Key),
        iv: base64ToBytes(base64IV),
      })
    });

    it("should reject incorrect key", async function (): Promise<void> {
      const base64Cyphertext = "wt8TqRBTJhTSOSN7evitCjUXnakYuxZP3ZSyoB+etoOAIyMyYfdjOKr45C77CTp83I08sItg4HXcete61Mh9l4h9UddeyJLLOXHH12oKCeIXffyrJ3hnxwW7UspMPlptu9GaAb35DkvNPRdds3KXJ650UEIFkvafcN3/tdVnxbE5F9fxcVH/DCNZRg83URD2kyHMqqxayTRJZxufqbDlbTRDmDpwvJCnWgxtGWSGhblQCwaMYFWHTtas+hJ97xUS8coh6XpMRKTgz8eiF/EMLXqM9xZpG2KqB2vJdoutYDhQFO015bdmvk661zGqT1ISuGPZ+zjouN7gASDEmXS4QV5Xqh4fIcBzcNGK5bo="
      const base64Key = "dcWGbuq/R2D2qExhIvobH9ux2T+tKhx/w0wta8PbJNM="; // incorrect key
      const base64IV = "yo8ODo2e8/VmUwQaPsewGA==";

      await circuit.expectFail({
        cyphertext: base64ToBytes(base64Cyphertext),
        key: base64ToBytes(base64Key),
        iv: base64ToBytes(base64IV),
      })
    });

    it("should reject incorrect iv", async function (): Promise<void> {
      const base64Cyphertext = "wt8TqRBTJhTSOSN7evitCjUXnakYuxZP3ZSyoB+etoOAIyMyYfdjOKr45C77CTp83I08sItg4HXcete61Mh9l4h9UddeyJLLOXHH12oKCeIXffyrJ3hnxwW7UspMPlptu9GaAb35DkvNPRdds3KXJ650UEIFkvafcN3/tdVnxbE5F9fxcVH/DCNZRg83URD2kyHMqqxayTRJZxufqbDlbTRDmDpwvJCnWgxtGWSGhblQCwaMYFWHTtas+hJ97xUS8coh6XpMRKTgz8eiF/EMLXqM9xZpG2KqB2vJdoutYDhQFO015bdmvk661zGqT1ISuGPZ+zjouN7gASDEmXS4QV5Xqh4fIcBzcNGK5bo="
      const base64Key = "UIO+oDKTff4Yno2ZbgE2jjx9r+bh38JxdDxooXlMQco=";
      const base64IV = "KLpNadSdX8qjZvDx"; // incorrect IV

      await circuit.expectFail({
        cyphertext: base64ToBytes(base64Cyphertext),
        key: base64ToBytes(base64Key),
        iv: base64ToBytes(base64IV),
      })
    });

    it("should reject cyphertext from invalid permit data", async function (): Promise<void> {
      const base64Cyphertext = "t8K3LkQRzs4kxlnIfkpf2Xu2m5elg1DwUbVfrKclnJXE1P01/fo/UC/XZt2k/OfTEJl863f8ObDWMBK+htWvwWVV3vko6bIORIkUBfAU7Ixi5BUMbwchbF+qWvTfktR6eZMR0vcSJwUdLBnJWqi2N1clrqzES3Wf3oyE3h1zMW1e5CPMOsrUQMCXtI9OLHZ04PfPXUiZEDDWxSiPnBbZG5EwTAJ4u7yffq9gk9AvEACD3LqY5QXxIIw6fNA9eNxV18VjnzsLQGkMtmow2ZCD0YRiOnqahMMjEBSYU9pB+Xy0IHMmPP+vIWiOHIyZTLXurwY9vQA3sUjrB0WtiX9ULZbskymble/zyXUIg74="; // cyphertext from invalid permit data
      const base64Key = "Wni/AtHMbofKApaXCGfVHqmKV8PEh82Lk9GU6dAP7k4=";
      const base64IV = "5maSV+G7OZDqQGogQYMhsg==";

      await circuit.expectFail({
        cyphertext: base64ToBytes(base64Cyphertext),
        key: base64ToBytes(base64Key),
        iv: base64ToBytes(base64IV),
      })
    });
  });
});
