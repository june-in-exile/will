import path from "path";
import fs from "fs";

declare global {
  namespace globalThis {
    var CONSTRAINT_COUNTS_PATH: string;
  }
}

function getDefaultConstraintCounts() {
  const defaultConstraintCountsPath = "./constraintCounts.json";
  
  if (fs.existsSync(defaultConstraintCountsPath)) {
    try {
      return JSON.parse(fs.readFileSync(defaultConstraintCountsPath, "utf-8"));
    } catch (error) {
      console.warn(`Failed to read ${defaultConstraintCountsPath}:`, error);
    }
  }

  return {};
}

export default async function () {
  const constraintsPath =
    globalThis.CONSTRAINT_COUNTS_PATH || "./constraintCounts.json";

  const dir = path.dirname(constraintsPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const emptyConstraintCounts = getDefaultConstraintCounts();

  fs.writeFileSync(
    constraintsPath,
    JSON.stringify(emptyConstraintCounts, null, 2),
  );
}
