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

export async function generateTestTemplate(
  circuitPath: string,
  templateName: string,
): Promise<string> {
  const content = await fs.promises.readFile(circuitPath, "utf8");
  const template = parseTemplate(content, templateName);

  if (!template) {
    throw new Error(`Template "${templateName}" not found in ${circuitPath}`);
  }

  const usedBusTypes = findUsedBusTypes(template);
  const busDefinitions = await collectBusDefinitions(circuitPath, content, usedBusTypes);

  const testDir = createTestDir(circuitPath);
  const testPath = path.join(testDir, `${templateName}.circom`);
  const testContent = generateTestContent(template, circuitPath, testDir, busDefinitions);

  await fs.promises.writeFile(testPath, testContent, "utf8");
  return testPath;
}

function createTestDir(circuitPath: string): string {
  const filename = path.basename(circuitPath, ".circom");
  const testDir = `circuits/test/${filename}/`;
  fs.mkdirSync(testDir, { recursive: true });
  return testDir;
}

function parseTemplate(content: string, templateName: string): Template | null {
  const templateRegex = new RegExp(
    `template\\s+${templateName}\\s*\\(([^)]*)\\)\\s*{`,
    "gm",
  );

  const match = templateRegex.exec(content);
  if (!match) return null;

  const paramsString = match[1].trim();
  const params = paramsString ? paramsString.split(",").map((p) => p.trim()) : [];

  const body = extractTemplateBody(content, match.index + match[0].length);
  if (!body) return null;

  return {
    name: templateName,
    params,
    inputs: parseSignals(body, "input"),
    outputs: parseSignals(body, "output"),
    body,
  };
}

function extractTemplateBody(content: string, startIndex: number): string | null {
  let braceCount = 1;
  let i = startIndex;

  while (i < content.length && braceCount > 0) {
    if (content[i] === "{") braceCount++;
    else if (content[i] === "}") braceCount--;
    i++;
  }

  return braceCount === 0 ? content.substring(startIndex, i - 1) : null;
}

function parseSignals(templateBody: string, signalType: "input" | "output"): Signal[] {
  const signals: Signal[] = [];

  const normalSignalRegex = new RegExp(
    `signal\\s+${signalType}\\s*(?:{([^}]+)})?\\s*([a-zA-Z_][a-zA-Z0-9_]*)(?:\\s*((?:\\[[^\\]]+\\])+))?`,
    "g",
  );

  const busSignalRegex1 = new RegExp(
    `${signalType}\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\(\\)\\s*([a-zA-Z_][a-zA-Z0-9_]*)(?:\\s*((?:\\[[^\\]]+\\])+))?`,
    "g",
  );

  const busSignalRegex2 = new RegExp(
    `([a-zA-Z_][a-zA-Z0-9_]*)\\(\\)\\s+${signalType}\\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\\s*((?:\\[[^\\]]+\\])+))?`,
    "g",
  );

  let match;

  // Parse normal signals with multi-dimensional array support
  while ((match = normalSignalRegex.exec(templateBody)) !== null) {
    signals.push({
      name: match[2],
      tag: match[1],
      arraySize: match[3],
    });
  }

  // Parse bus signals (pattern 1: input BusType() name)
  while ((match = busSignalRegex1.exec(templateBody)) !== null) {
    signals.push({
      name: match[2],
      busType: `${match[1]}()`,
      arraySize: match[3],
    });
  }

  // Parse bus signals (pattern 2: BusType() input name)
  while ((match = busSignalRegex2.exec(templateBody)) !== null) {
    signals.push({
      name: match[2],
      busType: `${match[1]}()`,
      arraySize: match[3],
    });
  }

  return signals;
}

function generateTestContent(
  template: Template,
  circuitPath: string,
  testDir: string,
  busDefinitions: BusDefinition[],
): string {
  const relativePath = path.relative(testDir, circuitPath).replace(/\\/g, "/");
  const timestamp = new Date().toISOString();

  let content = `// Auto generated: ${timestamp}\npragma circom 2.2.2;\n\n`;
  content += `include "${relativePath}";\n\n`;

  content += generateTestBusDefinitions(busDefinitions);

  const paramsStr = template.params.length > 0 ? `(${template.params.join(", ")})` : "()";
  content += `template Test${template.name}${paramsStr} {\n`;

  content += extractPreSignalCode(template.body);
  content += generateTestInputSignals(template.inputs);
  content += generateSignalDeclarations(template.outputs, "output");
  content += generateTaggedSignalHandling(template.inputs);
  content += generateBusInputIntermediateSignals(template.inputs);
  content += generateBusSignalAssignments(template.inputs);
  content += generateTemplateInstantiation(template);

  content += `}\n`;
  return content;
}

function generateTestInputSignals(inputs: Signal[]): string {
  let content = "";

  for (const signal of inputs) {
    const arrayPart = signal.arraySize || "";

    if (signal.busType) {
      const testBusType = signal.busType.replace(/(\w+)\(\)/, "Test$1()");
      content += `    input ${testBusType} ${signal.name}${arrayPart};\n`;
    } else {
      content += `    signal input ${signal.name}${arrayPart};\n`;
    }
  }

  return content;
}

function generateSignalDeclarations(signals: Signal[], type: "input" | "output"): string {
  let content = "";

  for (const signal of signals) {
    const arrayPart = signal.arraySize || "";

    if (signal.busType) {
      content += `    ${type} ${signal.busType} ${signal.name}${arrayPart};\n`;
    } else if (signal.tag && type === "output") {
      content += `    signal ${type} {${signal.tag}} ${signal.name}${arrayPart};\n`;
    } else {
      content += `    signal ${type} ${signal.name}${arrayPart};\n`;
    }
  }

  return content;
}

function generateBusInputIntermediateSignals(inputs: Signal[]): string {
  const busInputs = inputs.filter(input => input.busType);
  if (busInputs.length === 0) return "";

  let content = "\n";
  for (const input of busInputs) {
    const arrayPart = input.arraySize || "";
    content += `    ${input.busType} _${input.name}${arrayPart};\n`;
  }

  return content;
}

function generateBusSignalAssignments(inputs: Signal[]): string {
  const busInputs = inputs.filter(input => input.busType);
  if (busInputs.length === 0) return "";

  let content = "\n";
  for (const input of busInputs) {
    if (input.arraySize) {
      const dimensions = extractArrayDimensions(input.arraySize);
      content += generateNestedLoopAssignment(input.name, dimensions);
    } else {
      content += `    _${input.name}.bytes <== ${input.name}.bytes;\n`;
    }
  }

  return content;
}

function extractArrayDimensions(arraySize: string): string[] {
  const matches = arraySize.match(/\[([^\]]+)\]/g);
  return matches ? matches.map(match => match.slice(1, -1)) : [];
}

// Generate nested loop assignments for multi-dimensional arrays
function generateNestedLoopAssignment(name: string, dimensions: string[]): string {
  if (dimensions.length === 0) return "";

  let content = "";
  let indent = "    ";
  let indexVars = [];

  // Generate nested for loops
  for (let i = 0; i < dimensions.length; i++) {
    const indexVar = String.fromCharCode(105 + i); // i, j, k, l...
    indexVars.push(indexVar);
    content += `${indent}for (var ${indexVar} = 0; ${indexVar} < ${dimensions[i]}; ${indexVar}++) {\n`;
    indent += "    ";
  }

  // Generate the assignment with proper indexing
  const indexing = indexVars.map(v => `[${v}]`).join("");
  content += `${indent}_${name}${indexing}.bytes <== ${name}${indexing}.bytes;\n`;

  // Close the loops
  for (let i = dimensions.length - 1; i >= 0; i--) {
    indent = indent.slice(0, -4);
    content += `${indent}}\n`;
  }

  return content;
}

function generateTemplateInstantiation(template: Template): string {
  const paramsStr = template.params.length > 0 ? `(${template.params.join(", ")})` : "()";

  const inputArgs = template.inputs
    .map((input) => (input.busType || input.tag) ? `_${input.name}` : input.name)
    .join(", ");

  let content = "\n";

  if (template.outputs.length === 0) {
    content += `    ${template.name}${paramsStr}(${inputArgs});\n`;
  } else if (template.outputs.length === 1) {
    content += `    ${template.outputs[0].name} <== ${template.name}${paramsStr}(${inputArgs});\n`;
  } else {
    const outputNames = template.outputs.map(output => output.name).join(", ");
    content += `    (${outputNames}) <== ${template.name}${paramsStr}(${inputArgs});\n`;
  }

  return content;
}

function extractPreSignalCode(templateBody: string): string {
  const lines = templateBody.split("\n");
  const preSignalLines: string[] = [];
  let i = 0;
  let insideBlock = false;
  let blockBraceCount = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*")) {
      i++;
      continue;
    }

    // Stop at signal declarations
    if (trimmed.startsWith("signal ") || trimmed.startsWith("input ") || trimmed.startsWith("output ")) {
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

    // Include variable declarations, assertions, etc.
    if (
      trimmed.startsWith("var ") ||
      trimmed.startsWith("assert(") ||
      trimmed.startsWith("component ") ||
      trimmed.startsWith("if (") ||
      trimmed.startsWith("} else if (") ||
      trimmed.startsWith("} else {") ||
      trimmed.startsWith("else {") ||
      trimmed.startsWith("else if (") ||
      trimmed === "}" ||
      insideBlock ||
      (trimmed.includes("=") && !trimmed.includes("<==") && !trimmed.includes("==>"))
    ) {
      const indentedLine = line.startsWith("    ") ? line : "    " + trimmed;
      preSignalLines.push(indentedLine);
    }

    i++;
  }

  return preSignalLines.length > 0 ? preSignalLines.join("\n") + "\n\n" : "";
}

function generateTaggedSignalHandling(inputs: Signal[]): string {
  const taggedInputs = inputs.filter(input => input.tag && !input.busType);
  if (taggedInputs.length === 0) return "";

  let content = "\n";
  for (const input of taggedInputs) {
    const arrayPart = input.arraySize || "";
    if (input.arraySize) {
      content += `    signal {${input.tag}} _${input.name}${arrayPart};\n`;
      content += `    _${input.name} <== ${input.name};\n`;
    } else {
      content += `    signal {${input.tag}} _${input.name} <== ${input.name};\n`;
    }
  }

  return content;
}

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

async function collectBusDefinitions(
  circuitPath: string,
  content: string,
  usedBusTypes: Set<string>,
): Promise<BusDefinition[]> {
  const busDefinitions: BusDefinition[] = [];
  const processedBuses = new Set<string>();

  const originalBusTypes = Array.from(usedBusTypes).map((busName) =>
    busName.startsWith("Test") ? busName.replace(/^Test/, "") : busName,
  );

  const busQueue = [...originalBusTypes];

  while (busQueue.length > 0) {
    const originalBusName = busQueue.shift()!;
    const testBusName = `Test${originalBusName}`;

    if (processedBuses.has(testBusName)) continue;
    processedBuses.add(testBusName);

    let busDefinition = parseBusDefinition(content, originalBusName);

    if (!busDefinition) {
      busDefinition = await searchBusInIncludes(circuitPath, content, originalBusName);
    }

    if (busDefinition) {
      const testBusDefinition = convertToTestBus(busDefinition);
      busDefinitions.push(testBusDefinition);

      // Add bus dependencies to queue
      testBusDefinition.signals.forEach((signal) => {
        if (signal.busType) {
          const depBusName = signal.busType.replace(/\(\)$/, "");
          if (!processedBuses.has(`Test${depBusName}`) && !busQueue.includes(depBusName)) {
            busQueue.push(depBusName);
          }
        }
      });
    }
  }

  return busDefinitions;
}

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

      const busDefinition = parseBusDefinition(includeContent, busName);
      if (busDefinition) {
        return busDefinition;
      }

      const nestedBus = await searchBusInIncludes(resolvedPath, includeContent, busName);
      if (nestedBus) {
        return nestedBus;
      }
    } catch (error) {
      console.warn(`Warning: Could not read include file: ${includePath}`);
      continue;
    }
  }

  return null;
}

function parseBusDefinition(content: string, busName: string): BusDefinition | null {
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

  return {
    name: busName,
    signals,
  };
}

function parseBusSignals(busBody: string): Signal[] {
  const signals: Signal[] = [];
  const lines = busBody.split("\n");

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("//") || trimmedLine.startsWith("/*")) {
      continue;
    }

    const cleanLine = trimmedLine.replace(/;$/, "");

    // Enhanced regex for bus signals with multi-dimensional arrays
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

    // Enhanced regex for normal signals with multi-dimensional arrays
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

function convertToTestBus(busDefinition: BusDefinition): BusDefinition {
  return {
    name: `Test${busDefinition.name}`,
    signals: busDefinition.signals.map((signal) => ({
      name: signal.name,
      arraySize: signal.arraySize,
      busType: signal.busType,
      tag: undefined, // Remove tags from test bus
    })),
  };
}

function generateTestBusDefinitions(busDefinitions: BusDefinition[]): string {
  if (busDefinitions.length === 0) return "";

  let content = "";

  busDefinitions.forEach((bus) => {
    content += `bus ${bus.name}() {\n`;

    bus.signals.forEach((signal) => {
      const arrayPart = signal.arraySize || "";

      if (signal.busType) {
        content += `    ${signal.busType} ${signal.name}${arrayPart};\n`;
      } else {
        content += `    signal ${signal.name}${arrayPart};\n`;
      }
    });

    content += `}\n\n`;
  });

  return content;
}