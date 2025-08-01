import { EncryptedWill } from "@shared/types/will.js";
import { JsonCidVerifier } from "@shared/types/typechain-types/index.js";
import { Estate, EstateToken } from "@shared/types/blockchain.js";
import chalk from "chalk";

function extractUniqueTokens(estates: Estate[]): EstateToken[] {
  const tokens = new Map<string, EstateToken>();

  estates.forEach((estate, index) => {
    const token = estate.token.toLowerCase();

    if (!tokens.has(token)) {
      tokens.set(token, {
        address: estate.token,
        estates: [index],
        totalAmount: estate.amount,
      });
    } else {
      const details = tokens.get(token)!;
      details.estates.push(index);
      details.totalAmount += estate.amount;
    }
  });

  return Array.from(tokens.values());
}

function encryptedWillToJsonObject(
  encryptedWillData: EncryptedWill,
): JsonCidVerifier.JsonObjectStruct {
  try {
    console.log(
      chalk.blue("Converting encrypted will data to JsonObject format..."),
    );

    const keys: string[] = [];
    const values: string[] = [];

    keys.push("algorithm");
    values.push(encryptedWillData.algorithm);

    keys.push("iv");
    values.push(encryptedWillData.iv);

    keys.push("authTag");
    values.push(encryptedWillData.authTag);

    keys.push("ciphertext");
    values.push(encryptedWillData.ciphertext);

    keys.push("timestamp");
    values.push(encryptedWillData.timestamp.toString());

    console.log(
      chalk.green("✅ Encrypted will data converted to JsonObject format"),
    );

    return { keys, values };
  } catch (error) {
    throw new Error(
      `Failed to convert encrypted will data: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

function encryptedWillToTypedJsonObject(
  encryptedWillData: EncryptedWill,
): JsonCidVerifier.TypedJsonObjectStruct {
  try {
    console.log(
      chalk.blue("Converting encrypted will data to TypedJsonObject format..."),
    );

    const keys: string[] = [];
    const values: JsonCidVerifier.JsonValueStruct[] = [];

    keys.push("algorithm");
    values.push({
      value: encryptedWillData.algorithm,
      valueType: 0, // JsonValueType.STRING
    });

    keys.push("iv");
    values.push({
      value: encryptedWillData.iv,
      valueType: 0, // JsonValueType.STRING
    });

    keys.push("authTag");
    values.push({
      value: encryptedWillData.authTag,
      valueType: 0, // JsonValueType.STRING
    });

    keys.push("ciphertext");
    values.push({
      value: encryptedWillData.ciphertext,
      valueType: 0, // JsonValueType.STRING
    });

    keys.push("timestamp");
    values.push({
      value: encryptedWillData.timestamp.toString(),
      valueType: 1, // JsonValueType.NUMBER
    });

    console.log(
      chalk.green("✅ Encrypted will data converted to TypedJsonObject format"),
    );

    return { keys, values };
  } catch (error) {
    throw new Error(
      `Failed to convert encrypted will data: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export { extractUniqueTokens, encryptedWillToJsonObject, encryptedWillToTypedJsonObject };
