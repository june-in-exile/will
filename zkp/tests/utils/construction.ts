import type { CircomTester, CompilationOptions } from "../types";
import { generateTestTemplate } from "./generateTestTemplate";
import * as fs from "fs";
import path from "path";
/* eslint-disable @typescript-eslint/no-require-imports */
const circom_tester = require("circom_tester");

/**
 * Comment out component main declaration in Circom code
 * @param content - Circom file content
 * @returns Modified content with component main commented out
 */
function commentComponentMain(content: string): string {
  // Regular expression to match component main declarations like: component main = TemplateName();
  const componentMainRegex = /^(\s*)(component\s+main\s*=.*?;)/gm;

  return content.replace(
    componentMainRegex,
    (match, indentation, declaration) => {
      // Don't modify if it's already commented
      if (declaration.includes("//")) {
        return match;
      }
      return `${indentation}// ${declaration}`;
    },
  );
}

/**
 * Uncomment component main declaration in Circom code
 * @param content - Circom file content
 * @returns Modified content with component main uncommented
 */
function uncommentComponentMain(content: string): string {
  // Regular expression to match commented component main declarations like: // component main = TemplateName();
  const commentedComponentMainRegex =
    /^(\s*)\/\/\s*(component\s+main\s*=.*?;)/gm;

  return content.replace(
    commentedComponentMainRegex,
    (match, indentation, declaration) => {
      return `${indentation}${declaration}`;
    },
  );
}

/**
 * Modify component main in a Circom file by commenting or uncommenting it.
 * @param filePath - Path to the Circom file
 * @param action - Either "comment" or "uncomment"
 * @returns Promise that resolves when the file is modified
 */
async function modifyComponentMainInFile(
  filePath: string,
  action: "comment" | "uncomment",
): Promise<void> {
  const content = await fs.promises.readFile(filePath, "utf8");

  const modifiedContent =
    action === "comment"
      ? commentComponentMain(content)
      : uncommentComponentMain(content);

  if (modifiedContent !== content) {
    await fs.promises.writeFile(filePath, modifiedContent, "utf8");
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
export async function construct_wasm(
  circuitPath: string,
  templateName: string,
  options?: CompilationOptions,
): Promise<CircomTester> {
  const absoluteCircuitPath = `circuits/${circuitPath}`;
  await modifyComponentMainInFile(absoluteCircuitPath, "comment");

  const testCircuitPath = await generateTestTemplate(
    absoluteCircuitPath,
    templateName,
  );

  const circomlibPath = await getCircomlibPath();

  const defaultOptions = (
    global as unknown as { CIRCOM_DEFAULTS?: Record<string, unknown> }
  ).CIRCOM_DEFAULTS;

  const wasm_tester = await circom_tester.wasm(testCircuitPath, {
    include: circomlibPath,
    templateName: `Test${templateName}`,
    ...(options?.templateParams && {
      templateParams: options.templateParams,
    }),
    ...(options?.templatePublicSignals && {
      templatePublicSignals: options.templatePublicSignals,
    }),
    ...defaultOptions,
    ...options,
  });

  await modifyComponentMainInFile(absoluteCircuitPath, "uncomment");

  return wasm_tester;
}
