import path from "path";

export function getCircomlibPath() {
    let circomlibPath: string;

    try {
        circomlibPath = path.dirname(require.resolve("circomlib/package.json"));
    } catch (error) {
        throw new Error("circomlib not found. Please run: pnpm add circomlib -w");
    }

    return [path.dirname(circomlibPath), path.join(circomlibPath, "circuits")];
}