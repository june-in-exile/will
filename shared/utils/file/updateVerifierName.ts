import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

export function updateVerifierName(filePath: string, circuitName: string): void {
    try {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found at ${filePath}`);
        }

        const fileContent = fs.readFileSync(filePath, 'utf8');

        const newContractName = circuitName.charAt(0).toUpperCase() + circuitName.slice(1) + 'Verifier';

        const updatedContent = fileContent.replace(
            /contract\s+Groth16Verifier/g,
            `contract ${newContractName}`
        );

        if (fileContent === updatedContent) {
            console.warn(chalk.yellow(`Warning: No "Groth16Verifier" contract found to replace in ${filePath}`));
            return;
        }

        fs.writeFileSync(filePath, updatedContent, 'utf8');

        console.log(chalk.green(`✅ Successfully renamed contract to "${newContractName}" in ${filePath}`));

    } catch (error) {
        throw new Error(
            `Failed to update verifier contract name: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

export async function main(): Promise<void> {
    try {
        const args = process.argv.slice(2);

        if (args.length !== 2) {
            console.error(chalk.red('Usage: ts-node updateVerifierContractName.ts <path> <new-contract-name>'));
            process.exit(1);
        }

        const [filePath, circuitName] = args;

        console.log(chalk.cyan('\n=== Updating Verifier Contract Name ===\n'));

        updateVerifierName(filePath, circuitName);

    } catch (error) {
        console.error(
            chalk.red.bold('\n❌ Program execution failed:'),
            error instanceof Error ? error.message : 'Unknown error'
        );
        if (process.env.NODE_ENV === 'development' && error instanceof Error) {
            console.error(chalk.gray('Stack trace:'), error.stack);
        }

        process.exit(1);
    }
}

// Check: is this file being executed directly or imported?
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
    // Only run when executed directly
    main().catch((error: Error) => {
        console.error(
            chalk.red.bold('Uncaught error:'),
            error instanceof Error ? error.message : 'Unknown error'
        );
        process.exit(1);
    });
}