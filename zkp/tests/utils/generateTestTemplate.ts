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

export async function generateTestTemplate(
  absoluteCircuitPath: string,
  templateName: string,
): Promise<string> {
  // Read and parse original circuit file
  const content = await fs.promises.readFile(absoluteCircuitPath, "utf8");
  const template = parseTemplate(content, templateName);

  if (!template) {
    throw new Error(
      `Template "${templateName}" not found in ${absoluteCircuitPath}`,
    );
  }

  // Create test directory and file
  const testDir = createTestDir(absoluteCircuitPath);
  const testPath = path.join(testDir, `${templateName}.circom`);
  const testContent = generateTestContent(
    template,
    absoluteCircuitPath,
    testDir,
  );

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
  // Find template start position
  const templateRegex = new RegExp(
    `template\\s+${templateName}\\s*\\(([^)]*)\\)\\s*{`,
    "gm",
  );

  const match = templateRegex.exec(content);
  if (!match) return null;

  // Parse parameters
  const paramsString = match[1].trim();
  const params = paramsString
    ? paramsString.split(",").map((p) => p.trim())
    : [];

  // Extract template body
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

function parseSignals(
  templateBody: string,
  signalType: "input" | "output",
): Signal[] {
  const signals: Signal[] = [];

  // Match normal signals: signal input/output {tag}? name[array]?
  const normalSignalRegex = new RegExp(
    `signal\\s+${signalType}\\s*(?:{([^}]+)})?\\s*([a-zA-Z_][a-zA-Z0-9_]*)(?:\\s*\\[([^\\]]+)\\])?`,
    "g",
  );

  // Match bus signals: output BusType() name[array]?
  const busSignalRegex = new RegExp(
    `${signalType}\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\(\\)\\s*([a-zA-Z_][a-zA-Z0-9_]*)(?:\\s*\\[([^\\]]+)\\])?`,
    "g",
  );

  let match;

  // Parse normal signals
  while ((match = normalSignalRegex.exec(templateBody)) !== null) {
    signals.push({
      name: match[2],
      tag: match[1],
      arraySize: match[3],
    });
  }

  // Parse bus signals
  while ((match = busSignalRegex.exec(templateBody)) !== null) {
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
): string {
  const relativePath = path.relative(testDir, circuitPath).replace(/\\/g, "/");
  const timestamp = new Date().toISOString();

  let content = `// Auto generated: ${timestamp}\npragma circom 2.2.2;\n\n`;
  content += `include "${relativePath}";\n\n`;

  // Generate test template declaration
  const paramsStr =
    template.params.length > 0 ? `(${template.params.join(", ")})` : "()";
  content += `template Test${template.name}${paramsStr} {\n`;

  // Add preprocessing code
  content += extractPreSignalCode(template.body);

  // Generate input signals
  content += generateSignalDeclarations(template.inputs, "input");

  // Handle tagged input signals
  content += generateTaggedSignalHandling(template.inputs);

  // Generate output signals
  content += generateSignalDeclarations(template.outputs, "output");

  // Generate template instantiation
  content += generateTemplateInstantiation(template);

  content += `}\n`;
  return content;
}

function generateSignalDeclarations(
  signals: Signal[],
  type: "input" | "output",
): string {
  let content = "";

  for (const signal of signals) {
    const arrayPart = signal.arraySize ? `[${signal.arraySize}]` : "";

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

function generateTaggedSignalHandling(inputs: Signal[]): string {
  let content = "";
  const hasTaggedInputs = inputs.some((input) => input.tag && !input.busType);

  if (hasTaggedInputs) {
    for (const input of inputs) {
      if (input.tag && !input.busType) {
        if (input.arraySize) {
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

  return content;
}

function generateTemplateInstantiation(template: Template): string {
  const paramsStr =
    template.params.length > 0 ? `(${template.params.join(", ")})` : "()";
  const hasTaggedInputs = template.inputs.some(
    (input) => input.tag && !input.busType,
  );

  // Prepare input arguments
  const inputArgs = template.inputs
    .map((input) =>
      input.tag && !input.busType ? `_${input.name}` : input.name,
    )
    .join(", ");

  let content = "\n";

  if (template.outputs.length === 1) {
    content += `    ${template.outputs[0].name} <== ${template.name}${paramsStr}(${inputArgs});\n`;
  } else {
    const outputNames = template.outputs
      .map((output) => output.name)
      .join(", ");
    content += `    (${outputNames}) <== ${template.name}${paramsStr}(${inputArgs});\n`;
  }

  return content;
}

function extractPreSignalCode(templateBody: string): string {
  const lines = templateBody.split("\n");
  const preSignalLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*")) {
      continue;
    }

    // Stop when encountering signal declaration
    if (trimmed.startsWith("signal ")) {
      break;
    }

    // Include variable declarations, assertions, etc.
    if (
      trimmed.startsWith("var ") ||
      trimmed.startsWith("assert(") ||
      trimmed.startsWith("component ") ||
      (trimmed.includes("=") &&
        !trimmed.includes("<==") &&
        !trimmed.includes("==>"))
    ) {
      const indentedLine = line.startsWith("    ") ? line : "    " + trimmed;
      preSignalLines.push(indentedLine);
    }
  }

  return preSignalLines.length > 0 ? preSignalLines.join("\n") + "\n" : "";
}
