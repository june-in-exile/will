import { WILL_FILE_PATH } from "@shared/constants/will.js";
import type {
  WillType,
  WillTypeToWillMap,
  WillFields,
} from "@shared/types/will.js";
import { validateWill } from "@shared/utils/validation/will.js";
import { readFileSync, existsSync } from "fs";
import chalk from "chalk";

/**
 * Generic will data reading function
 * @param type The type of will file to read
 * @param filePath Optional custom file path (uses default if not provided)
 * @returns Parsed and validated will data
 */
function readWill<T>(type: WillType): T {
  const targetPath = WILL_FILE_PATH[type];

  if (!existsSync(targetPath)) {
    throw new Error(`Will file does not exist: ${targetPath}`);
  }

  try {
    const typeString: string = type;

    console.log(chalk.blue(`Reading ${typeString} will data...`));

    const fileContent = readFileSync(targetPath, "utf8");
    const will = JSON.parse(fileContent);

    if (will.salt && typeof will.salt === 'string') {
      will.salt = BigInt(will.salt);
    }
    if (will.permit2 && will.permit2.nonce && typeof will.permit2.nonce === 'string') {
      will.permit2.nonce = BigInt(will.permit2.nonce);
    }

    validateWill(type, will);

    const typeCapitalized = typeString[0].toUpperCase() + typeString.slice(1);

    console.log(
      chalk.green(`✅ ${typeCapitalized} will data validated successfully`),
    );

    return will as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${type} will file: ${error.message}`);
    }
    throw new Error(
      `Failed to read ${type} will: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

function readWillFields<
  T extends WillType,
  K extends readonly (keyof WillTypeToWillMap[T])[],
>(type: T, keys: K): WillFields<T, K> {
  const willData = readWill(type) as WillTypeToWillMap[T];

  const willKeys = Object.keys(willData) as (keyof WillTypeToWillMap[T])[];

  for (const key of keys) {
    if (!willKeys.includes(key)) {
      throw new Error(
        `Key "${String(key)}" is not valid for will type "${type}". ` +
          `Available keys are: ${willKeys.map((k) => String(k)).join(", ")}`,
      );
    }
  }

  const result = {} as WillFields<T, K>;
  for (const key of keys) {
    if (key in willData) {
      (result as any)[key] = willData[key];
    }
  }

  return result;
}

export { readWill, readWillFields };
