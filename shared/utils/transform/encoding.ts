import { Estate } from "../../types/index.js";

function uint8ArrayToHex(
  uint8Array: Uint8Array,
  addPrefix: boolean = true,
  uppercase: boolean = false,
): string {
  if (!(uint8Array instanceof Uint8Array)) {
    throw new Error("Input must be a Uint8Array");
  }

  const hex = Array.from(uint8Array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const finalHex = uppercase ? hex.toUpperCase() : hex;
  return addPrefix ? "0x" + finalHex : finalHex;
}

function base64ToBytes(base64: string): number[] {
  const binary = atob(base64);
  return Array.from(binary, char => char.charCodeAt(0));
}

function flattenEstates(estates: Estate[]): string[] {
  return estates.flatMap((estate) => [
    BigInt(estate.beneficiary).toString(),
    BigInt(estate.token).toString(),
    estate.amount.toString(),
  ]);
}

export { uint8ArrayToHex, base64ToBytes, flattenEstates };
