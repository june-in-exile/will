export function hexToUint8Array(hex: string): Uint8Array {
  if (!validateHex(hex)) {
    throw new Error('Invalid hex string');
  }

  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;

  const paddedHex = cleanHex.length % 2 === 0 ? cleanHex : '0' + cleanHex;

  const matches = paddedHex.match(/.{1,2}/g);
  if (!matches) {
    throw new Error('Failed to parse hex string');
  }

  return new Uint8Array(matches.map(byte => parseInt(byte, 16)));
}

export function uint8ArrayToHex(
  uint8Array: Uint8Array,
  addPrefix: boolean = true,
  uppercase: boolean = false
): string {
  if (!(uint8Array instanceof Uint8Array)) {
    throw new Error('Input must be a Uint8Array');
  }

  const hex = Array.from(uint8Array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const finalHex = uppercase ? hex.toUpperCase() : hex;
  return addPrefix ? '0x' + finalHex : finalHex;
}

export function validateHex(hex: string): boolean {
  if (typeof hex !== 'string') {
    return false;
  }

  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  return /^[0-9a-fA-F]*$/.test(cleanHex);
}

export function uint8ArraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((val, idx) => val === b[idx]);
}


export function validateBase64(str: string): boolean {
  try {
    return btoa(atob(str)) === str;
  } catch {
    return false;
  }
}

export function uint8ArrayToArray(uint8Array: Uint8Array): number[] {
  return Array.from(uint8Array);
}

export function arrayToUint8Array(array: number[]): Uint8Array {
  return new Uint8Array(array);
}