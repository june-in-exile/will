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

  let prevConstraintCounts;

  if (fs.existsSync(constraintsPath)) {
    prevConstraintCounts = JSON.parse(
      fs.readFileSync(constraintsPath, "utf-8"),
    );
  } else {
    fs.mkdirSync(path.dirname(constraintsPath), { recursive: true });
    prevConstraintCounts = JSON.parse(
      fs.readFileSync("./tests/config/constraintCounts.json", "utf-8"),
    );
  }

  fs.writeFileSync(
    constraintsPath,
    JSON.stringify(prevConstraintCounts, null, 2),
  );
}
