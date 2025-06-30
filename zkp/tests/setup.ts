import * as fs from "fs/promises";

beforeAll(async () => {
  console.log("Setting up test environment...");

  const dirs = [
    "circuits/multiplier2/input",
    "circuits/multiplier2/build",
    "circuits/multiplier2/keys",
    "circuits/multiplier2/proofs",
    "circuits/multiplier2/contracts",
    "circuits/shared/keys",
    "temp",
  ];

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true }).catch(() => {});
  }

  const exampleInput = {
    a: 3,
    b: 11,
  };

  await fs
    .writeFile(
      "circuits/multiplier2/input/example.json",
      JSON.stringify(exampleInput, null, 2),
    )
    .catch(() => {});

  console.log("Test environment setup completed");
});

afterAll(async () => {
  console.log("Cleaning up test environment...");

  await fs.rm("temp", { recursive: true, force: true }).catch(() => {});

  console.log("Test environment cleanup completed");
});

jest.setTimeout(300000); // 5 minutes for all tests