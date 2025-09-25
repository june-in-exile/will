import type { Estate, ProofData } from "@shared/types/index.js";
import type { JsonCidVerifier } from "@shared/types/typechain-types/index.js";
import chalk from "chalk";

/**
 * Print JSON value type as string
 */
function getJsonValueTypeString(valueType: number): string {
  switch (valueType) {
    case 0:
      return "STRING";
    case 1:
      return "NUMBER";
    case 2:
      return "NUMBER_ARRAY";
    default:
      throw new Error("Invalid JsonValueType");
  }
}

/**
 * Print encrypted will keys and values
 */
function printEncryptedWillJson(
  will: JsonCidVerifier.TypedJsonObject | JsonCidVerifier.TypedJsonObjectStruct,
): void {
  console.log(chalk.blue("\n📝 Excrypted Will:"));
  will.keys.forEach((key: string, index: string) => {
    const jsonValue: JsonCidVerifier.JsonValue = will.values[index];
    const valueType = getJsonValueTypeString(jsonValue.valueType);

    console.log(
      chalk.gray(`  [${index}]`),
      chalk.cyan(key),
      chalk.gray("=>"),
      chalk.white(`{value: ${jsonValue.value}, numberArray: ${jsonValue.numberArray}, valueType: ${valueType}}`),
    );
  });
}

/**
 * Print estates
 */
function printEstates(estates: Estate[]): void {
  console.log(chalk.blue("\n🏛️  Estate Information:"));
  estates.forEach((estate, index) => {
    console.log(chalk.gray(`  Estate ${index}:`));
    console.log(
      chalk.gray("    - Beneficiary:"),
      chalk.white(estate.beneficiary),
    );
    console.log(chalk.gray("    - Token:"), chalk.white(estate.token));
    console.log(
      chalk.gray("    - Amount:"),
      chalk.white(estate.amount.toString()),
    );
  });
}

/**
 * Print detailed proof information
 */
function printProof(proof: ProofData): void {
  console.log(chalk.blue("\n🔐 Proof Data:"));
  console.log(chalk.gray("- pA[0]:"), chalk.white(proof.pA[0].toString()));
  console.log(chalk.gray("- pA[1]:"), chalk.white(proof.pA[1].toString()));
  console.log(
    chalk.gray("- pB[0][0]:"),
    chalk.white(proof.pB[0][0].toString()),
  );
  console.log(
    chalk.gray("- pB[0][1]:"),
    chalk.white(proof.pB[0][1].toString()),
  );
  console.log(
    chalk.gray("- pB[1][0]:"),
    chalk.white(proof.pB[1][0].toString()),
  );
  console.log(
    chalk.gray("- pB[1][1]:"),
    chalk.white(proof.pB[1][1].toString()),
  );
  console.log(chalk.gray("- pC[0]:"), chalk.white(proof.pC[0].toString()));
  console.log(chalk.gray("- pC[1]:"), chalk.white(proof.pC[1].toString()));

  console.log(
    chalk.gray("- pubSignals:"),
    chalk.white(`[${proof.pubSignals.toString()}]`),
  );
}

export { printEncryptedWillJson, printEstates, printProof };
