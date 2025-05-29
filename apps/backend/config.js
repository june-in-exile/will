import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { config } from 'dotenv';

const modulePath = dirname(fileURLToPath(import.meta.url));

// Load environment variables from multiple sources
config({ path: resolve(modulePath, '.env') });
config({
  path: resolve(modulePath, '../foundry/.env'),
  override: false
});

/**
 * Unified Configuration for Testament Application
 * Centralizes all configuration constants and settings
 */

// ================================
// ENVIRONMENT DETECTION
// ================================
const USE_ANVIL = process.env.USE_ANVIL === 'true';
const NODE_ENV = process.env.NODE_ENV || 'development';

// ================================
// GENERAL APPLICATION CONFIG
// ================================
export const APP_CONFIG = {
  name: 'Testament Application',
  version: '1.0.0',
  environment: NODE_ENV,
  useAnvil: USE_ANVIL,

  // Development settings
  development: {
    enableStackTrace: true,
    verboseLogging: true,
    enableRetries: true
  },

  // Production settings
  production: {
    enableStackTrace: false,
    verboseLogging: false,
    enableRetries: true
  }
};

// ================================
// NETWORK & RPC CONFIG
// ================================
export const NETWORK_CONFIG = {
  // RPC configuration
  rpc: {
    current: USE_ANVIL ? process.env.ANVIL_RPC_URL : process.env.ARB_SEPOLIA_RPC_URL,
    anvil: process.env.ANVIL_RPC_URL,
    arbitrumSepolia: process.env.ARB_SEPOLIA_RPC_URL,
    useAnvil: USE_ANVIL
  },

  // Connection settings
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 2000, // 2 seconds

  // Gas settings
  gasLimitMultiplier: 1.2,
  confirmationBlocks: USE_ANVIL ? 1 : 2, // Faster confirmation for local network

  // Network validation
  network: USE_ANVIL ? 'Anvil Local' : 'Arbitrum Sepolia',
  expectedChainIds: USE_ANVIL ? [31337] : [421614], // Anvil local or Arbitrum Sepolia
  maxGasPrice: USE_ANVIL ? '1000000000' : '100000000000', // 1 gwei for local, 100 gwei for testnet

  // Network-specific settings
  anvil: {
    chainId: 31337,
    gasPrice: '1000000000', // 1 gwei
    blockTime: 1 // 1 second block time
  },

  arbitrumSepolia: {
    chainId: 421614,
    gasPrice: '100000000000', // 100 gwei
    blockTime: 0.25 // ~0.25 second block time
  }
};

// ================================
// ENCRYPTION & CRYPTO CONFIG
// ================================
export const CRYPTO_CONFIG = {
  // Supported algorithms
  supportedAlgorithms: ['aes-256-gcm', 'chacha20-poly1305'],

  // Key and IV sizes
  keySize: 32,        // 256 bits
  ivSize: 12,         // 96 bits
  authTagSize: 16,    // 128 bits

  // Security limits
  maxPlaintextSize: 10 * 1024 * 1024, // 10MB
  maxCiphertextSize: 10 * 1024 * 1024, // 10MB

  // Encodings
  inputEncoding: 'utf8',
  outputEncoding: 'utf8',

  // File paths (relative to utils/crypto/)
  paths: {
    keyFile: './key.txt'
  },

  // Validation settings
  weakKeyDetection: true,
  validateEncodings: true
};

// ================================
// SIGNATURE CONFIG
// ================================
export const SIGNATURE_CONFIG = {
  // Message constraints
  maxMessageLength: 1024 * 1024, // 1MB

  // Key and signature formats
  privateKeyLength: 64,   // 32 bytes in hex
  signatureLength: 132,   // 65 bytes in hex with 0x prefix

  // Retry settings
  maxRetries: 3,
  retryDelay: 1000,      // 1 second

  // CID validation
  cid: {
    minLength: 46,
    maxLength: 100,
    validPrefixes: ['Qm', 'b', 'z', 'f', 'u']
  },

  // Address validation
  addressFormat: /^0x[0-9a-fA-F]{40}$/
};

// ================================
// HASH CONFIG
// ================================
export const HASH_CONFIG = {
  // Input validation
  maxInputSize: 10 * 1024 * 1024, // 10MB max input size
  supportedEncodings: ['utf8', 'utf-8', 'ascii', 'base64', 'hex'],

  // Output format validation
  expectedHashLength: 66, // 32 bytes + 0x prefix = 66 characters
  hashPattern: /^0x[0-9a-fA-F]{64}$/,

  // Performance settings
  enableValidation: true,
  enableLogging: process.env.NODE_ENV === 'development'
};


// ================================
// TOKEN APPROVAL CONFIG
// ================================
export const APPROVAL_CONFIG = {
  // Retry settings
  maxRetries: 3,
  retryDelay: 2000,      // 2 seconds

  // Gas settings
  gasLimitMultiplier: 1.2,
  confirmationBlocks: NETWORK_CONFIG.confirmationBlocks,
  defaultGasLimit: 100000n,

  // Processing settings
  batchDelay: USE_ANVIL ? 500 : 1000,      // Faster for local network
  maxConcurrentApprovals: 1,

  // Token validation
  maxTokensPerTransaction: 50,

  // Contract ABIs
  tokenAbi: [
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)'
  ]
};

// ================================
// IPFS CONFIG
// ================================
export const IPFS_CONFIG = {
  // Pinning settings
  pinning: {
    pinataJWT: process.env.PINATA_JWT,
    retryAttempts: 3,
    timeout: 30000,
    retryDelay: 2000
  },

  // Gateway URLs
  gateways: [
    'https://gateway.pinata.cloud/ipfs/',
    'http://localhost:8080/ipfs/',
    'https://ipfs.io/ipfs/',
    'https://gateway.ipfs.io/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/'
  ],

  // File size limits
  maxFileSize: 50 * 1024 * 1024, // 50MB

  // Helia configuration
  helia: {
    cleanupTimeout: 5000  // 5 seconds
  }
};

// ================================
// FILE PATHS CONFIG
// ================================
export const PATHS_CONFIG = {
  // Base paths
  base: {
    module: modulePath,
    root: resolve(modulePath, '..'),
    foundry: resolve(modulePath, '../foundry')
  },

  // Testament files
  testament: {
    raw: resolve(modulePath, 'testament/1_raw.json'),
    formatted: resolve(modulePath, 'testament/2_formatted.json'),
    addressed: resolve(modulePath, 'testament/3_addressed.json'),
    signed: resolve(modulePath, 'testament/4_signed.json'),
    encrypted: resolve(modulePath, 'testament/5_encrypted.json'),
    decrypted: resolve(modulePath, 'testament/6_decrypted.json')
  },

  // Environment files
  env: {
    backend: resolve(modulePath, '.env'),
    foundry: resolve(modulePath, '../foundry/.env')
  },

  // Contract artifacts
  contracts: {
    outDir: resolve(modulePath, '../foundry/out'),
    testamentFactory: resolve(modulePath, '../foundry/out/TestamentFactory.sol/TestamentFactory.json')
  },

  // Crypto keys
  crypto: {
    keyDir: resolve(modulePath, 'utils/crypto'),
    keyFile: resolve(modulePath, 'utils/crypto/key.txt')
  }
};

// ================================
// VALIDATION CONFIG
// ================================
export const VALIDATION_CONFIG = {
  // File validation
  files: {
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedExtensions: ['.json', '.txt'],
    encoding: 'utf8'
  },

  // Testament validation
  testament: {
    minEstatesRequired: 1,
    maxEstatesAllowed: 100,
    requiredFields: {
      testament: ['testator', 'estates'],
      estate: ['beneficiary', 'token', 'amount']
    }
  },

  // Address validation
  ethereum: {
    addressPattern: /^0x[0-9a-fA-F]{40}$/,
    checksumValidation: true
  },

  // Amount validation
  amounts: {
    minAmount: '1',
    maxAmount: '1000000000000000000000000' // 1M tokens with 18 decimals
  }
};

// ================================
// SALT GENERATION CONFIG
// ================================
export const SALT_CONFIG = {
  timestampMultiplier: 10000000,
  maxSafeInteger: Number.MAX_SAFE_INTEGER,

  // Entropy validation
  validateEntropy: true,
  minEntropyBits: 128
};

// ================================
// ERROR HANDLING CONFIG
// ================================
export const ERROR_CONFIG = {
  // Retry settings
  maxRetries: 3,
  baseDelay: USE_ANVIL ? 500 : 1000,       // Faster for local network
  maxDelay: 10000,       // 10 seconds
  backoffMultiplier: 2,

  // Error categories
  categories: {
    VALIDATION_ERROR: 'ValidationError',
    NETWORK_ERROR: 'NetworkError',
    CRYPTO_ERROR: 'CryptoError',
    FILE_ERROR: 'FileError',
    CONTRACT_ERROR: 'ContractError'
  },

  // Logging settings
  logLevel: process.env.LOG_LEVEL || (USE_ANVIL ? 'debug' : 'info'),
  enableStackTrace: NODE_ENV === 'development'
};

// ================================
// PERMIT2 CONFIG
// ================================
export const PERMIT2_CONFIG = {
  // Contract addresses
  address: process.env.PERMIT2_ADDRESS,

  // Default duration
  defaultDuration: 365 * 24 * 60 * 60 * 1000, // 1 year in milliseconds

  // Nonce generation
  maxNonceValue: 1e15, // 1 quadrillion potential nonces

  // Signature validation
  signatureValidation: {
    enableDomainValidation: true,
    enableTypeValidation: true,
    enableValueValidation: true
  }
};

// ================================
// ZERO KNOWLEDGE PROOF CONFIG
// ================================
export const ZK_CONFIG = {
  // Proof generation
  generation: {
    timeout: USE_ANVIL ? 60000 : 300000,    // 1 min for local, 5 min for testnet
    maxCircuitSize: 1000000,
    enableOptimizations: true
  },

  // Verification
  verification: {
    timeout: 60000,     // 1 minute
    enableCache: true,
    strictValidation: true
  },

  // Supported curves
  supportedCurves: ['bn128', 'bls12-381'],

  // Circuit constraints
  maxConstraints: 1000000
};

// ================================
// LOGGING CONFIG
// ================================
export const LOGGING_CONFIG = {
  // Console colors (chalk)
  colors: {
    success: 'green',
    error: 'red',
    warning: 'yellow',
    info: 'blue',
    debug: 'gray',
    highlight: 'white',
    accent: 'cyan'
  },

  // Log levels
  levels: {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
  },

  // Output settings
  truncateSignatures: true,
  signatureDisplayLength: 18, // Show first 10 + last 8 characters

  // Timestamp format
  timestampFormat: 'YYYY-MM-DD HH:mm:ss',

  // Environment-specific settings
  verboseMode: USE_ANVIL || NODE_ENV === 'development'
};

// ================================
// ENVIRONMENT VARIABLES CONFIG
// ================================
export const ENV_CONFIG = {
  // Required environment variables
  required: [
    'TESTATOR_PRIVATE_KEY',
    'EXECUTOR_PRIVATE_KEY',
    'EXECUTOR',
    'TESTAMENT_FACTORY_ADDRESS'
  ],

  // Network-specific required variables
  networkRequired: USE_ANVIL
    ? ['ANVIL_RPC_URL']
    : ['ARB_SEPOLIA_RPC_URL'],

  // Optional environment variables
  optional: [
    'CID',
    'PERMIT2_ADDRESS',
    'IV',
    'ALGORITHM',
    'NODE_ENV',
    'LOG_LEVEL',
    'USE_ANVIL'
  ],

  // Validation patterns
  validation: {
    TESTATOR_PRIVATE_KEY: /^(0x)?[0-9a-fA-F]{64}$/,
    EXECUTOR_PRIVATE_KEY: /^(0x)?[0-9a-fA-F]{64}$/,
    EXECUTOR: /^0x[0-9a-fA-F]{40}$/,
    TESTAMENT_FACTORY_ADDRESS: /^0x[0-9a-fA-F]{40}$/,
    PERMIT2_ADDRESS: /^0x[0-9a-fA-F]{40}$/,
    CID: /^[a-zA-Z0-9]{46,100}$/,
    ALGORITHM: /^(aes-256-gcm|chacha20)$/,
    ANVIL_RPC_URL: /^https?:\/\/.+/,
    ARB_SEPOLIA_RPC_URL: /^https?:\/\/.+/
  },

  // Current environment values
  current: {
    USE_ANVIL,
    NODE_ENV,
    ANVIL_RPC_URL: process.env.ANVIL_RPC_URL,
    ARB_SEPOLIA_RPC_URL: process.env.ARB_SEPOLIA_RPC_URL
  }
};

// ================================
// UTILITY FUNCTIONS
// ================================
export const CONFIG_UTILS = {
  /**
   * Get configuration for specific module
   */
  getModuleConfig(moduleName) {
    const configs = {
      app: APP_CONFIG,
      crypto: CRYPTO_CONFIG,
      signature: SIGNATURE_CONFIG,
      hash: HASH_CONFIG,
      approval: APPROVAL_CONFIG,
      ipfs: IPFS_CONFIG,
      network: NETWORK_CONFIG,
      paths: PATHS_CONFIG,
      validation: VALIDATION_CONFIG,
      salt: SALT_CONFIG,
      error: ERROR_CONFIG,
      permit2: PERMIT2_CONFIG,
      zk: ZK_CONFIG,
      logging: LOGGING_CONFIG,
      env: ENV_CONFIG
    };

    return configs[moduleName] || null;
  },

  /**
   * Validate environment variables
   */
  validateEnvironment() {
    const allRequired = [...ENV_CONFIG.required, ...ENV_CONFIG.networkRequired];
    const missing = allRequired.filter(key => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate format of existing variables
    for (const [key, pattern] of Object.entries(ENV_CONFIG.validation)) {
      const value = process.env[key];
      if (value && !pattern.test(value)) {
        throw new Error(`Invalid format for environment variable ${key}: ${value}`);
      }
    }

    return true;
  },

  /**
   * Get network-specific configuration
   */
  getNetworkConfig() {
    return USE_ANVIL
      ? NETWORK_CONFIG.anvil
      : NETWORK_CONFIG.arbitrumSepolia;
  },

  /**
   * Get current RPC URL
   */
  getRpcUrl() {
    return RPC_URL;
  },

  /**
   * Check if using Anvil local network
   */
  isUsingAnvil() {
    return USE_ANVIL;
  },

  /**
   * Get merged configuration
   */
  getMergedConfig() {
    return {
      app: APP_CONFIG,
      network: NETWORK_CONFIG,
      crypto: CRYPTO_CONFIG,
      signature: SIGNATURE_CONFIG,
      hash: HASH_CONFIG,
      approval: APPROVAL_CONFIG,
      ipfs: IPFS_CONFIG,
      paths: PATHS_CONFIG,
      validation: VALIDATION_CONFIG,
      salt: SALT_CONFIG,
      error: ERROR_CONFIG,
      permit2: PERMIT2_CONFIG,
      zk: ZK_CONFIG,
      logging: LOGGING_CONFIG,
      env: ENV_CONFIG
    };
  },

  /**
   * Check if running in development mode
   */
  isDevelopment() {
    return NODE_ENV === 'development';
  },

  /**
   * Check if running in production mode
   */
  isProduction() {
    return NODE_ENV === 'production';
  },

  /**
   * Get timeout for specific operation
   */
  getTimeout(operation) {
    const timeouts = {
      network: NETWORK_CONFIG.timeout,
      ipfs: IPFS_CONFIG.pinning.timeout,
      zk_generation: ZK_CONFIG.generation.timeout,
      zk_verification: ZK_CONFIG.verification.timeout
    };

    return timeouts[operation] || 30000; // Default 30 seconds
  },

  /**
   * Get retry configuration for specific operation
   */
  getRetryConfig(operation) {
    const retryConfigs = {
      network: {
        attempts: NETWORK_CONFIG.retryAttempts,
        delay: NETWORK_CONFIG.retryDelay
      },
      approval: {
        attempts: APPROVAL_CONFIG.maxRetries,
        delay: APPROVAL_CONFIG.retryDelay
      },
      signature: {
        attempts: SIGNATURE_CONFIG.maxRetries,
        delay: SIGNATURE_CONFIG.retryDelay
      },
      ipfs: {
        attempts: IPFS_CONFIG.pinning.retryAttempts,
        delay: IPFS_CONFIG.pinning.retryDelay
      }
    };

    return retryConfigs[operation] || {
      attempts: ERROR_CONFIG.maxRetries,
      delay: ERROR_CONFIG.baseDelay
    };
  },

  /**
   * Get environment information for debugging
   */
  getEnvironmentInfo() {
    return {
      NODE_ENV,
      USE_ANVIL,
      network: NETWORK_CONFIG.network,
      chainId: NETWORK_CONFIG.expectedChainIds,
      rpcUrl: NETWORK_CONFIG.rpc.current,
      configLoaded: true
    };
  }
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
  VALIDATION_CONFIG,
  SALT_CONFIG,
  ERROR_CONFIG,
  PERMIT2_CONFIG,
  ZK_CONFIG,
  LOGGING_CONFIG,
  ENV_CONFIG,
  CONFIG_UTILS
};