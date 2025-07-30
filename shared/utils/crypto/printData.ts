import type { ProofData } from "@shared/types/crypto.js";
import type { Estate } from "@shared/types/blockchain.js";
import type { WillInfo } from "@shared/types/blockchain.js";
import type { JsonCidVerifier } from "@shared/types/typechain-types/index.js";
import chalk from "chalk";

interface UploadCidData {
    proof: ProofData;
    will: JsonCidVerifier.TypedJsonObject;
    cid: string;
}

interface CreateWillData {
    proof: ProofData;
    will: JsonCidVerifier.TypedJsonObjectStruct;
    cid: string;
    testator: string;
    estates: Estate[];
    salt: bigint;
}

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
            return "BOOLEAN";
        case 3:
            return "NULL";
        default:
            throw new Error("Invalid JsonValueType");
    }
}

/**
 * Print encrypted will keys and values
 */
function printEncryptedWillData(
    will: JsonCidVerifier.TypedJsonObject | JsonCidVerifier.TypedJsonObjectStruct,
): void {
    console.log(chalk.blue("\n📝 Excrypted Will Keys & Values:"));
    will.keys.forEach((key: string, index: string) => {
        const jsonValue: JsonCidVerifier.JsonValue = will.values[index];
        const valueType = getJsonValueTypeString(jsonValue.valueType);

        console.log(
            chalk.gray(`  [${index}]`),
            chalk.cyan(key),
            chalk.gray("=>"),
            chalk.white(`{value: ${jsonValue.value}, valueType: ${valueType}}`),
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
function printProofData(proof: ProofData): void {
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
        chalk.gray("- pubSignals[0]:"),
        chalk.white(proof.pubSignals[0].toString()),
    );
}

/**
 * Print detailed UploadCIDData information
 */
function printUploadCidData(uploadData: UploadCidData): void {
    console.log(chalk.cyan("\n=== UploadCIDData Details ==="));

    console.log(chalk.blue("\n📋 CID Information:"));
    console.log(chalk.gray("- CID:"), chalk.white(uploadData.cid));

    printProofData(uploadData.proof);
    printEncryptedWillData(uploadData.will);

    console.log(chalk.cyan("\n=== End of UploadCidData Details ===\n"));
}

/**
 * Print notarization details
 */
function printNotarizationDetails(cid: string, signature: string): void {
    console.log(chalk.cyan("\n=== Notarization Details ==="));

    console.log(chalk.blue("\n📋 CID Information:"));
    console.log(chalk.gray("- CID:"), chalk.white(cid));

    console.log(chalk.blue("\n✍️  Signature Information:"));
    console.log(chalk.gray("- Signature:"), chalk.white(signature));
    console.log(chalk.gray("- Signature Length:"), chalk.white(signature.length));

    console.log(chalk.cyan("\n=== End of Notarization Details ===\n"));
}

/**
 * Print detailed CreateWillData information
 */
function printCreateWillData(createData: CreateWillData): void {
    console.log(chalk.cyan("\n=== CreateWillData Details ==="));

    console.log(chalk.blue("\n📋 CID Information:"));
    console.log(chalk.gray("- CID:"), chalk.white(createData.cid));

    console.log(chalk.blue("\n👤 Testator Information:"));
    console.log(chalk.gray("- Testator:"), chalk.white(createData.testator));

    console.log(chalk.blue("\n🧂 Salt Information:"));
    console.log(chalk.gray("- Salt:"), chalk.white(createData.salt.toString()));

    printEstates(createData.estates);

    printProofData(createData.proof);
    
    printEncryptedWillData(createData.will);

    console.log(chalk.cyan("\n=== End of CreateWillData Details ===\n"));
}

/**
 * Print signature transfer details
 */
function printSignatureTransferDetails(
    willInfo: WillInfo,
    nonce: string,
    deadline: string,
    signature: string,
): void {
    console.log(chalk.cyan("\n=== Signature Transfer Details ==="));

    console.log(chalk.blue("\n🏛️  Will Information:"));
    console.log(chalk.gray("- Testator:"), chalk.white(willInfo.testator));
    console.log(chalk.gray("- Executor:"), chalk.white(willInfo.executor));
    console.log(chalk.gray("- Executed:"), chalk.white(willInfo.executed.toString()));

    printEstates(willInfo.estates);

    console.log(chalk.blue("\n📋 Permit2 Parameters:"));
    console.log(chalk.gray("- Nonce:"), chalk.white(nonce));
    console.log(chalk.gray("- Deadline:"), chalk.white(deadline));
    console.log(
        chalk.gray("- Deadline (Date):"),
        chalk.white(new Date(parseInt(deadline) * 1000).toISOString()),
    );
    console.log(chalk.gray("- Signature:"), chalk.white(signature));

    console.log(chalk.cyan("\n=== End of Signature Transfer Details ===\n"));
}

export {
    printProofData,
    printUploadCidData,
    printNotarizationDetails,
    printCreateWillData,
    printSignatureTransferDetails,
};
