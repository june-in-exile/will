import { UTF8, ASCII, BASE64, HEX } from "@shared/constants/encoding.js";
import {
  AES_256_CTR,
  AES_256_GCM,
  CHACHA20_POLY1305,
} from "@shared/constants/cryptography.js";
import type { SupportedAlgorithm } from "@shared/types/crypto.js";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { config } from "dotenv";
import type { Encoding } from "crypto";

const modulePath = dirname(fileURLToPath(import.meta.url));

// Load environment variables
config({ path: resolve(modulePath, "../.env") });

/**
 * Unified Configuration for Will Application
 * Centralizes all configuration constants and settings
 */

// ================================
// TYPE DEFINITIONS
// ================================

interface EnvironmentSettings {
  enableStackTrace: boolean;
  verboseLogging: boolean;
  enableRetries: boolean;
}

interface AppConfig {
  name: string;
  version: string;
  environment: string;
  useAnvil: boolean;
  development: EnvironmentSettings;
  production: EnvironmentSettings;
}

interface NetworkRpcConfig {
  current: string | undefined;
  anvil: string | undefined;
  arbitrumSepolia: string | undefined;
  useAnvil: boolean;
}

interface AnvilNetworkConfig {
  chainId: number;
  gasPrice: string;
  blockTime: number;
}

interface ArbitrumSepoliaNetworkConfig {
  chainId: number;
  gasPrice: string;
  blockTime: number;
}

interface NetworkConfig {
  rpc: NetworkRpcConfig;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  gasLimitMultiplier: number;
  confirmationBlocks: number;
  network: string;
  expectedChainIds: number[];
  maxGasPrice: string;
  anvil: AnvilNetworkConfig;
  arbitrumSepolia: ArbitrumSepoliaNetworkConfig;
}

interface CryptoConfig {
  supportedAlgorithms: string[];
  algorithm: SupportedAlgorithm;
  keySize: number;
  ivSize: number;
  maxPlaintextSize: number;
  maxCiphertextSize: number;
  plaintextEncoding: Encoding;
  ciphertextEncoding: Encoding;
  paths: {
    keyFile: string;
  };
  weakKeyDetection: boolean;
  validateEncodings: boolean;
}

interface SignatureConfig {
  signatureLength: number;
}

interface HashConfig {
  maxInputSize: number;
  supportedEncodings: string[];
}

interface ApprovalConfig {
  maxRetries: number;
  retryDelay: number;
}

interface IpfsPinningConfig {
  pinataJWT: string | undefined;
  retryAttempts: number;
  timeout: number;
  retryDelay: number;
}

interface IpfsConfig {
  pinning: IpfsPinningConfig;
  gateways: string[];
}

interface BasePathsConfig {
  root: string;
  backend: string;
  frontend: string;
  zkp: string;
  contracts: string;
}

interface WillPathsConfig {
  raw: string;
  formatted: string;
  addressed: string;
  signed: string;
  serialized: string;
  encrypted: string;
  downloaded: string;
  decrypted: string;
  deserialized: string;
}

interface ZkpCircuitsFilesConfig {
  wasm: string;
  witness: string;
  input: string;
  zkey: string;
  proof: string;
  public: string;
  verifier: string;
}

interface ZkpPathsConfig {
  multiplier2: ZkpCircuitsFilesConfig;
  cidUpload: ZkpCircuitsFilesConfig;
  willCreation: ZkpCircuitsFilesConfig;
}

interface ContractPathsConfig {
  broadcastDir: string;
  outDir: string;
  multiplier2Verifier: string;
  cidUploadVerifier: string;
  willCreationVerifier: string;
  jsonCidVerifier: string;
  will: string;
  willFactory: string;
}

interface CryptoPathsConfig {
  keyDir: string;
  keyFile: string;
}

interface PathsConfig {
  base: BasePathsConfig;
  will: WillPathsConfig;
  zkp: ZkpPathsConfig;
  env: string;
  contracts: ContractPathsConfig;
  crypto: CryptoPathsConfig;
}

interface SaltConfig {
  defaultSaltBytes: number;
}

interface ErrorCategoriesConfig {
  VALIDATION_ERROR: string;
  NETWORK_ERROR: string;
  CRYPTO_ERROR: string;
  FILE_ERROR: string;
  CONTRACT_ERROR: string;
}

interface ErrorConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  categories: ErrorCategoriesConfig;
  logLevel: string;
  enableStackTrace: boolean;
}

interface Permit2Config {
  defaultDuration: number;
  maxNonceBytes: number;
}

interface SerializationConfig {
  maxAmountBytes: number;
}

interface LoggingColorsConfig {
  success: string;
  error: string;
  warning: string;
  info: string;
  debug: string;
  highlight: string;
  accent: string;
}

interface LoggingLevelsConfig {
  ERROR: number;
  WARN: number;
  INFO: number;
  DEBUG: number;
}

interface LoggingConfig {
  colors: LoggingColorsConfig;
  levels: LoggingLevelsConfig;
  truncateSignatures: boolean;
  signatureDisplayLength: number;
  timestampFormat: string;
  verboseMode: boolean;
}

interface EnvValidationConfig {
  [key: string]: RegExp;
}

interface EnvCurrentConfig {
  USE_ANVIL: boolean;
  NODE_ENV: string;
  ANVIL_RPC_URL: string | undefined;
  ARB_SEPOLIA_RPC_URL: string | undefined;
}

interface EnvConfig {
  required: string[];
  networkRequired: string[];
  optional: string[];
  validation: EnvValidationConfig;
  current: EnvCurrentConfig;
}

interface RetryConfig {
  attempts: number;
  delay: number;
}

interface EnvironmentInfo {
  NODE_ENV: string;
  USE_ANVIL: boolean;
  network: string;
  chainId: number[];
  rpcUrl: string | undefined;
  configLoaded: boolean;
}

interface ConfigUtilsInterface {
  getModuleConfig(moduleName: string): any;
  validateEnvironment(): boolean;
  getNetworkConfig(): AnvilNetworkConfig | ArbitrumSepoliaNetworkConfig;
  isUsingAnvil(): boolean;
  getMergedConfig(): any;
  isDevelopment(): boolean;
  isProduction(): boolean;
  getTimeout(operation: string): number;
  getRetryConfig(operation: string): RetryConfig;
  getEnvironmentInfo(): EnvironmentInfo;
}

// ================================
// ENVIRONMENT DETECTION
// ================================
const USE_ANVIL: boolean = process.env.USE_ANVIL === "true";
const NODE_ENV: string = process.env.NODE_ENV || "development";

// ================================
// GENERAL APPLICATION CONFIG
// ================================
export const APP_CONFIG: AppConfig = {
  name: "Will Application",
  version: "1.0.0",
  environment: NODE_ENV,
  useAnvil: USE_ANVIL,

  // Development settings
  development: {
    enableStackTrace: true,
    verboseLogging: true,
    enableRetries: true,
  },

  // Production settings
  production: {
    enableStackTrace: false,
    verboseLogging: false,
    enableRetries: true,
  },
};

// ================================
// NETWORK & RPC CONFIG
// ================================
export const NETWORK_CONFIG: NetworkConfig = {
  // RPC configuration
  rpc: {
    current: USE_ANVIL
      ? process.env.ANVIL_RPC_URL
      : process.env.ARB_SEPOLIA_RPC_URL,
    anvil: process.env.ANVIL_RPC_URL,
    arbitrumSepolia: process.env.ARB_SEPOLIA_RPC_URL,
    useAnvil: USE_ANVIL,
  },

  // Connection settings
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 2000, // 2 seconds

  // Gas settings
  gasLimitMultiplier: 1.2,
  confirmationBlocks: USE_ANVIL ? 1 : 2, // Faster confirmation for local network

  // Network validation
  network: USE_ANVIL ? "Anvil Local" : "Arbitrum Sepolia",
  expectedChainIds: USE_ANVIL ? [31337] : [421614], // Anvil local or Arbitrum Sepolia
  maxGasPrice: USE_ANVIL ? "1000000000" : "100000000000", // 1 gwei for local, 100 gwei for testnet

  // Network-specific settings
  anvil: {
    chainId: 31337,
    gasPrice: "1000000000", // 1 gwei
    blockTime: 1, // 1 second block time
  },

  arbitrumSepolia: {
    chainId: 421614,
    gasPrice: "100000000000", // 100 gwei
    blockTime: 0.25, // ~0.25 second block time
  },
};

// ================================
// ENCRYPTION & CRYPTO CONFIG
// ================================
export const CRYPTO_CONFIG: CryptoConfig = {
  // Supported algorithms
  supportedAlgorithms: [AES_256_CTR, AES_256_GCM, CHACHA20_POLY1305],

  // Current algorithm
  algorithm: AES_256_CTR,

  // Key and IV sizes
  keySize: 32, // 256 bits
  ivSize: 16, // 128 bits

  // Security limits
  maxPlaintextSize: 10 * 1024 * 1024, // 10MB
  maxCiphertextSize: 10 * 1024 * 1024, // 10MB

  // Encodings
  plaintextEncoding: "hex",
  ciphertextEncoding: "base64",

  // File paths (relative to utils/cryptography/)
  paths: {
    keyFile: "./key.txt",
  },

  // Validation settings
  weakKeyDetection: true,
  validateEncodings: true,
};

// ================================
// SIGNATURE CONFIG
// ================================
export const SIGNATURE_CONFIG: SignatureConfig = {
  // Signature formats
  signatureLength: 130, // 65 bytes
};

// ================================
// HASH CONFIG
// ================================
export const HASH_CONFIG: HashConfig = {
  // Input validation
  maxInputSize: 10 * 1024 * 1024, // 10MB max input size
  supportedEncodings: [UTF8, ASCII, BASE64, HEX],
};

// ================================
// TOKEN APPROVAL CONFIG
// ================================
export const APPROVAL_CONFIG: ApprovalConfig = {
  // Retry settings
  maxRetries: 3,
  retryDelay: 2000, // 2 seconds
};

// ================================
// IPFS CONFIG
// ================================
export const IPFS_CONFIG: IpfsConfig = {
  // Pinning settings
  pinning: {
    pinataJWT: process.env.PINATA_JWT,
    retryAttempts: 3,
    timeout: 30000,
    retryDelay: 2000,
  },

  // Gateway URLs
  gateways: [
    "https://gateway.pinata.cloud/ipfs/",
    "http://localhost:8080/ipfs/",
    "https://ipfs.io/ipfs/",
    "https://gateway.ipfs.io/ipfs/",
    "https://cloudflare-ipfs.com/ipfs/",
  ],
};

// ================================
// FILE PATHS CONFIG
// ================================
// Base paths (defined first so they can be reused)
const BASE_PATHS = {
  root: resolve(modulePath, ".."),
  backend: resolve(modulePath, "../apps/backend"),
  frontend: resolve(modulePath, "../apps/frontend"),
  zkp: resolve(modulePath, "../zkp"),
  contracts: resolve(modulePath, "../contracts"),
};

export const PATHS_CONFIG: PathsConfig = {
  // Base paths
  base: BASE_PATHS,

  // Will files
  will: (() => {
    const willDir = resolve(BASE_PATHS.backend, "will");
    const setWillPath = (step: number, name: string) =>
      resolve(willDir, `${step}_${name}.json`);

    return {
      raw: setWillPath(1, "raw"),
      formatted: setWillPath(2, "formatted"),
      addressed: setWillPath(3, "addressed"),
      signed: setWillPath(4, "signed"),
      serialized: setWillPath(5, "serialized"),
      encrypted: setWillPath(6, "encrypted"),
      downloaded: setWillPath(7, "downloaded"),
      decrypted: setWillPath(8, "decrypted"),
      deserialized: setWillPath(9, "deserialized"),
    };
  })(),

  // ZKP files
  zkp: (() => {
    const createZkpConfig = (circuitName: string): ZkpCircuitsFilesConfig => {
      const circuitsDir = resolve(BASE_PATHS.zkp, `circuits/${circuitName}`);
      const dirs = {
        build: resolve(circuitsDir, "build"),
        keys: resolve(circuitsDir, "keys"),
        proofs: resolve(circuitsDir, "proofs"),
        contracts: resolve(circuitsDir, "contracts"),
        inputs: resolve(circuitsDir, "inputs"),
      };

      return {
        wasm: resolve(dirs.build, `${circuitName}_js/${circuitName}.wasm`),
        witness: resolve(dirs.build, `witness.wtns`),
        input: resolve(dirs.inputs, `input.json`),
        zkey: resolve(dirs.keys, `${circuitName}_0001.zkey`),
        proof: resolve(dirs.proofs, `proof.json`),
        public: resolve(dirs.proofs, `public.json`),
        verifier: resolve(dirs.contracts, `verifier.sol`),
      };
    };

    return {
      multiplier2: createZkpConfig("multiplier2"),
      cidUpload: createZkpConfig("cidUpload"),
      willCreation: createZkpConfig("willCreation"),
    };
  })(),

  // Environment files
  env: resolve(modulePath, "../.env"),

  // Contract artifacts
  contracts: {
    broadcastDir: resolve(BASE_PATHS.contracts, "broadcast"),
    outDir: resolve(BASE_PATHS.contracts, "out"),
    multiplier2Verifier: resolve(BASE_PATHS.contracts, "src/Multiplier2Verifier.sol"),
    cidUploadVerifier: resolve(BASE_PATHS.contracts, "src/CidUploadVerifier.sol"),
    willCreationVerifier: resolve(BASE_PATHS.contracts, "src/WillCreationVerifier.sol"),
    jsonCidVerifier: resolve(BASE_PATHS.contracts, "src/JsonCidVerifier.sol"),
    will: resolve(BASE_PATHS.contracts, "src/Will.sol"),
    willFactory: resolve(BASE_PATHS.contracts, "src/WillFactory.sol"),
  },

  // Crypto keys
  crypto: {
    keyDir: resolve(modulePath, "utils/cryptography"),
    keyFile: resolve(modulePath, "utils/cryptography/key.txt"),
  },
};

// ================================
// SALT GENERATION CONFIG
// ================================
export const SALT_CONFIG: SaltConfig = {
  defaultSaltBytes: 32,
};

// ================================
// ERROR HANDLING CONFIG
// ================================
export const ERROR_CONFIG: ErrorConfig = {
  // Retry settings
  maxRetries: 3,
  baseDelay: USE_ANVIL ? 500 : 1000, // Faster for local network
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,

  // Error categories
  categories: {
    VALIDATION_ERROR: "ValidationError",
    NETWORK_ERROR: "NetworkError",
    CRYPTO_ERROR: "CryptoError",
    FILE_ERROR: "FileError",
    CONTRACT_ERROR: "ContractError",
  },

  // Logging settings
  logLevel: process.env.LOG_LEVEL || (USE_ANVIL ? "debug" : "info"),
  enableStackTrace: NODE_ENV === "development",
};

// ================================
// PERMIT2 CONFIG
// ================================
export const PERMIT2_CONFIG: Permit2Config = {
  // Default duration
  defaultDuration: 365 * 24 * 60 * 60 * 1000, // 1 year in milliseconds

  // Nonce generation
  maxNonceBytes: 16,
};

// ================================
// SERIALIZATION CONFIG
// ================================
export const SERIALIZATION_CONFIG: SerializationConfig = {
  // amount serialization
  maxAmountBytes: 16, // max amount = 2**128
};

// ================================
// LOGGING CONFIG
// ================================
export const LOGGING_CONFIG: LoggingConfig = {
  // Console colors (chalk)
  colors: {
    success: "green",
    error: "red",
    warning: "yellow",
    info: "blue",
    debug: "gray",
    highlight: "white",
    accent: "cyan",
  },

  // Log levels
  levels: {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
  },

  // Output settings
  truncateSignatures: true,
  signatureDisplayLength: 18, // Show first 10 + last 8 characters

  // Timestamp format
  timestampFormat: "YYYY-MM-DD HH:mm:ss",

  // Environment-specific settings
  verboseMode: USE_ANVIL || NODE_ENV === "development",
};

// ================================
// ENVIRONMENT VARIABLES CONFIG
// ================================
export const ENV_CONFIG: EnvConfig = {
  // Required environment variables
  required: [
    "PERMIT2",
    "UPLOAD_CID_VERIFIER",
    "CREATE_WILL_VERIFIER",
    "JSON_CID_VERIFIER",
    "WILL_FACTORY",
    "TESTATOR_PRIVATE_KEY",
    "EXECUTOR_PRIVATE_KEY",
    "EXECUTOR",
  ],

  // Network-specific required variables
  networkRequired: USE_ANVIL ? ["ANVIL_RPC_URL"] : ["ARB_SEPOLIA_RPC_URL"],

  // Optional environment variables
  optional: ["NODE_ENV", "LOG_LEVEL"],

  // Validation patterns
  validation: {
    PERMIT2: /^0x[0-9a-fA-F]{40}$/,
    UPLOAD_CID_VERIFIER: /^0x[0-9a-fA-F]{40}$/,
    CREATE_WILL_VERIFIER: /^0x[0-9a-fA-F]{40}$/,
    JSON_CID_VERIFIER: /^0x[0-9a-fA-F]{40}$/,
    WILL_FACTORY: /^0x[0-9a-fA-F]{40}$/,
    TESTATOR_PRIVATE_KEY: /^(0x)?[0-9a-fA-F]{64}$/,
    EXECUTOR_PRIVATE_KEY: /^(0x)?[0-9a-fA-F]{64}$/,
    EXECUTOR: /^0x[0-9a-fA-F]{40}$/,
    CID: /^[a-zA-Z0-9]{46,100}$/,
    ALGORITHM: /^(aes-256-gcm|chacha20-poly1305)$/,
    ANVIL_RPC_URL: /^https?:\/\/.+/,
    ARB_SEPOLIA_RPC_URL: /^https?:\/\/.+/,
  },

  // Current environment values
  current: {
    USE_ANVIL,
    NODE_ENV,
    ANVIL_RPC_URL: process.env.ANVIL_RPC_URL,
    ARB_SEPOLIA_RPC_URL: process.env.ARB_SEPOLIA_RPC_URL,
  },
};

// ================================
// UTILITY FUNCTIONS
// ================================
export const CONFIG_UTILS: ConfigUtilsInterface = {
  /**
   * Get configuration for specific module
   */
  getModuleConfig(moduleName: string): any {
    const configs: { [key: string]: any } = {
      app: APP_CONFIG,
      crypto: CRYPTO_CONFIG,
      signature: SIGNATURE_CONFIG,
      hash: HASH_CONFIG,
      approval: APPROVAL_CONFIG,
      ipfs: IPFS_CONFIG,
      network: NETWORK_CONFIG,
      paths: PATHS_CONFIG,
      salt: SALT_CONFIG,
      error: ERROR_CONFIG,
      permit2: PERMIT2_CONFIG,
      serialization: SERIALIZATION_CONFIG,
      logging: LOGGING_CONFIG,
      env: ENV_CONFIG,
    };

    return configs[moduleName] || null;
  },

  /**
   * Validate environment variables
   */
  validateEnvironment(): boolean {
    const allRequired = [...ENV_CONFIG.required, ...ENV_CONFIG.networkRequired];
    const missing = allRequired.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(", ")}`,
      );
    }

    // Validate format of existing variables
    for (const [key, pattern] of Object.entries(ENV_CONFIG.validation)) {
      const value = process.env[key];
      if (value && !pattern.test(value)) {
        throw new Error(
          `Invalid format for environment variable ${key}: ${value}`,
        );
      }
    }

    return true;
  },

  /**
   * Get network-specific configuration
   */
  getNetworkConfig(): AnvilNetworkConfig | ArbitrumSepoliaNetworkConfig {
    return USE_ANVIL ? NETWORK_CONFIG.anvil : NETWORK_CONFIG.arbitrumSepolia;
  },

  /**
   * Check if using Anvil local network
   */
  isUsingAnvil(): boolean {
    return USE_ANVIL;
  },

  /**
   * Get merged configuration
   */
  getMergedConfig(): any {
    return {
      app: APP_CONFIG,
      network: NETWORK_CONFIG,
      crypto: CRYPTO_CONFIG,
      signature: SIGNATURE_CONFIG,
      hash: HASH_CONFIG,
      approval: APPROVAL_CONFIG,
      ipfs: IPFS_CONFIG,
      paths: PATHS_CONFIG,
      salt: SALT_CONFIG,
      error: ERROR_CONFIG,
      permit2: PERMIT2_CONFIG,
      serialization: SERIALIZATION_CONFIG,
      logging: LOGGING_CONFIG,
      env: ENV_CONFIG,
    };
  },

  /**
   * Check if running in development mode
   */
  isDevelopment(): boolean {
    return NODE_ENV === "development";
  },

  /**
   * Check if running in production mode
   */
  isProduction(): boolean {
    return NODE_ENV === "production";
  },

  /**
   * Get timeout for specific operation
   */
  getTimeout(operation: string): number {
    const timeouts: { [key: string]: number } = {
      network: NETWORK_CONFIG.timeout,
      ipfs: IPFS_CONFIG.pinning.timeout,
    };

    return timeouts[operation] || 30000; // Default 30 seconds
  },

  /**
   * Get retry configuration for specific operation
   */
  getRetryConfig(operation: string): RetryConfig {
    const retryConfigs: { [key: string]: RetryConfig } = {
      network: {
        attempts: NETWORK_CONFIG.retryAttempts,
        delay: NETWORK_CONFIG.retryDelay,
      },
      approval: {
        attempts: APPROVAL_CONFIG.maxRetries,
        delay: APPROVAL_CONFIG.retryDelay,
      },
      ipfs: {
        attempts: IPFS_CONFIG.pinning.retryAttempts,
        delay: IPFS_CONFIG.pinning.retryDelay,
      },
    };

    return (
      retryConfigs[operation] || {
        attempts: ERROR_CONFIG.maxRetries,
        delay: ERROR_CONFIG.baseDelay,
      }
    );
  },

  /**
   * Get environment information for debugging
   */
  getEnvironmentInfo(): EnvironmentInfo {
    return {
      NODE_ENV,
      USE_ANVIL,
      network: NETWORK_CONFIG.network,
      chainId: NETWORK_CONFIG.expectedChainIds,
      rpcUrl: NETWORK_CONFIG.rpc.current,
      configLoaded: true,
    };
  },
};

// ================================
// EXPORT DEFAULT CONFIG
// ================================
export default {
  APP_CONFIG,
  NETWORK_CONFIG,
  CRYPTO_CONFIG,
  SIGNATURE_CONFIG,
  HASH_CONFIG,
  APPROVAL_CONFIG,
  IPFS_CONFIG,
  PATHS_CONFIG,
  SALT_CONFIG,
  ERROR_CONFIG,
  PERMIT2_CONFIG,
  SERIALIZATION_CONFIG,
  LOGGING_CONFIG,
  ENV_CONFIG,
  CONFIG_UTILS,
};
