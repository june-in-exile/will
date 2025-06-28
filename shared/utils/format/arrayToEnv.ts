/**
 * Converts any bigint array to comma-separated string
 *
 * @param arr - Array of bigints
 * @returns Comma-separated string
 *
 * @example
 * bigintArrayToEnvString([123n, 456n, 789n]) // Returns: "123,456,789"
 */
export function bigintArrayToEnvString(arr: any[]): string {
  return arr.map((val) => val.toString()).join(",");
}
