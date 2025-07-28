import * as fs from "fs";
import * as path from "path";

interface Signal {
  name: string;
  tag?: string;
  arraySize?: string;
  busType?: string;
}

interface Template {
  name: string;
  params: string[];
  inputs: Signal[];
  outputs: Signal[];
  body: string;
}

interface BusDefinition {
  name: string;
  signals: Signal[];
}

interface GenerationConfig {
  template: Template;
  circuitPath: string;
  outDir: string;
  busDefinitions: BusDefinition[];
  isAppend: boolean;
}

/**
 * Check if untagged template already exists in content
 * @param content - Circom file content
 * @param templateName - Original template name
 * @returns True if untagged template exists
 */
function hasUntaggedTemplate(content: string, templateName: string): boolean {
  const untaggedTemplateName = `Untagged${templateName}`;
  const templateRegex = new RegExp(
    `template\\s+${untaggedTemplateName}\\s*\\(`,
    "gm",
  );
  return templateRegex.test(content);
}

/**
 * Generate untagged template from a Circom circuit file
 * @param circuitPath - Path to the source Circom file
 * @param templateName - Name of the template to generate untagged version for
 * @param append - If true, append to existing file; if false, create new file
 * @returns Promise resolving to the output file path
 */
async function generateUntaggedTemplate(
  circuitPath: string,
  templateName: string,
  append: boolean = false,
): Promise<string> {
  const content = await fs.promises.readFile(circuitPath, "utf8");

  if (hasUntaggedTemplate(content, templateName)) {
    console.log(`Untagged${templateName} already exists, skipping generation.`);
    return circuitPath;
  }

  const template = parseTemplate(content, templateName);

  if (!template) {
    throw new Error(`Template "${templateName}" not found in ${circuitPath}`);
  }

  const usedBusTypes = findUsedBusTypes(template);
  const busDefinitions = await collectBusDefinitions(
    circuitPath,
    content,
    usedBusTypes,
  );

  const config: GenerationConfig = {
    template,
    circuitPath,
    outDir: append ? path.dirname(circuitPath) : createOutDir(circuitPath),
    busDefinitions,
    isAppend: append,
  };

  const outPath = append
    ? circuitPath
    : path.join(config.outDir, `${templateName}.circom`);

  let finalContent: string;

  if (append) {
    finalContent = await generateAppendedContent(config, content);
  } else {
    finalContent = generateStandaloneContent(config, content);
  }

  await fs.promises.writeFile(outPath, finalContent, "utf8");
  return outPath;
}

/**
 * Create output directory for generated files
 * @param circuitPath - Path to the source circuit file
 * @returns Output directory path
 */
function createOutDir(circuitPath: string): string {
  const filename = path.basename(circuitPath, ".circom");
  const outDir = `circuits/test/${filename}/`;
  fs.mkdirSync(outDir, { recursive: true });
  return outDir;
}

/**
 * Comment out component main declaration in Circom code
 * @param content - Circom file content
 * @returns Modified content with component main commented out
 */
function commentComponentMain(content: string): string {
  const componentMainRegex = /^(\s*)(component\s+main\s*=.*?;)/gm;

  return content.replace(
    componentMainRegex,
    (match, indentation, declaration) => {
      // Don't modify if it's already commented
      if (declaration.includes("//")) {
        return match;
      }
      return `${indentation}// ${declaration}`;
    },
  );
}

/**
 * Uncomment component main declaration in Circom code
 * @param content - Circom file content
 * @returns Modified content with component main uncommented
 */
function uncommentComponentMain(content: string): string {
  const commentedComponentMainRegex =
    /^(\s*)\/\/\s*(component\s+main\s*=.*?;)/gm;

  return content.replace(
    commentedComponentMainRegex,
    (match, indentation, declaration) => {
      return `${indentation}${declaration}`;
    },
  );
}

/**
 * Remove component main declaration from Circom code
 * @param content - Circom file content
 * @param templateName - Optional template name to match specific main component
 * @returns Modified content with component main removed
 */
function removeComponentMain(content: string, templateName?: string): string {
  if (templateName) {
    // Remove specific template main component
    const mainComponentRegex = new RegExp(
      `\\s*component\\s+main\\s*=\\s*${templateName}\\s*\\([^)]*\\)\\s*;\\s*`,
      "gm",
    );
    return content.replace(mainComponentRegex, "");
  } else {
    // Remove any component main declaration
    const mainComponentRegex = /^\s*component\s+main\s*=.*?;\s*$/gm;
    return content.replace(mainComponentRegex, "");
  }
}

/**
 * Modify component main in a Circom file by commenting, uncommenting, or removing it
 * @param filePath - Path to the Circom file
 * @param action - Action to perform: "comment", "uncomment", or "remove"
 * @param templateName - Optional template name for specific removal
 * @returns Promise that resolves when the file is modified
 */
async function modifyComponentMainInFile(
  filePath: string,
  action: "comment" | "uncomment" | "remove",
  templateName?: string,
): Promise<void> {
  const content = await fs.promises.readFile(filePath, "utf8");

  let modifiedContent: string;
  switch (action) {
    case "comment":
      modifiedContent = commentComponentMain(content);
      break;
    case "uncomment":
      modifiedContent = uncommentComponentMain(content);
      break;
    case "remove":
      modifiedContent = removeComponentMain(content, templateName);
      break;
    default:
      throw new Error(`Invalid action: ${action}`);
  }

  if (modifiedContent !== content) {
    await fs.promises.writeFile(filePath, modifiedContent, "utf8");
  }
}

/**
 * Generate content for append mode (update existing file)
 * @param config - Generation configuration
 * @param originalContent - Original file content
 * @returns Modified content for append mode
 */
async function generateAppendedContent(
  config: GenerationConfig,
  originalContent: string,
): Promise<string> {
  // Comment existing main component
  const modifiedContent = commentComponentMain(originalContent);

  // Generate untagged template content
  const untaggedTemplateContent = generateUntaggedTemplateContent(config);

  // Generate main component
  const mainComponent = generateMainComponent(config.template);

  return `${modifiedContent}\n\n${untaggedTemplateContent}\n${mainComponent}`;
}

/**
 * Extract pragma directive from Circom content
 * @param content - Circom file content
 * @returns Pragma directive or default if not found
 */
function extractPragma(content: string): string {
  const pragmaMatch = content.match(/pragma\s+circom\s+[\d.]+\s*;/);
  return pragmaMatch ? pragmaMatch[0] : "pragma circom 2.2.2;";
}

/**
 * Generate content for standalone mode (new file)
 * @param config - Generation configuration
 * @param originalContent - Original file content to extract pragma from
 * @returns Complete content for standalone file
 */
function generateStandaloneContent(
  config: GenerationConfig,
  originalContent: string,
): string {
  const timestamp = new Date().toISOString();
  const relativePath = path
    .relative(config.outDir, config.circuitPath)
    .replace(/\\/g, "/");
  const pragmaDirective = extractPragma(originalContent);

  let content = `// Auto generated: ${timestamp}\n`;
  content += `${pragmaDirective}\n\n`;
  content += `include "${relativePath}";\n\n`;
  content += generateUntaggedTemplateContent(config);

  return content;
}

/**
 * Generate untagged template content
 * @param config - Generation configuration
 * @param includeBusDefinitions - Whether to include bus definitions
 * @returns Generated template content
 */
function generateUntaggedTemplateContent(config: GenerationConfig): string {
  const { template, busDefinitions, isAppend } = config;

  let content = "";

  // Add timestamp comment
  if (isAppend) {
    content += `// Auto updated: ${new Date().toISOString()}\n`;
  }

  content += generateUntaggedBusDefinitions(busDefinitions);

  // Generate template definition
  const paramsStr =
    template.params.length > 0 ? `(${template.params.join(", ")})` : "()";
  content += `template Untagged${template.name}${paramsStr} {\n`;
  content += extractPreSignalCode(template.body);
  content += generateUntaggedInputSignals(template.inputs);
  content += generateSignalDeclarations(template.outputs, "output");
  content += generateTaggedSignalHandling(template.inputs);
  content += generateBusInputIntermediateSignals(template.inputs);
  content += generateBusSignalAssignments(template.inputs);
  content += generateTemplateInstantiation(template);
  content += `}\n`;

  return content;
}

/**
 * Generate main component declaration
 * @param template - Template information
 * @returns Main component declaration string
 */
function generateMainComponent(template: Template): string {
  const paramsStr =
    template.params.length > 0 ? `(${template.params.join(", ")})` : "()";
  return `component main = Untagged${template.name}${paramsStr};\n`;
}

/**
 * Parse template definition from Circom content
 * @param content - Circom file content
 * @param templateName - Name of the template to parse
 * @returns Parsed template or null if not found
 */
function parseTemplate(content: string, templateName: string): Template | null {
  const templateRegex = new RegExp(
    `template\\s+${templateName}\\s*\\(([^)]*)\\)\\s*{`,
    "gm",
  );
  const match = templateRegex.exec(content);
  if (!match) return null;

  const paramsString = match[1].trim();
  const params = paramsString
    ? paramsString.split(",").map((p) => p.trim())
    : [];
  const body = extractTemplateBody(content, match.index + match[0].length);

  if (!body) return null;

  return {
    name: templateName,
    params,
    inputs: parseSignalsInOrder(body, "input"),
    outputs: parseSignalsInOrder(body, "output"),
    body,
  };
}

/**
 * Parse signal declarations from template body in order of appearance
 * @param templateBody - Template body content
 * @param signalType - Type of signal to parse ("input" or "output")
 * @returns Array of parsed signals in order of appearance
 */
function parseSignalsInOrder(
  templateBody: string,
  signalType: "input" | "output",
): Signal[] {
  const signals: Signal[] = [];
  const lines = templateBody.split("\n");

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (
      !trimmedLine ||
      trimmedLine.startsWith("//") ||
      trimmedLine.startsWith("/*")
    ) {
      continue;
    }

    // Pattern 1: signal input/output {tag} name[array]
    const normalSignalMatch = trimmedLine.match(
      new RegExp(
        `\\bsignal\\s+${signalType}\\b\\s*(?:{([^}]+)})?\\s*([a-zA-Z_][a-zA-Z0-9_]*)(?:\\s*((?:\\[[^\\]]+\\])+))?`,
      ),
    );

    if (normalSignalMatch) {
      signals.push({
        name: normalSignalMatch[2],
        tag: normalSignalMatch[1],
        arraySize: normalSignalMatch[3],
      });
      continue;
    }

    // Pattern 2: input/output BusType() name[array]
    const busSignalMatch1 = trimmedLine.match(
      new RegExp(
        `\\b${signalType}\\b\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\(\\)\\s*([a-zA-Z_][a-zA-Z0-9_]*)(?:\\s*((?:\\[[^\\]]+\\])+))?`,
      ),
    );

    if (busSignalMatch1) {
      signals.push({
        name: busSignalMatch1[2],
        busType: `${busSignalMatch1[1]}()`,
        arraySize: busSignalMatch1[3],
      });
      continue;
    }

    // Pattern 3: BusType() input/output name[array]
    const busSignalMatch2 = trimmedLine.match(
      new RegExp(
        `([a-zA-Z_][a-zA-Z0-9_]*)\\(\\)\\s+\\b${signalType}\\b\\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\\s*((?:\\[[^\\]]+\\])+))?`,
      ),
    );

    if (busSignalMatch2) {
      signals.push({
        name: busSignalMatch2[2],
        busType: `${busSignalMatch2[1]}()`,
        arraySize: busSignalMatch2[3],
      });
      continue;
    }
  }

  return signals;
}

/**
 * Extract template body content between braces
 * @param content - Full content string
 * @param startIndex - Starting index after opening brace
 * @returns Template body content or null if malformed
 */
function extractTemplateBody(
  content: string,
  startIndex: number,
): string | null {
  let braceCount = 1;
  let i = startIndex;

  while (i < content.length && braceCount > 0) {
    if (content[i] === "{") braceCount++;
    else if (content[i] === "}") braceCount--;
    i++;
  }

  return braceCount === 0 ? content.substring(startIndex, i - 1) : null;
}

// /**
//  * Parse signal declarations from template body
//  * @param templateBody - Template body content
//  * @param signalType - Type of signal to parse ("input" or "output")
//  * @returns Array of parsed signals
//  */
// function parseSignals(
//   templateBody: string,
//   signalType: "input" | "output",
// ): Signal[] {
//   const signals: Signal[] = [];
//   const regexPatterns = [
//     // Normal signals: signal input/output {tag} name[array]
//     new RegExp(
//       `\\bsignal\\s+${signalType}\\b\\s*(?:{([^}]+)})?\\s*([a-zA-Z_][a-zA-Z0-9_]*)(?:\\s*((?:\\[[^\\]]+\\])+))?`,
//       "g",
//     ),
//     // Bus signals pattern 1: input/output BusType() name[array]
//     new RegExp(
//       `\\b${signalType}\\b\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\(\\)\\s*([a-zA-Z_][a-zA-Z0-9_]*)(?:\\s*((?:\\[[^\\]]+\\])+))?`,
//       "g",
//     ),
//     // Bus signals pattern 2: BusType() input/output name[array]
//     new RegExp(
//       `([a-zA-Z_][a-zA-Z0-9_]*)\\(\\)\\s+\\b${signalType}\\b\\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\\s*((?:\\[[^\\]]+\\])+))?`,
//       "g",
//     ),
//   ];

//   regexPatterns.forEach((regex, index) => {
//     let match;
//     while ((match = regex.exec(templateBody)) !== null) {
//       if (index === 0) {
//         // Normal signal
//         signals.push({
//           name: match[2],
//           tag: match[1],
//           arraySize: match[3],
//         });
//       } else if (index === 1) {
//         // Bus signal pattern 1
//         signals.push({
//           name: match[2],
//           busType: `${match[1]}()`,
//           arraySize: match[3],
//         });
//       } else {
//         // Bus signal pattern 2
//         signals.push({
//           name: match[2],
//           busType: `${match[1]}()`,
//           arraySize: match[3],
//         });
//       }
//     }
//   });

//   return signals;
// }

/**
 * Generate untagged input signal declarations
 * @param inputs - Array of input signals
 * @returns Generated input signal declarations
 */
function generateUntaggedInputSignals(inputs: Signal[]): string {
  return (
    inputs
      .map((signal) => {
        const arrayPart = signal.arraySize || "";
        if (signal.busType) {
          const untaggedBusType = signal.busType.replace(
            /(\w+)\(\)/,
            "Untagged$1()",
          );
          return `    input ${untaggedBusType} ${signal.name}${arrayPart};`;
        } else {
          return `    signal input ${signal.name}${arrayPart};`;
        }
      })
      .join("\n") + (inputs.length > 0 ? "\n" : "")
  );
}

/**
 * Generate signal declarations for inputs or outputs
 * @param signals - Array of signals to declare
 * @param type - Signal type ("input" or "output")
 * @returns Generated signal declarations
 */
function generateSignalDeclarations(
  signals: Signal[],
  type: "input" | "output",
): string {
  return (
    signals
      .map((signal) => {
        const arrayPart = signal.arraySize || "";
        if (signal.busType) {
          return `    ${type} ${signal.busType} ${signal.name}${arrayPart};`;
        } else if (signal.tag && type === "output") {
          return `    signal ${type} {${signal.tag}} ${signal.name}${arrayPart};`;
        } else {
          return `    signal ${type} ${signal.name}${arrayPart};`;
        }
      })
      .join("\n") + (signals.length > 0 ? "\n" : "")
  );
}

/**
 * Generate intermediate signals for bus inputs
 * @param inputs - Array of input signals
 * @returns Generated intermediate signal declarations
 */
function generateBusInputIntermediateSignals(inputs: Signal[]): string {
  const busInputs = inputs.filter((input) => input.busType);
  if (busInputs.length === 0) return "";

  const declarations = busInputs
    .map((input) => {
      const arrayPart = input.arraySize || "";
      return `    ${input.busType} _${input.name}${arrayPart};`;
    })
    .join("\n");

  return `\n${declarations}\n`;
}

/**
 * Generate bus signal assignments
 * @param inputs - Array of input signals
 * @returns Generated bus signal assignments
 */
function generateBusSignalAssignments(inputs: Signal[]): string {
  const busInputs = inputs.filter((input) => input.busType);
  if (busInputs.length === 0) return "";

  const assignments = busInputs
    .map((input) => {
      if (input.arraySize) {
        const dimensions = extractArrayDimensions(input.arraySize);
        return generateNestedLoopAssignment(input.name, dimensions);
      } else {
        return `    _${input.name}.bytes <== ${input.name}.bytes;`;
      }
    })
    .join("\n");

  return `\n${assignments}\n`;
}

/**
 * Extract array dimensions from array size string
 * @param arraySize - Array size string like "[5][10]"
 * @returns Array of dimension strings
 */
function extractArrayDimensions(arraySize: string): string[] {
  const matches = arraySize.match(/\[([^\]]+)\]/g);
  return matches ? matches.map((match) => match.slice(1, -1)) : [];
}

/**
 * Generate nested loop assignments for multi-dimensional arrays
 * @param name - Signal name
 * @param dimensions - Array dimensions
 * @returns Generated nested loop assignment code
 */
function generateNestedLoopAssignment(
  name: string,
  dimensions: string[],
): string {
  if (dimensions.length === 0) return "";

  let content = "";
  let indent = "    ";
  const indexVars = dimensions.map((_, i) => String.fromCharCode(105 + i)); // i, j, k, l...

  // Generate nested for loops
  dimensions.forEach((dimension, i) => {
    content += `${indent}for (var ${indexVars[i]} = 0; ${indexVars[i]} < ${dimension}; ${indexVars[i]}++) {\n`;
    indent += "    ";
  });

  // Generate the assignment
  const indexing = indexVars.map((v) => `[${v}]`).join("");
  content += `${indent}_${name}${indexing}.bytes <== ${name}${indexing}.bytes;\n`;

  // Close the loops
  for (let i = dimensions.length - 1; i >= 0; i--) {
    indent = indent.slice(0, -4);
    content += `${indent}}\n`;
  }

  return content;
}

/**
 * Generate template instantiation code with correct parameter order
 * @param template - Template information
 * @returns Generated template instantiation code
 */
function generateTemplateInstantiation(template: Template): string {
  const paramsStr =
    template.params.length > 0 ? `(${template.params.join(", ")})` : "()";

  let content = "\n";

  if (template.outputs.length === 0) {
    // No outputs - use component instantiation with proper input assignment
    content += `    component ${template.name.toLowerCase()}Component = ${template.name}${paramsStr};\n`;

    // Assign inputs in original order
    template.inputs.forEach((input) => {
      const inputName =
        input.busType || input.tag ? `_${input.name}` : input.name;
      content += `    ${template.name.toLowerCase()}Component.${input.name} <== ${inputName};\n`;
    });
  } else if (template.outputs.length === 1) {
    // Single output - use component instantiation with proper input assignment
    content += `    component ${template.name.toLowerCase()}Component = ${template.name}${paramsStr};\n`;

    // Assign inputs in original order
    template.inputs.forEach((input) => {
      const inputName =
        input.busType || input.tag ? `_${input.name}` : input.name;
      content += `    ${template.name.toLowerCase()}Component.${input.name} <== ${inputName};\n`;
    });

    // Assign output
    content += `    ${template.outputs[0].name} <== ${template.name.toLowerCase()}Component.${template.outputs[0].name};\n`;
  } else {
    // Multiple outputs - use component instantiation with proper input assignment
    content += `    component ${template.name.toLowerCase()}Component = ${template.name}${paramsStr};\n`;

    // Assign inputs in original order
    template.inputs.forEach((input) => {
      const inputName =
        input.busType || input.tag ? `_${input.name}` : input.name;
      content += `    ${template.name.toLowerCase()}Component.${input.name} <== ${inputName};\n`;
    });

    // Assign outputs
    template.outputs.forEach((output) => {
      content += `    ${output.name} <== ${template.name.toLowerCase()}Component.${output.name};\n`;
    });
  }

  return content;
}

/**
 * Extract pre-signal code from template body
 * @param templateBody - Template body content
 * @returns Extracted pre-signal code
 */
function extractPreSignalCode(templateBody: string): string {
  const lines = templateBody.split("\n");
  const preSignalLines: string[] = [];
  let i = 0;
  let insideBlock = false;
  let blockBraceCount = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*")) {
      i++;
      continue;
    }

    // Stop at signal declarations
    if (
      /\bsignal\s+(input|output)\b/.test(trimmed) ||
      /\b(input|output)\b\s+[a-zA-Z_]/.test(trimmed)
    ) {
      break;
    }

    // Handle code blocks
    if (trimmed.includes("{")) {
      insideBlock = true;
      blockBraceCount += (trimmed.match(/{/g) || []).length;
    }

    if (insideBlock && trimmed.includes("}")) {
      blockBraceCount -= (trimmed.match(/}/g) || []).length;
      if (blockBraceCount <= 0) {
        insideBlock = false;
        blockBraceCount = 0;
      }
    }

    // Include relevant code lines
    const shouldInclude =
      trimmed.startsWith("var ") ||
      trimmed.startsWith("assert(") ||
      trimmed.startsWith("component ") ||
      trimmed.startsWith("if (") ||
      trimmed.startsWith("} else") ||
      trimmed.startsWith("else") ||
      trimmed === "}" ||
      insideBlock ||
      (trimmed.includes("=") &&
        !trimmed.includes("<==") &&
        !trimmed.includes("==>")) ||
      /^\s*signal\s+(?!input|output)[a-zA-Z_]/.test(trimmed);

    if (shouldInclude) {
      const indentedLine = line.startsWith("    ") ? line : "    " + trimmed;
      preSignalLines.push(indentedLine);
    }

    i++;
  }

  return preSignalLines.length > 0 ? preSignalLines.join("\n") + "\n\n" : "";
}

/**
 * Generate tagged signal handling code
 * @param inputs - Array of input signals
 * @returns Generated tagged signal handling code
 */
function generateTaggedSignalHandling(inputs: Signal[]): string {
  const taggedInputs = inputs.filter((input) => input.tag && !input.busType);
  if (taggedInputs.length === 0) return "";

  const declarations = taggedInputs
    .map((input) => {
      const arrayPart = input.arraySize || "";
      if (input.arraySize) {
        return `    signal {${input.tag}} _${input.name}${arrayPart};\n    _${input.name} <== ${input.name};`;
      } else {
        return `    signal {${input.tag}} _${input.name} <== ${input.name};`;
      }
    })
    .join("\n");

  return `\n${declarations}\n`;
}

/**
 * Find used bus types in template signals
 * @param template - Template to analyze
 * @returns Set of used bus type names
 */
function findUsedBusTypes(template: Template): Set<string> {
  const busTypes = new Set<string>();
  [...template.inputs, ...template.outputs].forEach((signal) => {
    if (signal.busType) {
      const busName = signal.busType.replace(/\(\)$/, "");
      busTypes.add(busName);
    }
  });
  return busTypes;
}

/**
 * Collect bus definitions from circuit and includes
 * @param circuitPath - Path to the circuit file
 * @param content - Content of the circuit file
 * @param usedBusTypes - Set of bus types to collect
 * @returns Promise resolving to array of bus definitions
 */
async function collectBusDefinitions(
  circuitPath: string,
  content: string,
  usedBusTypes: Set<string>,
): Promise<BusDefinition[]> {
  const busDefinitions: BusDefinition[] = [];
  const processedBuses = new Set<string>();
  const busQueue = [...usedBusTypes];

  while (busQueue.length > 0) {
    const originalBusName = busQueue.shift();
    if (!originalBusName) continue;

    const untaggedBusName = `Untagged${originalBusName}`;
    if (processedBuses.has(untaggedBusName)) continue;
    processedBuses.add(untaggedBusName);

    let busDefinition = parseBusDefinition(content, originalBusName);
    if (!busDefinition) {
      busDefinition = await searchBusInIncludes(
        circuitPath,
        content,
        originalBusName,
      );
    }

    if (busDefinition) {
      const untaggedBusDefinition = convertToUntaggedBus(busDefinition);
      busDefinitions.push(untaggedBusDefinition);

      // Add dependencies to queue
      untaggedBusDefinition.signals.forEach((signal) => {
        if (signal.busType) {
          const depBusName = signal.busType.replace(/\(\)$/, "");
          if (
            !processedBuses.has(`Untagged${depBusName}`) &&
            !busQueue.includes(depBusName)
          ) {
            busQueue.push(depBusName);
          }
        }
      });
    }
  }

  return busDefinitions;
}

/**
 * Search for bus definition in included files
 * @param circuitPath - Path to the circuit file
 * @param content - Content of the circuit file
 * @param busName - Name of the bus to search for
 * @returns Promise resolving to bus definition or null if not found
 */
async function searchBusInIncludes(
  circuitPath: string,
  content: string,
  busName: string,
): Promise<BusDefinition | null> {
  const includeRegex = /include\s+"([^"]+)";/g;
  const circuitDir = path.dirname(circuitPath);
  let match;

  while ((match = includeRegex.exec(content)) !== null) {
    const includePath = match[1];
    if (includePath.startsWith("circomlib/")) continue;

    try {
      const resolvedPath = path.resolve(circuitDir, includePath);
      const includeContent = await fs.promises.readFile(resolvedPath, "utf8");

      let busDefinition = parseBusDefinition(includeContent, busName);
      if (busDefinition) return busDefinition;

      busDefinition = await searchBusInIncludes(
        resolvedPath,
        includeContent,
        busName,
      );
      if (busDefinition) return busDefinition;
    } catch {
      console.warn(`Warning: Could not read include file: ${includePath}`);
    }
  }

  return null;
}

/**
 * Parse bus definition from content
 * @param content - Content to parse
 * @param busName - Name of the bus to parse
 * @returns Parsed bus definition or null if not found
 */
function parseBusDefinition(
  content: string,
  busName: string,
): BusDefinition | null {
  const busStartRegex = new RegExp(`bus\\s+${busName}\\s*\\(\\)\\s*{`, "gm");
  const match = busStartRegex.exec(content);
  if (!match) return null;

  const startIndex = match.index + match[0].length;
  let braceCount = 1;
  let i = startIndex;

  while (i < content.length && braceCount > 0) {
    if (content[i] === "{") braceCount++;
    else if (content[i] === "}") braceCount--;
    i++;
  }

  if (braceCount !== 0) return null;

  const busBody = content.substring(startIndex, i - 1);
  const signals = parseBusSignals(busBody);

  return { name: busName, signals };
}

/**
 * Parse signals from bus body content
 * @param busBody - Bus body content
 * @returns Array of parsed signals
 */
function parseBusSignals(busBody: string): Signal[] {
  const signals: Signal[] = [];
  const lines = busBody.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*"))
      continue;

    const cleanLine = trimmed.replace(/;$/, "");

    // Bus signals with multi-dimensional arrays
    const busSignalMatch = cleanLine.match(
      /^([a-zA-Z_][a-zA-Z0-9_]*)\(\)\s*(?:{([^}]+)})?\s*([a-zA-Z_][a-zA-Z0-9_]*)(?:\s*((?:\[[^\]]+\])+))?$/,
    );

    if (busSignalMatch) {
      signals.push({
        name: busSignalMatch[3],
        busType: `${busSignalMatch[1]}()`,
        tag: busSignalMatch[2],
        arraySize: busSignalMatch[4],
      });
      continue;
    }

    // Normal signals with multi-dimensional arrays
    const normalSignalMatch = cleanLine.match(
      /^signal\s*(?:{([^}]+)})?\s*([a-zA-Z_][a-zA-Z0-9_]*)(?:\s*((?:\[[^\]]+\])+))?$/,
    );

    if (normalSignalMatch) {
      signals.push({
        name: normalSignalMatch[2],
        tag: normalSignalMatch[1],
        arraySize: normalSignalMatch[3],
      });
    }
  }

  return signals;
}

/**
 * Convert bus definition to untagged version
 * @param busDefinition - Original bus definition
 * @returns Untagged bus definition
 */
function convertToUntaggedBus(busDefinition: BusDefinition): BusDefinition {
  return {
    name: `Untagged${busDefinition.name}`,
    signals: busDefinition.signals.map((signal) => ({
      name: signal.name,
      arraySize: signal.arraySize,
      busType: signal.busType,
      tag: undefined, // Remove tags from bus
    })),
  };
}

/**
 * Generate untagged bus definitions
 * @param busDefinitions - Array of bus definitions
 * @returns Generated bus definitions string
 */
function generateUntaggedBusDefinitions(
  busDefinitions: BusDefinition[],
): string {
  if (busDefinitions.length === 0) return "";

  return (
    busDefinitions
      .map((bus) => {
        const signalDeclarations = bus.signals
          .map((signal) => {
            const arrayPart = signal.arraySize || "";
            return signal.busType
              ? `    ${signal.busType} ${signal.name}${arrayPart};`
              : `    signal ${signal.name}${arrayPart};`;
          })
          .join("\n");

        return `bus ${bus.name}() {\n${signalDeclarations}\n}`;
      })
      .join("\n\n") + "\n\n"
  );
}

/**
 * Main function for command line usage
 */
async function main() {
  const [circuitPath, templateName, append] = process.argv.slice(2);

  if (!circuitPath || !templateName) {
    console.log(
      "Usage: pnpm exec tsx template.ts <circuitPath> <templateName> [append]",
    );
    process.exit(1);
  }

  const appendBool = append === "true" || append === "1";

  try {
    await generateUntaggedTemplate(circuitPath, templateName, appendBool);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { generateUntaggedTemplate, modifyComponentMainInFile };
