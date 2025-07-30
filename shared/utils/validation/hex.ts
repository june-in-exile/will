function validateHex(hex: string): boolean {
  if (typeof hex !== "string") {
    return false;
  }

  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  return /^[0-9a-fA-F]*$/.test(cleanHex);
}

export { validateHex };
