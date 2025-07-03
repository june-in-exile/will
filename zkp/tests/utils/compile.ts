import type { CircomTester, CompileOptions } from "../types";
const circom_tester = require("circom_tester");
import path from "path";

/**
 * Compiles a Circom circuit and returns a WASM tester instance
 *
 * @param circuitPath - Path to the circom file relative to the circuits directory
 * @param options - Compilation options
 * @returns Promise that resolves to a WASM tester instance
 * @throws Error if circomlib is not found
 */
export async function compile_wasm(
  circuitPath: string,
  options?: CompileOptions,
): Promise<CircomTester> {
  let circomlibPaths: string[];

  try {
    const circomlibPath = path.dirname(
      require.resolve("circomlib/package.json"),
    );
    circomlibPaths = [
      path.dirname(circomlibPath),
      path.join(circomlibPath, "circuits"),
    ];
  } catch (error) {
    throw new Error("circomlib not found. Please run: pnpm add circomlib -w");
  }

  return await circom_tester.wasm(
    path.join(__dirname, "..", "..", "circuits", circuitPath),
    {
      include: circomlibPaths,
      ...(options?.templateName && { templateName: options.templateName }),
      ...(options?.templateParams && {
        templateParams: options.templateParams,
      }),
      ...(options?.templatePublicSignals && {
        templatePublicSignals: options.templatePublicSignals,
      }),
      O: options?.O ?? 2,
      verbose: options?.verbose ?? false,
      inspect: options?.inspect ?? false,
      json: options?.json ?? false,
      recompile: options?.recompile ?? true,
      prime: options?.prime ?? "bn128",
      simplification_substitution:
        options?.simplification_substitution ?? false,
      no_asm: options?.no_asm ?? false,
      no_init: options?.no_init ?? false,
    },
  );
}
