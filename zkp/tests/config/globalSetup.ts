import emptyConstraintCounts from './constraintCounts.json' with { type: 'json' };
import path from "path";
import fs from "fs";

declare global {
  namespace globalThis {
    var CONSTRAINT_COUNTS_PATH: string;
  }
}

export default async function () {
  const constraintsPath =
    globalThis.CONSTRAINT_COUNTS_PATH || "./constraintCounts.json";

  const dir = path.dirname(constraintsPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(
    constraintsPath,
    JSON.stringify(emptyConstraintCounts, null, 2),
  );
}