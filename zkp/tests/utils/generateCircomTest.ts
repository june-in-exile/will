import * as fs from 'fs';
import * as path from 'path';

/**
 * Interface representing a signal in a Circom template
 */
interface Signal {
    name: string;
    tag: string | null;
    arraySize: string | null;
    isArray: boolean;
}

/**
 * Interface representing parsed template information
 */
interface TemplateInfo {
    name: string;
    params: string[];
    inputs: Signal[];
    outputs: Signal[];
    templateBody: string;
}

/**
 * Generate a Circom test template file
 * @param circuitPath - Path to the original circuit file, e.g., "./shared/components/utf8Encoder.circom"
 * @param templateName - Name of the template to test, e.g., "Utf8ByteLength"
 * @returns Promise resolving to the generated test file path
 */
export async function generateCircomTest(
    circuitPath: string,
    templateName: string
): Promise<string> {
    try {
        // Read the original circuit file
        const circuitContent = await fs.promises.readFile(circuitPath, "utf8");

        // Parse template definition
        const templateInfo = parseTemplate(circuitContent, templateName);
        if (!templateInfo) {
            throw new Error(`Template "${templateName}" not found in ${circuitPath}`);
        }

        // Generate test directory path based on circuit path
        const testDir = generateTestDirPath(circuitPath);

        // Ensure test directory exists
        await fs.promises.mkdir(testDir, { recursive: true });

        // Calculate relative path
        const relativePath = calculateRelativePath(testDir, circuitPath);

        // Generate test file content
        const testContent = generateTestTemplate(templateName, templateInfo, relativePath);

        // Write test file
        const testCircuitPath = path.join(testDir, `${templateName}.circom`);
        await fs.promises.writeFile(testCircuitPath, testContent, "utf8");

        console.log(`✅ Successfully generated test file: ${testCircuitPath}`);
        return testCircuitPath;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Failed to generate test file: ${errorMessage}`);
        throw error;
    }
}

/**
 * Generate test directory path based on circuit path
 * Converts "./shared/components/utf8Encoder.circom" to "../../test/utf8Encoder/"
 * @param circuitPath - Path to the circuit file
 * @returns Generated test directory path
 */
export function generateTestDirPath(circuitPath: string): string {
    // Extract the filename without extension
    const filename = path.basename(circuitPath, '.circom');

    // Generate test directory path
    return `circuits/test/${filename}/`;
}

/**
 * Parse template definition to extract input and output signal information
 * @param content - Circuit file content
 * @param templateName - Template name to search for
 * @returns Template information object or null if not found
 */
export function parseTemplate(content: string, templateName: string): TemplateInfo | null {
    // Find template start and extract parameters
    const templateStartRegex = new RegExp(
        `template\\s+${templateName}\\s*\\(([^)]*)\\)\\s*{`,
        'gm'
    );

    const startMatch = templateStartRegex.exec(content);
    if (!startMatch) {
        return null;
    }

    // Parse template parameters
    const paramsString = startMatch[1].trim();
    const params = paramsString ? paramsString.split(',').map(p => p.trim()) : [];

    // Extract template body by counting braces
    const templateBody = extractTemplateBody(content, startMatch.index + startMatch[0].length);
    if (!templateBody) {
        return null;
    }

    // Parse input signals
    const inputs = parseSignals(templateBody, 'input');
    // Parse output signals  
    const outputs = parseSignals(templateBody, 'output');

    return {
        name: templateName,
        params,
        inputs,
        outputs,
        templateBody
    };
}

/**
 * Extract template body by properly handling nested braces
 * @param content - Full content string
 * @param startIndex - Index where template body starts (after opening brace)
 * @returns Template body content or null if malformed
 */
function extractTemplateBody(content: string, startIndex: number): string | null {
    let braceCount = 1; // We've already seen the opening brace
    let currentIndex = startIndex;

    while (currentIndex < content.length && braceCount > 0) {
        const char = content[currentIndex];

        if (char === '{') {
            braceCount++;
        } else if (char === '}') {
            braceCount--;
        }

        currentIndex++;
    }

    if (braceCount === 0) {
        // Found matching closing brace
        return content.substring(startIndex, currentIndex - 1);
    }

    return null; // Malformed template
}

/**
 * Parse signal declarations from template body
 * @param templateBody - Template body content
 * @param signalType - Signal type ('input' or 'output')
 * @returns Array of parsed signals
 */
export function parseSignals(templateBody: string, signalType: 'input' | 'output'): Signal[] {
    // Regular expression to match signal declarations
    // Supports both tagged and untagged signals, as well as array declarations
    const signalRegex = new RegExp(
        `signal\\s+${signalType}\\s*(?:{([^}]+)})?\\s*([a-zA-Z_][a-zA-Z0-9_]*)(?:\\s*\\[([^\\]]+)\\])?`,
        'g'
    );

    const signals: Signal[] = [];
    let match: RegExpExecArray | null;

    while ((match = signalRegex.exec(templateBody)) !== null) {
        const tag = match[1] || null;
        const name = match[2];
        const arraySize = match[3] || null;

        signals.push({
            name,
            tag,
            arraySize,
            isArray: arraySize !== null
        });
    }

    return signals;
}

/**
 * Calculate relative path from test directory to circuit file
 * @param testDir - Test directory path
 * @param circuitPath - Circuit file path
 * @returns Relative path string with forward slashes
 */
export function calculateRelativePath(testDir: string, circuitPath: string): string {
    const testDirAbs = path.resolve(testDir);
    const circuitPathAbs = path.resolve(circuitPath);
    return path.relative(testDirAbs, circuitPathAbs).replace(/\\/g, '/');
}

/**
 * Generate test template content
 * @param templateName - Template name
 * @param templateInfo - Parsed template information
 * @param relativePath - Relative path to the original circuit file
 * @returns Generated test template content as string
 */
export function generateTestTemplate(
    templateName: string,
    templateInfo: TemplateInfo,
    relativePath: string
): string {
    const { params, inputs, outputs, templateBody } = templateInfo;

    const now = new Date();
    const formattedTime = now.toISOString();

    let content = `// auto generated during testing: ${formattedTime}\npragma circom 2.2.2;\n\n`;
    content += `include "${relativePath}";\n\n`;

    // Generate template declaration with parameters
    if (params.length > 0) {
        content += `template Test${templateName}(${params.join(', ')}) {\n`;
    } else {
        content += `template Test${templateName}() {\n`;
    }

    // Extract and copy variable declarations and assertions before signal declarations
    const preSignalCode = extractPreSignalCode(templateBody);
    if (preSignalCode.trim()) {
        content += preSignalCode;
        content += '\n';
    }

    // Generate input signal declarations
    for (const input of inputs) {
        if (input.isArray) {
            content += `    signal input ${input.name}[${input.arraySize}];\n`;
        } else {
            content += `    signal input ${input.name};\n`;
        }
    }

    // Check if any input signals have tags and generate intermediate signals if needed
    const hasTaggedInputs = inputs.some(input => input.tag);
    if (hasTaggedInputs) {
        for (const input of inputs) {
            if (input.tag) {
                if (input.isArray) {
                    content += `    signal {${input.tag}} _${input.name}[${input.arraySize}];\n`;
                    content += `    for (var i = 0; i < ${input.arraySize}; i++) {\n`;
                    content += `        _${input.name}[i] <== ${input.name}[i];\n`;
                    content += `    }\n`;
                } else {
                    content += `    signal {${input.tag}} _${input.name} <== ${input.name};\n`;
                }
            }
        }
    }

    // Generate output signal declarations
    for (const output of outputs) {
        if (output.tag) {
            if (output.isArray) {
                content += `    signal output {${output.tag}} ${output.name}[${output.arraySize}];\n`;
            } else {
                content += `    signal output {${output.tag}} ${output.name};\n`;
            }
        } else {
            if (output.isArray) {
                content += `    signal output ${output.name}[${output.arraySize}];\n`;
            } else {
                content += `    signal output ${output.name};\n`;
            }
        }
    }

    content += `\n`;

    // Generate template instantiation with parameters
    const templateParams = params.length > 0 ? `(${params.join(', ')})` : '()';

    if (hasTaggedInputs) {
        // Use tagged intermediate signals
        const inputArgs = inputs.map(input => {
            if (input.tag) {
                return `_${input.name}`;
            } else {
                return input.name;
            }
        }).join(', ');

        if (outputs.length === 1 && !outputs[0].isArray) {
            content += `    ${outputs[0].name} <== ${templateName}${templateParams}(${inputArgs});\n`;
        } else {
            const outputNames = outputs.map(output => output.name).join(', ');
            content += `    (${outputNames}) <== ${templateName}${templateParams}(${inputArgs});\n`;
        }
    } else {
        // Use input signals directly
        const inputArgs = inputs.map(input => input.name).join(', ');

        if (outputs.length === 1 && !outputs[0].isArray) {
            content += `    ${outputs[0].name} <== ${templateName}${templateParams}(${inputArgs});\n`;
        } else {
            const outputNames = outputs.map(output => output.name).join(', ');
            content += `    (${outputNames}) <== ${templateName}${templateParams}(${inputArgs});\n`;
        }
    }

    content += `}\n`;

    return content;
}

/**
 * Extract code that appears before signal declarations (variable declarations, assertions, etc.)
 * @param templateBody - Template body content
 * @returns Pre-signal code with proper indentation
 */
function extractPreSignalCode(templateBody: string): string {
    const lines = templateBody.split('\n');
    const preSignalLines: string[] = [];

    for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip empty lines and comments
        if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
            continue;
        }

        // Stop when we encounter the first signal declaration
        if (trimmedLine.startsWith('signal ')) {
            break;
        }

        // Include variable declarations, assertions, and other statements
        if (
            trimmedLine.startsWith('var ') ||
            trimmedLine.startsWith('assert(') ||
            trimmedLine.startsWith('component ') ||
            trimmedLine.includes('=') && !trimmedLine.includes('<==') && !trimmedLine.includes('==>')
        ) {
            // Add proper indentation
            const indentedLine = line.startsWith('    ') ? line : '    ' + trimmedLine;
            preSignalLines.push(indentedLine);
        }
    }

    return preSignalLines.join('\n');
}