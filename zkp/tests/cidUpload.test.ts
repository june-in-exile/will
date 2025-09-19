import { WitnessTester } from "./util/index.js";
import { base64ToBytes } from "./util/index.js";

describe.skip("Verify Permit with 2 Estates", function (): void {
  it("should accept the cyphertext from valid permit data", async function (): Promise<void> {
    const validCyphertext = "deGcOyb6wnd+2qOFYGabdsCQ3leISiDK4lvkzWacfsyCT3ZUgKiedk5g1LoPXzOhAD1kx+O/os1lAI9QC0AixoCTfay1vblhC+Y90m8RTzGjxAEifGX3gVOrrBKvjVjAdrPF6AkwUlcqRAPc9clVI5bMYc6I4+eyHZLpbX/zN51EnULjJXrcVIZWnl+adswxgHHddsIMWh9C1C5OBNlMWRyC1rC13P2K4qS0v3DZFxXvrKhp1mzwzh1BZbCdqsmyNOJho9Ac9egvQcaZ0S0o83NaT4mfiDTY+9MITT3Iagc8EPR1yoy4xh7P9ynYd6+xWwQjnOTqTrOS5XCDjH4i2/w9VNk05inV2KQqNfJXanjgMj60Y1N4wU2yXrITj/F8+GV+gLxTupOOTWtn4SjJNedUPD0TJFrRUecuYMs8mV1qObp+oAkDO0B45ADt968bD2kBgCK1xqpx6hXtozu3gFrf5mtypk/HRSAlCZY+tbgKrsRql9+rPFGT25MQN/CGwQnndLb/qO9yoxnEdWjM8nWKgix84FDCsOUKYnKfm/9Z8aOwQxAfecX54x9595u80vqyMPOhqvAM2xrzGWBeTG3zTuhFF2QILeg6VZjvbLyZnwj9hAy9J1pJj6nfNa8vCRjAF+q57j/eIJ4fXnTrG5BK1VMlih0myXPFvjtU9MIel+jI1foBGoloZ5Inrskn9OIWeGbJ+CLXUQ=="
    const bytesCyphertext = base64ToBytes(validCyphertext);
    console.debug(bytesCyphertext.length);
    console.debug(bytesCyphertext);
  });
});

describe("UploadCid Circuit", { timeout: 1800_000 }, function () {
  let circuit: WitnessTester<["cyphertext", "key", "iv"]>;

  describe("Verify Permit with 2 Estates", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/cidUpload/cidUpload.circom",
        "UploadCid",
        {
          templateParams: ["269"],
        },
      );
      circuit.setConstraint("269-byte cyphertext");
    }, 1200_000);

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should accept correct key, correct iv, and cyphertext from valid permit", async function (): Promise<void> {
      const base64Cyphertext = "deGcOyb6wnd+2qOFYGabdsCQ3leISiDK4lvkzWacfsyCT3ZUgKiedk5g1LoPXzOhAD1kx+O/os1lAI9QC0AixoCTfay1vblhC+Y90m8RTzGjxAEifGX3gVOrrBKvjVjAdrPF6AkwUlcqRAPc9clVI5bMYc6I4+eyHZLpbX/zN51EnULjJXrcVIZWnl+adswxgHHddsIMWh9C1C5OBNlMWRyC1rC13P2K4qS0v3DZFxXvrKhp1mzwzh1BZbCdqsmyNOJho9Ac9egvQcaZ0S0o83NaT4mfiDTY+9MITT3Iagc8EPR1yoy4xh7P9ynYd6+xWwQjnOTqTrOS5XCDjH4i2/w9VNk05inV2KQqNfJXanjgMj60Y1N4wU2yXrITj/F8+GV+gLxTupOOTWtn4SjJNedUPD0TJFrRUecuYMs8mV1qObp+oAkDO0B45ADt968bD2kBgCK1xqpx6hXtozu3gFrf5mtypk/HRSAlCZY+tbgKrsRql9+rPFGT25MQN/CGwQnndLb/qO9yoxnEdWjM8nWKgix84FDCsOUKYnKfm/9Z8aOwQxAfecX54x9595u80vqyMPOhqvAM2xrzGWBeTG3zTuhFF2QILeg6VZjvbLyZnwj9hAy9J1pJj6nfNa8vCRjAF+q57j/eIJ4fXnTrG5BK1VMlih0myXPFvjtU9MIel+jI1foBGoloZ5Inrskn9OIWeGbJ+CLXUQ=="
      const base64Key = "CcWGbuq/R2D2qExhIvobH9ux2T+tKhx/w0wta8PbJNM=";
      const base64IV = "fLpNadSdX8qjZvDx";

      await circuit.expectPass({
        cyphertext: base64ToBytes(base64Cyphertext),
        key: base64ToBytes(base64Key),
        iv: base64ToBytes(base64IV),
      })
    });

    it("should reject incorrect key", async function (): Promise<void> {
      const base64Cyphertext = "deGcOyb6wnd+2qOFYGabdsCQ3leISiDK4lvkzWacfsyCT3ZUgKiedk5g1LoPXzOhAD1kx+O/os1lAI9QC0AixoCTfay1vblhC+Y90m8RTzGjxAEifGX3gVOrrBKvjVjAdrPF6AkwUlcqRAPc9clVI5bMYc6I4+eyHZLpbX/zN51EnULjJXrcVIZWnl+adswxgHHddsIMWh9C1C5OBNlMWRyC1rC13P2K4qS0v3DZFxXvrKhp1mzwzh1BZbCdqsmyNOJho9Ac9egvQcaZ0S0o83NaT4mfiDTY+9MITT3Iagc8EPR1yoy4xh7P9ynYd6+xWwQjnOTqTrOS5XCDjH4i2/w9VNk05inV2KQqNfJXanjgMj60Y1N4wU2yXrITj/F8+GV+gLxTupOOTWtn4SjJNedUPD0TJFrRUecuYMs8mV1qObp+oAkDO0B45ADt968bD2kBgCK1xqpx6hXtozu3gFrf5mtypk/HRSAlCZY+tbgKrsRql9+rPFGT25MQN/CGwQnndLb/qO9yoxnEdWjM8nWKgix84FDCsOUKYnKfm/9Z8aOwQxAfecX54x9595u80vqyMPOhqvAM2xrzGWBeTG3zTuhFF2QILeg6VZjvbLyZnwj9hAy9J1pJj6nfNa8vCRjAF+q57j/eIJ4fXnTrG5BK1VMlih0myXPFvjtU9MIel+jI1foBGoloZ5Inrskn9OIWeGbJ+CLXUQ=="
      const base64Key = "";  // incorrect key
      const base64IV = "fLpNadSdX8qjZvDx";

      await circuit.expectFail({
        cyphertext: base64ToBytes(base64Cyphertext),
        key: base64ToBytes(base64Key),
        iv: base64ToBytes(base64IV),
      })
    });

    it("should reject incorrect iv", async function (): Promise<void> {
      const base64Cyphertext = "deGcOyb6wnd+2qOFYGabdsCQ3leISiDK4lvkzWacfsyCT3ZUgKiedk5g1LoPXzOhAD1kx+O/os1lAI9QC0AixoCTfay1vblhC+Y90m8RTzGjxAEifGX3gVOrrBKvjVjAdrPF6AkwUlcqRAPc9clVI5bMYc6I4+eyHZLpbX/zN51EnULjJXrcVIZWnl+adswxgHHddsIMWh9C1C5OBNlMWRyC1rC13P2K4qS0v3DZFxXvrKhp1mzwzh1BZbCdqsmyNOJho9Ac9egvQcaZ0S0o83NaT4mfiDTY+9MITT3Iagc8EPR1yoy4xh7P9ynYd6+xWwQjnOTqTrOS5XCDjH4i2/w9VNk05inV2KQqNfJXanjgMj60Y1N4wU2yXrITj/F8+GV+gLxTupOOTWtn4SjJNedUPD0TJFrRUecuYMs8mV1qObp+oAkDO0B45ADt968bD2kBgCK1xqpx6hXtozu3gFrf5mtypk/HRSAlCZY+tbgKrsRql9+rPFGT25MQN/CGwQnndLb/qO9yoxnEdWjM8nWKgix84FDCsOUKYnKfm/9Z8aOwQxAfecX54x9595u80vqyMPOhqvAM2xrzGWBeTG3zTuhFF2QILeg6VZjvbLyZnwj9hAy9J1pJj6nfNa8vCRjAF+q57j/eIJ4fXnTrG5BK1VMlih0myXPFvjtU9MIel+jI1foBGoloZ5Inrskn9OIWeGbJ+CLXUQ=="
      const base64Key = "CcWGbuq/R2D2qExhIvobH9ux2T+tKhx/w0wta8PbJNM=";
      const base64IV = "";  // incorrect IV

      await circuit.expectFail({
        cyphertext: base64ToBytes(base64Cyphertext),
        key: base64ToBytes(base64Key),
        iv: base64ToBytes(base64IV),
      })
    });

    it("should reject cyphertext from invalid permit data", async function (): Promise<void> {
      const base64Cyphertext = "pb2FxiRs3mbzotfi7eKPHPTzqEdpC4m6Wd+OJy9rqrNjNXOxjh+inuQc1OWlaOMKshp3kAiayL1DUranOQ4bQJte0jrLkSFs0YIybIW0IAawt5k4pP+PdEnHVJYsYYeVKjD0/+kRjwEkyOqHxErBLKYWvYWx2OyyFxKk4qaFIUruqQICCR84t+TzaTUANc84buC4iYqUeVm6YzMK/wXpwmFWJ1qf0kz+9CLcbpEHqcAR8iD3ESgnHppIbfyNuGT3AZ5JqCNg3jjVCRN3MuvsjyWbkXHI0TDi+Sgz2gg+KCm/IyZ1FyzFqrpILfS7wNJMzpvG04xUsIKPrQyutcPJkF75s0Hk3IW+AwZjACE1hCG+JeWlRrg8WXV9/DOqOHgrRPAMl61otM7L6M+e3qP7lEDEO9hcsBuS6PPCQyHn1Q9S4FNmMokg8P2bWZyzcTezphRLyum+DADKTZy3LGWoojRwiaxt/guasVcYrNKFAmXftBiaP1nVxNPUtN+GTammXEpaCR27TjNzVZJdWLETNOqFpABR+2nTdup5y9sJIuoqhYaGp9HGvG0f2357eRQo+kGfxDsqjM2a/IUxYyKOis4eSbU8u/VbeNrpZywpZZJk8aT/ND3QgsShYwuVqgGXG9RF833VV7qKzX3y5QdxDg+WgtPutOh9/Rhfxe9rm8uECBtcaTUpKDRIz3W7iGfDzYitGhQzyukF3g=="; // cyphertext from invalid permit data
      const base64Key = "CcWGbuq/R2D2qExhIvobH9ux2T+tKhx/w0wta8PbJNM=";
      const base64IV = "fLpNadSdX8qjZvDx";

      await circuit.expectFail({
        cyphertext: base64ToBytes(base64Cyphertext),
        key: base64ToBytes(base64Key),
        iv: base64ToBytes(base64IV),
      })
    });
  });
});
