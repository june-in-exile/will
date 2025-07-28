import type { CircomTester, CompilationOptions } from "./witnessTester.js";
import {
  generateUntaggedTemplate,
  modifyComponentMainInFile,
} from "./untagTemplate.js";
import path from "path";
/* eslint-disable @typescript-eslint/no-require-imports */
const circom_tester = require("circom_tester");

declare global {
  namespace globalThis {
    var CIRCOM_DEFAULTS: Record<string, unknown>;
  }
}

async function getCircomlibPath() {
  let circomlibPath: string;

  try {
    circomlibPath = path.dirname(require.resolve("circomlib/package.json"));
  } catch {
    throw new Error("circomlib not found. Please run: pnpm add circomlib -w");
  }

  return [path.dirname(circomlibPath), path.join(circomlibPath, "circuits")];
}

/**
 * Compiles a Circom circuit and returns a WASM tester instance
 *
 * @param circuitPath - Path to the circom file relative to the circuits directory
 * @param options - Compilation options
 * @returns Promise that resolves to a WASM tester instance
 * @throws Error if circomlib is not found
 */
async function construct_wasm(
  circuitPath: string,
  templateName: string,
  options?: CompilationOptions,
): Promise<CircomTester> {
  await modifyComponentMainInFile(circuitPath, "comment");

  const testCircuitPath = await generateUntaggedTemplate(
    circuitPath,
    templateName,
  );

  const circomlibPath = await getCircomlibPath();

  const defaultOptions = globalThis.CIRCOM_DEFAULTS;

  const wasm_tester = await circom_tester.wasm(testCircuitPath, {
    include: circomlibPath,
    templateName: `Untagged${templateName}`,
    ...(options?.templateParams && {
      templateParams: options.templateParams,
    }),
    ...(options?.templatePublicSignals && {
      templatePublicSignals: options.templatePublicSignals,
    }),
    ...defaultOptions,
    ...options,
  });

  wasm_tester.templateName = templateName;

  await modifyComponentMainInFile(circuitPath, "uncomment");

  return wasm_tester;
}

export { construct_wasm };
