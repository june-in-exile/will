const circom_tester = require("circom_tester");
import path from "path";

/**
 * Compiles a Circom circuit and returns a WASM tester instance
 * 
 * @param circomPath - Path to the circom file relative to the circuits directory
 * @param options - Compilation options
 * @param options.templateName - Name of the template to instantiate
 * @param options.templateParams - Parameters to pass to the template
 * @param options.templatePublicSignals - List of public signals for the template
 * @param options.O - Optimization level (0-2, default: 2)
 * @param options.verbose - Enable verbose output during compilation (default: false)
 * @param options.inspect - Enable inspection mode for debugging (default: false)
 * @param options.json - Output constraints in JSON format (default: false)
 * @param options.recompile - Force recompilation even if compiled version exists (default: true)
 * @param options.prime - Elliptic curve to use for the field (default: "bn128")
 * @param options.simplification_substitution - Enable simplification substitution optimization (default: false)
 * @param options.no_asm - Disable assembly generation (default: false)
 * @param options.no_init - Skip initialization phase (default: false)
 * @returns Promise that resolves to a WASM tester instance
 * @throws Error if circomlib is not found
 */
export async function compileCircuit(
  circomPath: string,
  options?: {
    /** Name of the template to instantiate */
    templateName?: string;
    /** Parameters to pass to the template */
    templateParams?: string[];
    /** List of public signals for the template */
    templatePublicSignals?: string[];
    /** Optimization level (0-2, default: 2) */
    O?: Optimization;
    /** Enable verbose output during compilation (default: false) */
    verbose?: boolean;
    /** Enable inspection mode for debugging (default: false) */
    inspect?: boolean;
    /** Output constraints in JSON format (default: false) */
    json?: boolean;
    /** Force recompilation even if compiled version exists (default: true) */
    recompile?: boolean;
    /** Elliptic curve to use for the field (default: "bn128") */
    prime?: CurveName;
    /** Enable simplification substitution optimization (default: false) */
    simplification_substitution?: boolean;
    /** Disable assembly generation (default: false) */
    no_asm?: boolean;
    /** Skip initialization phase (default: false) */
    no_init?: boolean;
  },
) {
  let circomlibPaths: string[];

  try {
    const circomlibPath = path.dirname(
      require.resolve("circomlib/package.json"),
    );
    circomlibPaths = [path.dirname(circomlibPath), path.join(circomlibPath, "circuits")];
  } catch (error) {
    throw new Error("circomlib not found. Please run: pnpm add circomlib -w");
  }

  return await circom_tester.wasm(
    path.join(__dirname, "..", "..", "circuits", circomPath),
    {
      include: circomlibPaths,
      ...(options?.templateName && { templateName: options.templateName }),
      ...(options?.templateParams && { templateParams: options.templateParams }),
      ...(options?.templatePublicSignals && { templatePublicSignals: options.templatePublicSignals }),
      O: options?.O ?? 2,
      verbose: options?.verbose ?? false,
      inspect: options?.inspect ?? false,
      json: options?.json ?? false,
      recompile: options?.recompile ?? true,
      prime: options?.prime ?? "bn128",
      simplification_substitution: options?.simplification_substitution ?? false,
      no_asm: options?.no_asm ?? false,
      no_init: options?.no_init ?? false,
    },
  );
}