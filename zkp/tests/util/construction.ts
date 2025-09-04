import type { CircomTester, CompilationOptions } from "./witnessTester.js";
import {
  generateUntaggedTemplate,
  modifyComponentMainInFile,
} from "./untagTemplate.js";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const circom_tester = require("circom_tester");

declare global {
  namespace globalThis {
    var INCLUDE_LIB: string[];
    var CIRCOM_DEFAULTS: Record<string, unknown>;
  }
}

/**
 * Get the path for a circuit package
 * @param packageName - Name of the circuit package (default: "circomlib")
 * @returns Array containing [parent directory, circuits directory] of the package
 * @throws Error if package is not found
 */
async function getCircuitPackagePath(
  packageName: string = "circomlib",
): Promise<[string, string]> {
  const zkpNodeModulesPath = path.join(process.cwd(), "node_modules");
  const packagePath = path.join(zkpNodeModulesPath, packageName);

  try {
    // Check if package.json exists in the package directory
    const packageJsonPath = path.join(packagePath, "package.json");
    require(packageJsonPath); // This will throw if the file doesn't exist
  } catch {
    throw new Error(
      `${packageName} not found in ${zkpNodeModulesPath}. Please run: pnpm add ${packageName} -w`,
    );
  }

  return [path.dirname(packagePath), path.join(packagePath, "circuits")];
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
  try {
    await modifyComponentMainInFile(circuitPath, "comment");

    const testCircuitPath = await generateUntaggedTemplate(
      circuitPath,
      templateName,
    );

    const includeLibPaths: string[] = [];
    if (globalThis.INCLUDE_LIB && Array.isArray(globalThis.INCLUDE_LIB)) {
      for (const lib of globalThis.INCLUDE_LIB) {
        const path = await getCircuitPackagePath(lib);
        includeLibPaths.push(...path);
      }
    }

    const defaultOptions = globalThis.CIRCOM_DEFAULTS;

    const wasm_tester = await circom_tester.wasm(testCircuitPath, {
      include: [...includeLibPaths],
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
  } catch (error) {
    throw new Error(
      `Fail to construct with wasm_tester: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export { construct_wasm };
