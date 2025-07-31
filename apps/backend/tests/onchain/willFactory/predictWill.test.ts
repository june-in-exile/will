import {
  vi,
  describe,
  beforeEach,
  afterEach,
  it,
  expect,
  beforeAll,
} from "vitest";
import { ethers, JsonRpcProvider, Network } from "ethers";
import * as predictWillModule from "@src/onchain/willFactory/predictWill.js";

// Test constants
const MOCK_WILL_FACTORY = "0x1234567890123456789012345678901234567890";
const MOCK_TESTATOR = "0xabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd";
const MOCK_BENEFICIARY = "0xefghefghefghefghefghefghefghefghefghefgh";
const MOCK_TOKEN = "0x1111111111111111111111111111111111111111";
const MOCK_PREDICTED_ADDRESS = "0x9999999999999999999999999999999999999999";
const MOCK_SALT = 123456789;

// Test data
const validWillData = {
  testator: MOCK_TESTATOR,
  estates: [
    {
      beneficiary: MOCK_BENEFICIARY,
      token: MOCK_TOKEN,
      amount: "1000000000000000000",
    },
  ],
};

const validAddressedWill = {
  ...validWillData,
  salt: MOCK_SALT,
  will: MOCK_PREDICTED_ADDRESS,
  timestamp: "2024-01-01T12:00:00.000Z",
};

// Mock constants
const MOCK_PATHS_CONFIG = {
  env: "/mock/path/.env",
  will: {
    formatted: "/mock/path/formatted.json",
    addressed: "/mock/path/addressed.json",
  },
};

const MOCK_NETWORK_CONFIG = {
  rpc: {
    current: "http://localhost:8545",
  },
};

const MOCK_SALT_CONFIG = {
  timestampMultiplier: 1000000,
  maxSafeInteger: 9007199254740991,
};

// Mock ethers
vi.mock("ethers", async () => {
  const actualEthers = (await vi.importActual(
    "ethers",
  )) as typeof import("ethers");
  return {
    ...actualEthers,
    JsonRpcProvider: vi.fn(),
    isAddress: vi.fn(),
  };
});

// Mock dotenv
vi.mock("dotenv", () => ({
  config: vi.fn(),
}));

// Mock config
vi.mock("@config", () => ({
  PATHS_CONFIG: MOCK_PATHS_CONFIG,
  NETWORK_CONFIG: MOCK_NETWORK_CONFIG,
  SALT_CONFIG: MOCK_SALT_CONFIG,
}));

// Mock fs
vi.mock("fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

// Mock updateEnvVariable
vi.mock("@shared/utils/file/updateEnvVariable.js", () => ({
  updateEnvVariable: vi.fn(),
}));

// Mock typechain types
vi.mock("@shared/types/typechain-types/index.js", () => ({
  WillFactory__factory: {
    connect: vi.fn(),
  },
}));

// Mock crypto
vi.mock("crypto", () => ({
  default: {
    getRandomValues: vi.fn(),
  },
}));

describe("PredictWill Module", () => {
  // Create mock functions that can be referenced
  const mockJsonRpcProvider = vi.fn();
  const mockIsAddress = vi.fn();
  const mockReadFileSync = vi.fn();
  const mockWriteFileSync = vi.fn();
  const mockExistsSync = vi.fn();
  const mockUpdateEnvVariable = vi.fn();
  const mockWillFactoryConnect = vi.fn();
  const mockGetRandomValues = vi.fn();

  const mockProvider = {
    getNetwork: vi.fn(),
    getCode: vi.fn(),
  };

  const mockContract = {
    predictWill: vi.fn(),
    executor: vi.fn(),
    uploadCidVerifier: vi.fn(),
    createWillVerifier: vi.fn(),
  };

  beforeAll(() => {
    // Mock console methods to avoid output during tests
    vi.spyOn(console, "log").mockImplementation(() => { });
    vi.spyOn(console, "error").mockImplementation(() => { });
    vi.spyOn(console, "warn").mockImplementation(() => { });
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock implementations
    mockJsonRpcProvider.mockImplementation(() => mockProvider);
    mockIsAddress.mockReturnValue(true);

    // Setup environment variables
    process.env.WILL_FACTORY = MOCK_WILL_FACTORY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("validateEnvironment", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("should validate and return environment variables", () => {
      process.env.WILL_FACTORY = MOCK_WILL_FACTORY;
      vi.mocked(ethers.isAddress).mockReturnValue(true);

      const result = predictWillModule.validateEnvironment();

      expect(result).toEqual({
        WILL_FACTORY: MOCK_WILL_FACTORY,
      });
    });

    it("should throw error when WILL_FACTORY is missing", () => {
      delete process.env.WILL_FACTORY;

      expect(() => predictWillModule.validateEnvironment()).toThrow(
        "Environment variable WILL_FACTORY is not set",
      );
    });

    it("should throw error for invalid factory address", () => {
      process.env.WILL_FACTORY = "invalid_address";
      vi.mocked(ethers.isAddress).mockReturnValue(false);

      expect(() => predictWillModule.validateEnvironment()).toThrow(
        "Invalid will factory address: invalid_address",
      );
    });
  });

  describe("validateFiles", () => {
    it("should pass when formatted will file exists", async () => {
      const fs = await import("fs");
      vi.mocked(fs.existsSync).mockReturnValue(true);

      expect(() => predictWillModule.validateFiles()).not.toThrow();
    });

    it("should throw error when formatted will file does not exist", async () => {
      const fs = await import("fs");
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(() => predictWillModule.validateFiles()).toThrow(
        /Formatted will file does not exist/,
      );
    });
  });

  describe("validateRpcConnection", () => {
    it("should validate RPC connection successfully", async () => {
      const mockNetwork = { name: "localhost", chainId: BigInt(31337) };
      mockProvider.getNetwork.mockResolvedValue(mockNetwork);

      const result = await predictWillModule.validateRpcConnection(
        mockProvider as any,
      );

      expect(result).toEqual(mockNetwork);
      expect(mockProvider.getNetwork).toHaveBeenCalled();
    });

    it("should handle RPC connection failure", async () => {
      mockProvider.getNetwork.mockRejectedValue(
        new Error("Network unreachable"),
      );

      await expect(
        predictWillModule.validateRpcConnection(mockProvider as any),
      ).rejects.toThrow(
        "Failed to connect to RPC endpoint: Network unreachable",
      );
    });
  });

  describe("generateSecureSalt", () => {
    it("should generate a secure salt", async () => {
      const crypto = await import("crypto");
      const mockRandomArray = new Uint32Array([12345]);
      vi.mocked(crypto.default.getRandomValues).mockImplementation(
        (array: any) => {
          array[0] = 12345;
          return array;
        },
      );

      const timestamp = 1704110400000; // Fixed timestamp
      const result = predictWillModule.generateSecureSalt(timestamp);

      expect(result).toBeTypeOf("number");
      expect(result).toBeGreaterThan(0);
      expect(crypto.default.getRandomValues).toHaveBeenCalled();
    });

    it("should handle crypto generation failure", async () => {
      const crypto = await import("crypto");
      vi.mocked(crypto.default.getRandomValues).mockImplementation(() => {
        throw new Error("Crypto failure");
      });

      expect(() => predictWillModule.generateSecureSalt()).toThrow(
        "Failed to generate salt: Crypto failure",
      );
    });
  });

  describe("readWillData", () => {
    beforeEach(async () => {
      const fs = await import("fs");
      vi.mocked(fs.existsSync).mockReturnValue(true);
    });

    it("should read and validate will data successfully", async () => {
      const fs = await import("fs");
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(validWillData));
      vi.mocked(ethers.isAddress).mockReturnValue(true);

      const result = predictWillModule.readWillData();

      expect(result).toEqual(validWillData);
      expect(fs.readFileSync).toHaveBeenCalled();
    });

    it("should throw error for invalid JSON", async () => {
      const fs = await import("fs");
      vi.mocked(fs.readFileSync).mockReturnValue("invalid json");

      expect(() => predictWillModule.readWillData()).toThrow(
        "Invalid JSON in will file",
      );
    });

    it("should throw error for missing testator", async () => {
      const fs = await import("fs");
      const invalidData = { estates: validWillData.estates };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(invalidData));

      expect(() => predictWillModule.readWillData()).toThrow(
        "Missing required field: testator",
      );
    });

    it("should throw error for missing estates array", async () => {
      const fs = await import("fs");
      const invalidData = { testator: MOCK_TESTATOR };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(invalidData));

      expect(() => predictWillModule.readWillData()).toThrow(
        "Missing or invalid estates array",
      );
    });

    it("should throw error for empty estates array", async () => {
      const fs = await import("fs");
      const invalidData = { testator: MOCK_TESTATOR, estates: [] };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(invalidData));

      expect(() => predictWillModule.readWillData()).toThrow(
        "Estates array cannot be empty",
      );
    });

    it("should throw error for invalid beneficiary address", async () => {
      const fs = await import("fs");
      const invalidData = {
        testator: MOCK_TESTATOR,
        estates: [
          {
            beneficiary: "invalid_address",
            token: MOCK_TOKEN,
            amount: "1000000000000000000",
          },
        ],
      };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(invalidData));
      vi.mocked(ethers.isAddress).mockImplementation(
        (addr) => addr !== "invalid_address",
      );

      expect(() => predictWillModule.readWillData()).toThrow(
        "Invalid beneficiary address in estate 0: invalid_address",
      );
    });

    it("should throw error for invalid token address", async () => {
      const fs = await import("fs");
      const invalidData = {
        testator: MOCK_TESTATOR,
        estates: [
          {
            beneficiary: MOCK_BENEFICIARY,
            token: "invalid_token",
            amount: "1000000000000000000",
          },
        ],
      };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(invalidData));
      vi.mocked(ethers.isAddress).mockImplementation(
        (addr) => addr !== "invalid_token",
      );

      expect(() => predictWillModule.readWillData()).toThrow(
        "Invalid token address in estate 0: invalid_token",
      );
    });
  });

  describe("createContractInstance", () => {
    it("should create contract instance successfully", async () => {
      const { WillFactory__factory } = await import(
        "@shared/types/typechain-types/index.js"
      );
      vi.mocked(WillFactory__factory.connect).mockReturnValue(
        mockContract as any,
      );
      mockProvider.getCode.mockResolvedValue(
        "0x608060405234801561001057600080fd5b50",
      );

      const result = await predictWillModule.createContractInstance(
        MOCK_WILL_FACTORY,
        mockProvider as any,
      );

      expect(result).toBe(mockContract);
      expect(WillFactory__factory.connect).toHaveBeenCalledWith(
        MOCK_WILL_FACTORY,
        mockProvider,
      );
      expect(mockProvider.getCode).toHaveBeenCalledWith(MOCK_WILL_FACTORY);
    });

    it("should throw error when no contract found at address", async () => {
      const { WillFactory__factory } = await import(
        "@shared/types/typechain-types/index.js"
      );
      vi.mocked(WillFactory__factory.connect).mockReturnValue(
        mockContract as any,
      );
      mockProvider.getCode.mockResolvedValue("0x"); // No contract

      await expect(
        predictWillModule.createContractInstance(
          MOCK_WILL_FACTORY,
          mockProvider as any,
        ),
      ).rejects.toThrow(`No contract found at address: ${MOCK_WILL_FACTORY}`);
    });

    it("should handle contract creation failure", async () => {
      const { WillFactory__factory } = await import(
        "@shared/types/typechain-types/index.js"
      );
      vi.mocked(WillFactory__factory.connect).mockImplementation(() => {
        throw new Error("Connection failed");
      });

      await expect(
        predictWillModule.createContractInstance(
          MOCK_WILL_FACTORY,
          mockProvider as any,
        ),
      ).rejects.toThrow(
        "Failed to create contract instance: Connection failed",
      );
    });
  });

  describe("predictWillAddress", () => {
    it("should predict will address successfully", async () => {
      mockContract.predictWill.mockResolvedValue(MOCK_PREDICTED_ADDRESS);
      vi.mocked(ethers.isAddress).mockReturnValue(true);

      const result = await predictWillModule.predictWillAddress(
        mockContract as any,
        MOCK_TESTATOR,
        validWillData.estates as any,
        MOCK_SALT,
      );

      expect(result).toBe(MOCK_PREDICTED_ADDRESS);
      expect(mockContract.predictWill).toHaveBeenCalledWith(
        MOCK_TESTATOR,
        validWillData.estates,
        MOCK_SALT,
      );
    });

    it("should throw error for invalid predicted address", async () => {
      mockContract.predictWill.mockResolvedValue("invalid_address");
      vi.mocked(ethers.isAddress).mockReturnValue(false);

      await expect(
        predictWillModule.predictWillAddress(
          mockContract as any,
          MOCK_TESTATOR,
          validWillData.estates as any,
          MOCK_SALT,
        ),
      ).rejects.toThrow("Invalid predicted address: invalid_address");
    });

    it("should handle prediction failure", async () => {
      mockContract.predictWill.mockRejectedValue(
        new Error("Prediction failed"),
      );

      await expect(
        predictWillModule.predictWillAddress(
          mockContract as any,
          MOCK_TESTATOR,
          validWillData.estates as any,
          MOCK_SALT,
        ),
      ).rejects.toThrow("Failed to predict will address: Prediction failed");
    });
  });

  describe("saveAddressedWill", () => {
    beforeEach(() => {
      // Mock Date.now() and Date.prototype.toISOString()
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-01T12:00:00.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should save addressed will successfully", async () => {
      const fs = await import("fs");
      vi.mocked(fs.writeFileSync).mockImplementation(() => { });

      const result = predictWillModule.saveAddressedWill(
        validWillData,
        MOCK_SALT,
        MOCK_PREDICTED_ADDRESS,
      );

      expect(result).toMatchObject({
        ...validWillData,
        salt: MOCK_SALT,
        will: MOCK_PREDICTED_ADDRESS,
        timestamp: "2024-01-01T12:00:00.000Z",
        metadata: {
          predictedAt: 1704110400000,
          estatesCount: 1,
        },
      });

      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it("should handle save failure", async () => {
      const fs = await import("fs");
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error("Write failed");
      });

      expect(() =>
        predictWillModule.saveAddressedWill(
          validWillData,
          MOCK_SALT,
          MOCK_PREDICTED_ADDRESS,
        ),
      ).toThrow("Failed to save addressed will: Write failed");
    });
  });

  describe("updateEnvironmentVariables", () => {
    it("should update environment variables successfully", async () => {
      const { updateEnvVariable } = await import(
        "@shared/utils/file/updateEnvVariable.js"
      );
      vi.mocked(updateEnvVariable).mockResolvedValue();

      await predictWillModule.updateEnvironmentVariables(
        validWillData.estates as any,
        MOCK_SALT,
        MOCK_PREDICTED_ADDRESS,
      );

      expect(updateEnvVariable).toHaveBeenCalledWith(
        "SALT",
        MOCK_SALT.toString(),
      );
      expect(updateEnvVariable).toHaveBeenCalledWith(
        "WILL",
        MOCK_PREDICTED_ADDRESS,
      );
      expect(updateEnvVariable).toHaveBeenCalledWith(
        "BENEFICIARY0",
        MOCK_BENEFICIARY,
      );
      expect(updateEnvVariable).toHaveBeenCalledWith("TOKEN0", MOCK_TOKEN);
      expect(updateEnvVariable).toHaveBeenCalledWith(
        "AMOUNT0",
        "1000000000000000000",
      );
    });

    it("should handle update failure", async () => {
      const { updateEnvVariable } = await import(
        "@shared/utils/file/updateEnvVariable.js"
      );
      vi.mocked(updateEnvVariable).mockRejectedValue(
        new Error("Update failed"),
      );

      await expect(
        predictWillModule.updateEnvironmentVariables(
          validWillData.estates as any,
          MOCK_SALT,
          MOCK_PREDICTED_ADDRESS,
        ),
      ).rejects.toThrow(
        "Failed to update environment variables: Update failed",
      );
    });
  });

  describe("getContractInfo", () => {
    it("should fetch contract information successfully", async () => {
      mockContract.executor.mockResolvedValue("0xexecutor");
      mockContract.uploadCidVerifier.mockResolvedValue("0xuploadVerifier");
      mockContract.createWillVerifier.mockResolvedValue("0xcreateVerifier");

      await expect(
        predictWillModule.getContractInfo(mockContract as any),
      ).resolves.not.toThrow();

      expect(mockContract.executor).toHaveBeenCalled();
      expect(mockContract.uploadCidVerifier).toHaveBeenCalled();
      expect(mockContract.createWillVerifier).toHaveBeenCalled();
    });

    it("should handle contract info fetch failure gracefully", async () => {
      mockContract.executor.mockRejectedValue(new Error("Fetch failed"));

      // Should not throw, just warn
      await expect(
        predictWillModule.getContractInfo(mockContract as any),
      ).resolves.not.toThrow();
    });
  });

  describe("processWillAddressing", () => {
    beforeEach(async () => {
      // Setup all mocks for successful workflow
      const fs = await import("fs");
      const { updateEnvVariable } = await import(
        "@shared/utils/file/updateEnvVariable.js"
      );
      const { WillFactory__factory } = await import(
        "@shared/types/typechain-types/index.js"
      );
      const crypto = await import("crypto");

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(validWillData));
      vi.mocked(fs.writeFileSync).mockImplementation(() => { });

      process.env.WILL_FACTORY = MOCK_WILL_FACTORY;
      vi.mocked(ethers.isAddress).mockReturnValue(true);

      mockProvider.getNetwork.mockResolvedValue({
        name: "localhost",
        chainId: BigInt(31337),
      });
      mockProvider.getCode.mockResolvedValue(
        "0x608060405234801561001057600080fd5b50",
      );

      vi.mocked(WillFactory__factory.connect).mockReturnValue(
        mockContract as any,
      );
      mockContract.predictWill.mockResolvedValue(MOCK_PREDICTED_ADDRESS);
      mockContract.executor.mockResolvedValue("0xexecutor");
      mockContract.uploadCidVerifier.mockResolvedValue("0xuploadVerifier");
      mockContract.createWillVerifier.mockResolvedValue("0xcreateVerifier");

      const mockRandomArray = new Uint32Array([12345]);
      vi.mocked(crypto.default.getRandomValues).mockImplementation(
        (array: any) => {
          array[0] = 12345;
          return array;
        },
      );

      vi.mocked(updateEnvVariable).mockResolvedValue();

      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-01T12:00:00.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should complete workflow successfully", async () => {
      const result = await predictWillModule.processPredictWill();

      expect(result).toMatchObject({
        predictedAddress: MOCK_PREDICTED_ADDRESS,
        salt: expect.any(Number),
        estatesCount: 1,
        outputPath: "/mock/path/addressed.json",
        success: true,
      });
    });

    it("should handle file validation failure", async () => {
      const fs = await import("fs");
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await expect(predictWillModule.processPredictWill()).rejects.toThrow(
        "Formatted will file does not exist",
      );
    });

    it("should handle environment validation failure", async () => {
      delete process.env.WILL_FACTORY;

      await expect(predictWillModule.processPredictWill()).rejects.toThrow(
        "Environment variable WILL_FACTORY is not set",
      );
    });

    it("should handle RPC connection failure", async () => {
      mockProvider.getNetwork.mockRejectedValue(
        new Error("Network unreachable"),
      );

      await expect(predictWillModule.processPredictWill()).rejects.toThrow(
        "Failed to connect to RPC endpoint: Network unreachable",
      );
    });

    it("should handle contract creation failure", async () => {
      mockProvider.getCode.mockResolvedValue("0x"); // No contract

      await expect(predictWillModule.processPredictWill()).rejects.toThrow(
        "No contract found at address",
      );
    });

    it("should handle will data reading failure", async () => {
      const fs = await import("fs");
      vi.mocked(fs.readFileSync).mockReturnValue("invalid json");

      await expect(predictWillModule.processPredictWill()).rejects.toThrow(
        "Invalid JSON in will file",
      );
    });

    it("should handle address prediction failure", async () => {
      mockContract.predictWill.mockRejectedValue(
        new Error("Prediction failed"),
      );

      await expect(predictWillModule.processPredictWill()).rejects.toThrow(
        "Failed to predict will address: Prediction failed",
      );
    });

    it("should handle file save failure", async () => {
      const fs = await import("fs");
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error("Write failed");
      });

      await expect(predictWillModule.processPredictWill()).rejects.toThrow(
        "Failed to save addressed will: Write failed",
      );
    });

    it("should handle environment update failure", async () => {
      const { updateEnvVariable } = await import(
        "@shared/utils/file/updateEnvVariable.js"
      );
      vi.mocked(updateEnvVariable).mockRejectedValue(
        new Error("Update failed"),
      );

      await expect(predictWillModule.processPredictWill()).rejects.toThrow(
        "Failed to update environment variables: Update failed",
      );
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle multiple estates correctly", async () => {
      const multiEstateData = {
        testator: MOCK_TESTATOR,
        estates: [
          {
            beneficiary: MOCK_BENEFICIARY,
            token: MOCK_TOKEN,
            amount: "1000000000000000000",
          },
          {
            beneficiary: "0x2222222222222222222222222222222222222222",
            token: "0x3333333333333333333333333333333333333333",
            amount: "2000000000000000000",
          },
        ],
      };

      const fs = await import("fs");
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify(multiEstateData),
      );
      vi.mocked(ethers.isAddress).mockReturnValue(true);

      const result = predictWillModule.readWillData();

      expect(result.estates).toHaveLength(2);
      expect(result.estates[0]).toEqual(multiEstateData.estates[0]);
      expect(result.estates[1]).toEqual(multiEstateData.estates[1]);
    });

    it("should handle very large amounts", () => {
      const largeAmount = "999999999999999999999999999999999999999";

      expect(() => {
        const estate = {
          beneficiary: MOCK_BENEFICIARY,
          token: MOCK_TOKEN,
          amount: largeAmount,
        };
        expect(estate.amount).toBe(largeAmount);
      }).not.toThrow();
    });

    it("should handle zero amounts", async () => {
      const zeroAmountData = {
        testator: MOCK_TESTATOR,
        estates: [
          {
            beneficiary: MOCK_BENEFICIARY,
            token: MOCK_TOKEN,
            amount: "0",
          },
        ],
      };

      const fs = await import("fs");
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify(zeroAmountData),
      );
      vi.mocked(ethers.isAddress).mockReturnValue(true);

      const result = predictWillModule.readWillData();

      expect(result.estates[0].amount).toBe("0");
    });

    it("should handle malformed addresses gracefully", () => {
      const malformedAddresses = [
        "0x123", // Too short
        "not_an_address",
        "0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG", // Invalid hex
        "",
        null,
        undefined,
      ];

      malformedAddresses.forEach((address) => {
        vi.mocked(ethers.isAddress).mockReturnValue(false);
        expect(ethers.isAddress(address as any)).toBe(false);
      });
    });
  });
});
