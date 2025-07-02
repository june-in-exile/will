const circom_tester = require("circom_tester");
import path from "path";

function getCircomlib() {
  try {
    const circomlibPath = path.dirname(require.resolve('circomlib/package.json'));
    return [
      path.dirname(circomlibPath),
      path.join(circomlibPath, "circuits"),
    ];
  } catch (error) {
    throw new Error('circomlib not found. Please run: pnpm add circomlib -w');
  }
};

export async function compileCircuit(
  pathFromCircuits: string,
  options?: {
    templateName?: string;
    templateParams?: string[];
    templatePublicSignals?: string[];
  }
) {
  return await circom_tester.wasm(
    path.join(__dirname, "..", "..", "circuits", pathFromCircuits)
    , {
      include: getCircomlib(),
      O: 2,
      // inspect: true,
      verbose: false,
      ...(options?.templateName ? { templateName: options.templateName } : {}),
      ...(options?.templateParams ? { templateParams: options.templateParams } : {}),
      ...(options?.templatePublicSignals ? { templatePublicSignals: options.templatePublicSignals } : {}),
    });
};