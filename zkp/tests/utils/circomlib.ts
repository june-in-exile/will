import path from "path";

export function getCircomlib() {
  try {
    const circomlibPath = path.dirname(require.resolve('circomlib/package.json'));
    return [
      path.dirname(circomlibPath),
      path.join(circomlibPath, "circuits"),
    ];
  } catch (error) {
    throw new Error('circomlib not found. Please run: pnpm add circomlib');
  }
}