import type { CircomTester, CompilationOptions } from "../types";
import { generateCircomTest } from "./generateTestCircom";
import { commentComponentMainInFile, uncommentComponentMainInFile } from "./commentMain";
import { getCircomlibPath } from "./getCircomlibPath";
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
export async function construct_wasm(
  circuitPath: string,
  templateName: string,
  options?: CompilationOptions,
): Promise<CircomTester> {

  const absoluteCircuitPath = path.join(__dirname, "..", "..", "circuits", circuitPath);
  await commentComponentMainInFile(absoluteCircuitPath);
  
  const testCircuitPath = await generateCircomTest(absoluteCircuitPath, templateName);

  const circomlibPath = getCircomlibPath();

  const wasm_tester = await circom_tester.wasm(
    testCircuitPath,
    {
      include: circomlibPath,
      templateName: `Test${templateName}`,
      ...(options?.templateParams && {
        templateParams: options.templateParams,
      }),
      ...(options?.templatePublicSignals && {
        templatePublicSignals: options.templatePublicSignals,
      }),
      O: options?.O ?? 1,
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

  await uncommentComponentMainInFile(absoluteCircuitPath);

  return wasm_tester;
}