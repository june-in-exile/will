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

function stringToBigInt(value: string): bigint {
  return BigInt(value);
}

export { uint8ArrayToHex, stringToBigInt };
