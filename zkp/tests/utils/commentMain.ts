import * as fs from 'fs';

/**
 * Comment out component main declaration in Circom code
 * @param content - Circom file content
 * @returns Modified content with component main commented out
 */
function commentComponentMain(content: string): string {
    // Regular expression to match component main declarations
    // Matches patterns like: component main = TemplateName();
    const componentMainRegex = /^(\s*)(component\s+main\s*=.*?;)/gm;

    return content.replace(componentMainRegex, (match, indentation, declaration) => {
        // Check if it's already commented
        if (declaration.includes('//')) {
            return match; // Already commented, don't modify
        }
        return `${indentation}// ${declaration}`;
    });
}

/**
 * Uncomment component main declaration in Circom code
 * @param content - Circom file content
 * @returns Modified content with component main uncommented
 */
function uncommentComponentMain(content: string): string {
    // Regular expression to match commented component main declarations
    // Matches patterns like: // component main = TemplateName();
    const commentedComponentMainRegex = /^(\s*)\/\/\s*(component\s+main\s*=.*?;)/gm;

    return content.replace(commentedComponentMainRegex, (match, indentation, declaration) => {
        return `${indentation}${declaration}`;
    });
}

/**
 * Comment out component main in a Circom file
 * @param filePath - Path to the Circom file
 * @returns Promise that resolves when the file is modified
 */
export async function commentComponentMainInFile(filePath: string): Promise<void> {
    try {
        const content = await fs.promises.readFile(filePath, "utf8");
        const modifiedContent = commentComponentMain(content);
        // Only write if content has changed
        if (modifiedContent !== content) {
            await fs.promises.writeFile(filePath, modifiedContent, "utf8");
            console.log(`✅ Successfully commented component main in: ${filePath}`);
        } else {
            console.log(`ℹ️  No changes needed for component main in: ${filePath}`);
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Failed to comment component main in ${filePath}: ${errorMessage}`);
        throw error;
    }
}

/**
 * Uncomment component main in a Circom file
 * @param filePath - Path to the Circom file
 * @returns Promise that resolves when the file is modified
 */
export async function uncommentComponentMainInFile(filePath: string): Promise<void> {
    try {
        const content = await fs.promises.readFile(filePath, "utf8");
        const modifiedContent = uncommentComponentMain(content);
        // Only write if content has changed
        if (modifiedContent !== content) {
            await fs.promises.writeFile(filePath, modifiedContent, "utf8");
            console.log(`✅ Successfully uncommented component main in: ${filePath}`);
        } else {
            console.log(`ℹ️  No changes needed for component main in: ${filePath}`);
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Failed to uncomment component main in ${filePath}: ${errorMessage}`);
        throw error;
    }
}