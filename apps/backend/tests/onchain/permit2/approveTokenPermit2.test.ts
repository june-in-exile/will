import { vi, describe, beforeEach, afterEach, it, expect, beforeAll } from 'vitest';
import { ethers, FeeData, JsonRpcProvider, Wallet } from 'ethers';
import * as approveTokenPermit2Module from '@src/onchain/permit2/approveTokenPermit2.js';

const TESTATOR_PRIVATE_KEY = "1234567890123456789012345678901234567890123456789012345678901234";
const TESTATOR = '0x1234567890123456789012345678901234567890';
const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

// Test data
const validWillData = {
  estates: [
    { token: '0x1234567890123456789012345678901234567890', amount: '1000000000000000000' },
    { token: '0x2345678901234567890123456789012345678901', amount: '2000000000000000000' },
    { token: '0x1234567890123456789012345678901234567890', amount: '500000000000000000' }, // Duplicate token
  ],
};

// Mock the entire module to avoid actual network calls
vi.mock('ethers', async () => {
  const actualEthers = await vi.importActual('ethers') as typeof import('ethers');
  return {
    ...actualEthers,
    JsonRpcProvider: vi.fn(),
    Wallet: vi.fn(),
    Contract: vi.fn(),
    MaxUint256: BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935'),
    isAddress: vi.fn(),
    formatEther: vi.fn(),
    formatUnits: vi.fn(),
  };
});

// Mock dotenv to prevent loading .env file during tests
vi.mock('dotenv', () => ({
  config: vi.fn(),
}));

// Mock the config module to avoid loading .env 
vi.mock('@config', () => ({
  PATHS_CONFIG: {
    env: '/mock/path/.env',
    will: {
      formatted: '/mock/path/formatted.json'
    }
  },
  APPROVAL_CONFIG: {
    tokenAbi: [],
    gasLimitMultiplier: 1.2,
    confirmationBlocks: 1,
    maxRetries: 3,
    retryDelay: 1000
  },
  NETWORK_CONFIG: {
    rpc: {
      current: 'http://localhost:8545'
    }
  }
}));

// Use vi.mock for ES modules mocking
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

// Mock the permit2SDK module - both ES module and CommonJS require
vi.mock('@uniswap/permit2-sdk', () => ({
  PERMIT2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
}));

// Mock the createRequire for CommonJS module loading
vi.mock('module', () => ({
  createRequire: vi.fn(() => vi.fn(() => ({
    PERMIT2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  })))
}));

describe('Token Permit2 Approval Workflow', () => {  
  // Create mock functions inside describe to avoid hoisting issues
  const mockIsAddress = vi.fn();
  const mockFormatEther = vi.fn();
  const mockFormatUnits = vi.fn();
  const mockJsonRpcProvider = vi.fn();
  const mockWallet = vi.fn();
  const mockContract = vi.fn();
  const mockReadFileSync = vi.fn();
  const mockExistsSync = vi.fn();

  let mockProvider: any;
  let mockSigner: any;
  let mockTokenContract: any;

  // const validWillData = {
  //   estates: [
  //     { token: '0x1234567890123456789012345678901234567890', amount: '1000000000000000000' },
  //     { token: '0x2345678901234567890123456789012345678901', amount: '2000000000000000000' },
  //     { token: '0x1234567890123456789012345678901234567890', amount: '500000000000000000' }, // Duplicate token
  //   ],
  // };

  beforeAll(() => {
    // Mock console methods to avoid output during tests
    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(console, 'error').mockImplementation(() => { });
    vi.spyOn(console, 'warn').mockImplementation(() => { });
  });

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup environment variables
    process.env.TESTATOR_PRIVATE_KEY = TESTATOR_PRIVATE_KEY;
    process.env.PERMIT2 = PERMIT2;

    // Setup mock provider
    mockProvider = {
      getNetwork: vi.fn(),
      getFeeData: vi.fn(),
      getBalance: vi.fn(),
    } as any;

    // Setup mock signer
    mockSigner = {
      getAddress: vi.fn(),
      provider: mockProvider,
    } as any;

    // Setup mock token contract
    mockTokenContract = {
      name: vi.fn(),
      symbol: vi.fn(),
      decimals: vi.fn(),
      allowance: vi.fn(),
      approve: vi.fn(),
    };
    
    // Add estimateGas as a property of approve function
    (mockTokenContract.approve as any).estimateGas = vi.fn();

    // Setup default mock implementations
    // mockIsAddress.mockReturnValue(true);
    // mockFormatEther.mockReturnValue('1.0');
    // mockFormatUnits.mockReturnValue('20.0');
    // mockExistsSync.mockReturnValue(true);
    // mockReadFileSync.mockReturnValue(JSON.stringify(validWillData));

    mockProvider.getNetwork.mockResolvedValue({
      name: 'localhost',
      chainId: BigInt(31337),
    } as ethers.Network);

    mockProvider.getFeeData.mockResolvedValue({
      gasPrice: BigInt('20000000000'),
    } as FeeData);

    mockProvider.getBalance.mockResolvedValue(BigInt('1000000000000000000'));
    mockSigner.getAddress.mockResolvedValue('0x1234567890123456789012345678901234567890');

    // Setup ethers mocks with proper mocked functions
    mockJsonRpcProvider.mockImplementation(() => mockProvider);
    mockWallet.mockImplementation(() => mockSigner);
    mockContract.mockImplementation(() => mockTokenContract);
    mockIsAddress.mockImplementation(() => true);
    mockFormatEther.mockImplementation(() => '1.0');
    mockFormatUnits.mockImplementation(() => '20.0');
    
    // Setup fs mocks will be handled in individual tests as needed
  });

  describe('validateEnvironment', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should validate and return environment variables', () => {
      mockIsAddress.mockReturnValue(true);

      const result = approveTokenPermit2Module.validateEnvironment();

      expect(result).toEqual({
        TESTATOR_PRIVATE_KEY: TESTATOR_PRIVATE_KEY,
        PERMIT2: PERMIT2
      });
    });

    it('should throw error when TESTATOR_PRIVATE_KEY is missing', () => {
      delete process.env.TESTATOR_PRIVATE_KEY;

      expect(() => approveTokenPermit2Module.validateEnvironment()).toThrow('Environment variable TESTATOR_PRIVATE_KEY is not set');
    });

    it('should throw error for invalid private key format', () => {
      process.env.TESTATOR_PRIVATE_KEY = 'invalid_key';

      expect(() => approveTokenPermit2Module.validateEnvironment()).toThrow('Invalid private key format');
    });

    it('should use SDK PERMIT2 when environment variable is missing', () => {
      delete process.env.PERMIT2;
      mockIsAddress.mockReturnValue(true);

      // Since the code uses require() for permit2SDK, the mock should be available
      const result = approveTokenPermit2Module.validateEnvironment();

      expect(result).toEqual({
        TESTATOR_PRIVATE_KEY: TESTATOR_PRIVATE_KEY,
        PERMIT2: PERMIT2
      });
    });

    it('should throw error for invalid PERMIT2 address', () => {
      process.env.PERMIT2 = 'invalid_address';
      mockIsAddress.mockReturnValue(false);

      expect(() => approveTokenPermit2Module.validateEnvironment()).toThrow('Invalid PERMIT2');
    });
  });

  describe('validateFiles', () => {
    it('should pass when will file exists', async () => {
      const fs = await import('fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);

      expect(() => approveTokenPermit2Module.validateFiles()).not.toThrow();
    });

    it('should throw error when will file does not exist', async () => {
      const fs = await import('fs');
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(() => approveTokenPermit2Module.validateFiles()).toThrow(/Formatted will file does not exist/);
    });
  });

  describe('createSigner', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it('should create and validate signer successfully', async () => {
      mockWallet.mockImplementation(() => mockSigner);
      mockSigner.getAddress.mockResolvedValue(TESTATOR);
      mockProvider.getBalance.mockResolvedValue(BigInt('1000000000000000000'));
      mockFormatEther.mockReturnValue('1.0');

      const signer = await approveTokenPermit2Module.createSigner(TESTATOR_PRIVATE_KEY, mockProvider);

      // Verify that signer has the expected properties
      expect(signer.provider).toBe(mockProvider);
      expect(typeof signer.getAddress).toBe('function');

      // Check that the provider methods were called for balance check
      expect(mockProvider.getBalance).toHaveBeenCalled();
    });

    it('should handle signer creation failure', async () => {
      const privateKey = 'invalid_key';
      mockWallet.mockImplementation(() => {
        throw new Error('Invalid private key');
      });

      await expect(approveTokenPermit2Module.createSigner(privateKey, mockProvider)).rejects.toThrow('Failed to create signer');
    });
  });

  describe('validateNetwork', () => {
    beforeEach(() => {
      vi.resetModules();
      vi.clearAllMocks();
      mockFormatUnits.mockReturnValue('20.0');
    });

    it('should validate network connection successfully', async () => {
      const mockNetwork = { name: 'localhost', chainId: BigInt(31337) };
      const mockFeeData = { gasPrice: BigInt('20000000000') };

      mockProvider.getNetwork.mockResolvedValue(mockNetwork);
      mockProvider.getFeeData.mockResolvedValue(mockFeeData);
      mockFormatUnits.mockReturnValue('20.0');

      const network = await approveTokenPermit2Module.validateNetwork(mockProvider);

      expect(network).toEqual(mockNetwork);
      expect(mockProvider.getNetwork).toHaveBeenCalled();
      expect(mockProvider.getFeeData).toHaveBeenCalled();
    });

    it('should handle network connection failure', async () => {
      mockProvider.getNetwork.mockRejectedValue(new Error('Network unreachable'));

      await expect(approveTokenPermit2Module.validateNetwork(mockProvider)).rejects.toThrow('Failed to connect to network');
    });
  });

  describe('readWillData', () => {
    beforeEach(async () => {
      vi.resetModules();
      vi.clearAllMocks();
      const fs = await import('fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
    });

    it('should read and validate will data successfully', async () => {
      const fs = await import('fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(validWillData));
      mockIsAddress.mockReturnValue(true);

      const result = approveTokenPermit2Module.readWillData();

      expect(result).toEqual(validWillData);
      expect(vi.mocked(fs.readFileSync)).toHaveBeenCalled();
    });

    it('should throw error for invalid JSON', async () => {
      const fs = await import('fs');
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json');

      expect(() => approveTokenPermit2Module.readWillData()).toThrow('Invalid JSON in will file');
    });

    it('should throw error for missing estates array', async () => {
      const fs = await import('fs');
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({}));

      expect(() => approveTokenPermit2Module.readWillData()).toThrow('Missing or invalid estates array');
    });

    it('should throw error for empty estates array', async () => {
      const fs = await import('fs');
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ estates: [] }));

      expect(() => approveTokenPermit2Module.readWillData()).toThrow('Estates array cannot be empty');
    });

    it('should throw error for invalid token address', async () => {
      const invalidData = {
        estates: [{ token: 'invalid_address', amount: '1000' }]
      };
      const fs = await import('fs');
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(invalidData));
      mockIsAddress.mockReturnValue(false);

      expect(() => approveTokenPermit2Module.readWillData()).toThrow('Invalid token address in estate 0');
    });

    it('should throw error for invalid amount', async () => {
      const invalidData = {
        estates: [{ token: '0x1234567890123456789012345678901234567890', amount: 'invalid' }]
      };
      const fs = await import('fs');
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(invalidData));
      mockIsAddress.mockReturnValue(true);

      expect(() => approveTokenPermit2Module.readWillData()).toThrow('Invalid amount in estate 0');
    });
  });

  describe('extractUniqueTokens', () => {
    beforeEach(() => {
      vi.resetModules();
      vi.clearAllMocks();
    });

    it('should extract unique tokens correctly', () => {
      const estates = validWillData.estates;

      const result = approveTokenPermit2Module.extractUniqueTokens(estates);

      expect(result.tokens).toHaveLength(2);
      expect(result.tokens).toContain('0x1234567890123456789012345678901234567890');
      expect(result.tokens).toContain('0x2345678901234567890123456789012345678901');

      const tokenDetails = result.tokenDetails.get('0x1234567890123456789012345678901234567890'.toLowerCase());
      expect(tokenDetails).toEqual({
        address: '0x1234567890123456789012345678901234567890',
        estates: [0, 2],
        totalAmount: BigInt('1500000000000000000'),
      });
    });

    it('should handle single token correctly', () => {
      const singleTokenEstates = [
        { token: '0x1234567890123456789012345678901234567890', amount: '1000000000000000000' }
      ];

      const result = approveTokenPermit2Module.extractUniqueTokens(singleTokenEstates);

      expect(result.tokens).toHaveLength(1);
      expect(result.tokenDetails.size).toBe(1);
    });

    it('should handle empty estates array', () => {
      const result = approveTokenPermit2Module.extractUniqueTokens([]);

      expect(result.tokens).toHaveLength(0);
      expect(result.tokenDetails.size).toBe(0);
    });
  });

  describe('getTokenInfo', () => {
    it('should fetch token information successfully', async () => {
      // Debug: check if ethers.Contract is properly mocked
      console.log('ethers.Contract is mocked:', typeof ethers.Contract);
      console.log('mockContract mock calls:', mockContract.mock.calls.length);
      
      // Setup the existing mockTokenContract with successful responses
      mockTokenContract.name.mockResolvedValue('Test Token');
      mockTokenContract.symbol.mockResolvedValue('TEST');
      mockTokenContract.decimals.mockResolvedValue(18);
      
      const tokenAddress = '0x1234567890123456789012345678901234567890';

      const result = await approveTokenPermit2Module.getTokenInfo(tokenAddress, mockSigner);
      
      // Debug output
      console.log('Result:', result);
      console.log('mockContract calls after execution:', mockContract.mock.calls.length);

      expect(result).toEqual({
        name: 'Test Token',
        symbol: 'TEST',
        decimals: 18
      });
      
      // Verify the calls were made
      expect(mockContract).toHaveBeenCalled();
      expect(mockTokenContract.name).toHaveBeenCalled();
      expect(mockTokenContract.symbol).toHaveBeenCalled();
      expect(mockTokenContract.decimals).toHaveBeenCalled();
    });

    it('should handle token info fetch errors gracefully', async () => {
      vi.resetModules();
      vi.clearAllMocks();
      
      // Fresh mock setup for this test with errors
      const freshTokenContract = {
        name: vi.fn().mockRejectedValue(new Error('Network error')),
        symbol: vi.fn().mockRejectedValue(new Error('Network error')),
        decimals: vi.fn().mockRejectedValue(new Error('Network error')),
      };
      
      mockContract.mockImplementation(() => freshTokenContract);

      const tokenAddress = '0x1234567890123456789012345678901234567890';

      const result = await approveTokenPermit2Module.getTokenInfo(tokenAddress, mockSigner);

      expect(result).toEqual({
        name: 'Unknown',
        symbol: 'UNKNOWN',
        decimals: 18
      });
    });
  });

  describe('checkCurrentAllowance', () => {
    it('should check current allowance successfully', async () => {
      const allowance = BigInt('1000000000000000000');
      
      // Setup the existing mockTokenContract with successful response
      mockTokenContract.allowance.mockResolvedValue(allowance);

      const result = await approveTokenPermit2Module.checkCurrentAllowance(
        '0x1234567890123456789012345678901234567890',
        '0xowner',
        '0xspender',
        mockSigner
      );

      expect(result).toBe(allowance);
      
      // Verify the call was made
      expect(mockTokenContract.allowance).toHaveBeenCalledWith('0xowner', '0xspender');
    });

    it('should handle allowance check failure', async () => {
      vi.resetModules();
      vi.clearAllMocks();
      
      const freshTokenContract = {
        allowance: vi.fn().mockRejectedValue(new Error('Network error')),
      };
      
      mockContract.mockImplementation(() => freshTokenContract);

      const result = await approveTokenPermit2Module.checkCurrentAllowance(
        '0x1234567890123456789012345678901234567890',
        '0xowner',
        '0xspender',
        mockSigner
      );

      expect(result).toBe(BigInt(0));
    });
  });

  describe('approveToken', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      
      // Recreate the mock token contract for this test suite
      const approveTokenMockContract = {
        name: vi.fn().mockResolvedValue('Test Token'),
        symbol: vi.fn().mockResolvedValue('TEST'),
        decimals: vi.fn().mockResolvedValue(18),
        allowance: vi.fn().mockResolvedValue(BigInt(0)),
        approve: vi.fn().mockResolvedValue({
          hash: '0xabcdef1234567890',
          wait: vi.fn().mockResolvedValue({ status: 1 }),
        }),
      };
      
      // Add estimateGas as a property of approve function
      (approveTokenMockContract.approve as any).estimateGas = vi.fn().mockResolvedValue(BigInt(50000));
      
      mockSigner.getAddress.mockResolvedValue('0xowner');
      mockContract.mockImplementation(() => approveTokenMockContract);
    });

    it('should approve token successfully', async () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890';
      const spenderAddress = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

      const result = await approveTokenPermit2Module.approveToken(tokenAddress, spenderAddress, mockSigner);

      expect(result).toEqual({
        success: true,
        txHash: '0xabcdef1234567890',
        alreadyApproved: false
      });
    });

    it('should detect already approved tokens', async () => {
      mockTokenContract.allowance.mockResolvedValue(ethers.MaxUint256);

      const tokenAddress = '0x1234567890123456789012345678901234567890';
      const spenderAddress = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

      const result = await approveTokenPermit2Module.approveToken(tokenAddress, spenderAddress, mockSigner);

      expect(result).toEqual({
        success: true,
        txHash: null,
        alreadyApproved: true
      });
    });

    it('should handle approval failure', async () => {
      mockTokenContract.approve.mockResolvedValue({
        hash: '0xabcdef1234567890',
        wait: vi.fn().mockResolvedValue({ status: 0 }),
      });

      const tokenAddress = '0x1234567890123456789012345678901234567890';
      const spenderAddress = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

      const result = await approveTokenPermit2Module.approveToken(tokenAddress, spenderAddress, mockSigner);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Transaction failed');
    });

    it('should retry on failure', async () => {
      let attemptCount = 0;
      mockTokenContract.approve.mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('First attempt failed');
        }
        return {
          hash: '0xabcdef1234567890',
          wait: vi.fn().mockResolvedValue({ status: 1 }),
        };
      });

      const tokenAddress = '0x1234567890123456789012345678901234567890';
      const spenderAddress = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

      const result = await approveTokenPermit2Module.approveToken(tokenAddress, spenderAddress, mockSigner, 0);

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(2);
    });
  });

  describe('processTokenApprovals', () => {
    beforeEach(() => {
      vi.resetModules();
      vi.clearAllMocks();
      mockTokenContract.name.mockResolvedValue('Test Token');
      mockTokenContract.symbol.mockResolvedValue('TEST');
      mockTokenContract.decimals.mockResolvedValue(18);
      mockTokenContract.allowance.mockResolvedValue(BigInt(0));
      mockTokenContract.approve.mockResolvedValue({
        hash: '0xabcdef1234567890',
        wait: vi.fn().mockResolvedValue({ status: 1 }),
      });
      (mockTokenContract.approve as any).estimateGas = vi.fn().mockResolvedValue(BigInt(50000));
      mockSigner.getAddress.mockResolvedValue('0xowner');
      mockContract.mockImplementation(() => mockTokenContract);
    });

    it('should process multiple token approvals successfully', async () => {
      const tokens = ['0x1234567890123456789012345678901234567890', '0x2345678901234567890123456789012345678901'];
      const spenderAddress = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

      const result = await approveTokenPermit2Module.processTokenApprovals(tokens, spenderAddress, mockSigner);

      expect(result).toEqual({
        total: 2,
        successful: 2,
        alreadyApproved: 0,
        failed: 0,
        results: expect.arrayContaining([
          expect.objectContaining({ success: true }),
          expect.objectContaining({ success: true })
        ]),
        allSuccessful: true
      });
    });

    it('should handle mixed success and failure scenarios', async () => {
      const tokens = ['0x1234567890123456789012345678901234567890', '0x2345678901234567890123456789012345678901'];
      const spenderAddress = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

      // First token succeeds, second fails
      let callCount = 0;
      mockTokenContract.approve.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            hash: '0xabcdef1234567890',
            wait: vi.fn().mockResolvedValue({ status: 1 }),
          };
        } else {
          throw new Error('Second token failed');
        }
      });

      const result = await approveTokenPermit2Module.processTokenApprovals(tokens, spenderAddress, mockSigner);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.allSuccessful).toBe(false);
    });

    it('should handle empty token array', async () => {
      const tokens: string[] = [];
      const spenderAddress = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

      const result = await approveTokenPermit2Module.processTokenApprovals(tokens, spenderAddress, mockSigner);

      expect(result).toEqual({
        total: 0,
        successful: 0,
        alreadyApproved: 0,
        failed: 0,
        results: [],
        allSuccessful: true
      });
    });
  });
  describe('processTokenApprovalWorkflow', () => {
    beforeEach(async () => {
      vi.resetModules();
      vi.clearAllMocks();
      
      // Setup all mocks for successful workflow
      process.env.TESTATOR_PRIVATE_KEY = '1234567890123456789012345678901234567890123456789012345678901234';
      process.env.PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

      const fs = await import('fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(validWillData));
      mockIsAddress.mockReturnValue(true);

      mockProvider.getNetwork.mockResolvedValue({ name: 'localhost', chainId: BigInt(31337) });
      mockProvider.getFeeData.mockResolvedValue({ gasPrice: BigInt('20000000000') });
      mockProvider.getBalance.mockResolvedValue(BigInt('1000000000000000000'));

      mockSigner.getAddress.mockResolvedValue('0x1234567890123456789012345678901234567890');

      mockTokenContract.name.mockResolvedValue('Test Token');
      mockTokenContract.symbol.mockResolvedValue('TEST');
      mockTokenContract.decimals.mockResolvedValue(18);
      mockTokenContract.allowance.mockResolvedValue(BigInt(0));
      mockTokenContract.approve.mockResolvedValue({
        hash: '0xabcdef1234567890',
        wait: vi.fn().mockResolvedValue({ status: 1 }),
      });
      (mockTokenContract.approve as any).estimateGas = vi.fn().mockResolvedValue(BigInt(50000));
      
      // Setup ethers mocks
      mockJsonRpcProvider.mockImplementation(() => mockProvider);
      mockWallet.mockImplementation(() => mockSigner);
      mockContract.mockImplementation(() => mockTokenContract);
      mockFormatEther.mockReturnValue('1.0');
      mockFormatUnits.mockReturnValue('20.0');
    });

    it('should complete workflow successfully', async () => {
      const result = await approveTokenPermit2Module.processTokenApprovalWorkflow();

      expect(result).toEqual(expect.objectContaining({
        success: true,
        total: 2,
        successful: 2,
        alreadyApproved: 0,
        failed: 0,
        allSuccessful: true,
        permit2Address: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
        signerAddress: expect.any(String)
      }));
    });

    it('should handle empty estates scenario', async () => {
      const fs = await import('fs');
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ estates: [] }));

      await expect(approveTokenPermit2Module.processTokenApprovalWorkflow()).rejects.toThrow('Estates array cannot be empty');
    });

    it('should handle file validation failure', async () => {
      const fs = await import('fs');
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await expect(approveTokenPermit2Module.processTokenApprovalWorkflow()).rejects.toThrow('Formatted will file does not exist');
    });

    it('should handle environment validation failure', async () => {
      delete process.env.TESTATOR_PRIVATE_KEY;

      await expect(approveTokenPermit2Module.processTokenApprovalWorkflow()).rejects.toThrow('Environment variable TESTATOR_PRIVATE_KEY is not set');
    });

    it('should handle network validation failure', async () => {
      mockProvider.getNetwork.mockRejectedValue(new Error('Network unreachable'));

      await expect(approveTokenPermit2Module.processTokenApprovalWorkflow()).rejects.toThrow('Failed to connect to network');
    });

    it('should handle signer creation failure', async () => {
      mockWallet.mockImplementation(() => {
        throw new Error('Invalid private key');
      });

      await expect(approveTokenPermit2Module.processTokenApprovalWorkflow()).rejects.toThrow('Failed to create signer');
    });

    it('should handle partial approval failures gracefully', async () => {
      // First token succeeds, second fails
      let callCount = 0;
      mockTokenContract.approve.mockImplementation(() => {
        callCount++;
        if (callCount <= 3) { // First token calls (estimate gas, approve, wait)
          return {
            hash: '0xabcdef1234567890',
            wait: vi.fn().mockResolvedValue({ status: 1 }),
          };
        } else {
          throw new Error('Second token failed');
        }
      });

      const result = await approveTokenPermit2Module.processTokenApprovalWorkflow();

      expect(result.success).toBe(true);
      expect(result.allSuccessful).toBe(false);
      expect(result.failed).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle very large amounts', () => {
      const largeAmount = '999999999999999999999999999999999999999';

      expect(() => {
        const amount = BigInt(largeAmount);
        expect(amount).toBeDefined();
      }).not.toThrow();
    });

    it('should handle zero amounts', () => {
      const zeroAmount = '0';

      const amount = BigInt(zeroAmount);
      expect(amount).toBe(BigInt(0));
    });

    it('should handle malformed token addresses', () => {
      const malformedAddresses = [
        '0x123', // Too short
        'not_an_address',
        '0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG', // Invalid hex
        '',
        null,
        undefined,
      ];

      malformedAddresses.forEach(address => {
        mockIsAddress.mockReturnValue(false);
        expect(ethers.isAddress(address as any)).toBe(false);
      });
    });

    it('should handle duplicate tokens in estates', () => {
      const duplicateTokenData = {
        estates: [
          { token: '0x1234567890123456789012345678901234567890', amount: '1000000000000000000' },
          { token: '0x1234567890123456789012345678901234567890', amount: '2000000000000000000' },
          { token: '0x1234567890123456789012345678901234567890', amount: '500000000000000000' },
        ]
      };

      const { tokens, tokenDetails } = approveTokenPermit2Module.extractUniqueTokens(duplicateTokenData.estates);

      expect(tokens).toHaveLength(1);
      expect(tokenDetails.get('0x1234567890123456789012345678901234567890'.toLowerCase())).toEqual({
        address: '0x1234567890123456789012345678901234567890',
        estates: [0, 1, 2],
        totalAmount: BigInt('3500000000000000000'),
      });
    });

    it('should handle gas estimation failure gracefully', async () => {
      vi.resetModules();
      vi.clearAllMocks();
      
      mockTokenContract.name.mockResolvedValue('Test Token');
      mockTokenContract.symbol.mockResolvedValue('TEST');
      mockTokenContract.decimals.mockResolvedValue(18);
      mockTokenContract.allowance.mockResolvedValue(BigInt(0));
      (mockTokenContract.approve as any).estimateGas = vi.fn().mockRejectedValue(new Error('Gas estimation failed'));
      mockTokenContract.approve.mockResolvedValue({
        hash: '0xabcdef1234567890',
        wait: vi.fn().mockResolvedValue({ status: 1 }),
      });
      mockSigner.getAddress.mockResolvedValue('0xowner');
      mockContract.mockImplementation(() => mockTokenContract);

      const tokenAddress = '0x1234567890123456789012345678901234567890';
      const spenderAddress = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

      const result = await approveTokenPermit2Module.approveToken(tokenAddress, spenderAddress, mockSigner);

      expect(result.success).toBe(true);
    });

    it('should handle contract interaction timeout', async () => {
      vi.resetModules();
      vi.clearAllMocks();
      
      mockTokenContract.name.mockResolvedValue('Test Token');
      mockTokenContract.symbol.mockResolvedValue('TEST');
      mockTokenContract.decimals.mockResolvedValue(18);
      mockTokenContract.allowance.mockResolvedValue(BigInt(0));
      (mockTokenContract.approve as any).estimateGas = vi.fn().mockResolvedValue(BigInt(50000));
      mockTokenContract.approve.mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Transaction timeout')), 100)
        )
      );
      mockSigner.getAddress.mockResolvedValue('0xowner');
      mockContract.mockImplementation(() => mockTokenContract);

      const tokenAddress = '0x1234567890123456789012345678901234567890';
      const spenderAddress = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

      const result = await approveTokenPermit2Module.approveToken(tokenAddress, spenderAddress, mockSigner);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Transaction timeout');
    });

    it('should handle maximum retry attempts exceeded', async () => {
      vi.resetModules();
      vi.clearAllMocks();
      
      mockTokenContract.name.mockResolvedValue('Test Token');
      mockTokenContract.symbol.mockResolvedValue('TEST');
      mockTokenContract.decimals.mockResolvedValue(18);
      mockTokenContract.allowance.mockResolvedValue(BigInt(0));
      (mockTokenContract.approve as any).estimateGas = vi.fn().mockResolvedValue(BigInt(50000));
      mockTokenContract.approve.mockRejectedValue(new Error('Persistent failure'));
      mockSigner.getAddress.mockResolvedValue('0xowner');
      mockContract.mockImplementation(() => mockTokenContract);

      const tokenAddress = '0x1234567890123456789012345678901234567890';
      const spenderAddress = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

      const result = await approveTokenPermit2Module.approveToken(tokenAddress, spenderAddress, mockSigner);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Persistent failure');
    });

    it('should handle insufficient gas scenarios', async () => {
      vi.resetModules();
      vi.clearAllMocks();
      
      mockTokenContract.name.mockResolvedValue('Test Token');
      mockTokenContract.symbol.mockResolvedValue('TEST');
      mockTokenContract.decimals.mockResolvedValue(18);
      mockTokenContract.allowance.mockResolvedValue(BigInt(0));
      (mockTokenContract.approve as any).estimateGas = vi.fn().mockResolvedValue(BigInt(50000));
      mockTokenContract.approve.mockRejectedValue(new Error('insufficient funds for intrinsic transaction cost'));
      mockSigner.getAddress.mockResolvedValue('0xowner');
      mockContract.mockImplementation(() => mockTokenContract);

      const tokenAddress = '0x1234567890123456789012345678901234567890';
      const spenderAddress = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

      const result = await approveTokenPermit2Module.approveToken(tokenAddress, spenderAddress, mockSigner);

      expect(result.success).toBe(false);
      expect(result.error).toBe('insufficient funds for intrinsic transaction cost');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow with mixed token scenarios', async () => {
      vi.resetModules();
      vi.clearAllMocks();
      
      const mixedTokenData = {
        estates: [
          { token: '0x1111111111111111111111111111111111111111', amount: '1000000000000000000' }, // New token
          { token: '0x2222222222222222222222222222222222222222', amount: '2000000000000000000' }, // Already approved
          { token: '0x3333333333333333333333333333333333333333', amount: '3000000000000000000' }, // Will fail
        ]
      };

      process.env.TESTATOR_PRIVATE_KEY = '1234567890123456789012345678901234567890123456789012345678901234';
      process.env.PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

      const fs = await import('fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mixedTokenData));
      mockIsAddress.mockReturnValue(true);

      mockProvider.getNetwork.mockResolvedValue({ name: 'localhost', chainId: BigInt(31337) });
      mockProvider.getFeeData.mockResolvedValue({ gasPrice: BigInt('20000000000') });
      mockProvider.getBalance.mockResolvedValue(BigInt('1000000000000000000'));

      mockSigner.getAddress.mockResolvedValue('0x1234567890123456789012345678901234567890');

      // Setup token contract responses
      mockTokenContract.name.mockResolvedValue('Test Token');
      mockTokenContract.symbol.mockResolvedValue('TEST');
      mockTokenContract.decimals.mockResolvedValue(18);
      (mockTokenContract.approve as any).estimateGas = vi.fn().mockResolvedValue(BigInt(50000));
      
      // Setup different responses for different tokens based on call count
      let allowanceCallCount = 0;
      let approveCallCount = 0;
      
      mockTokenContract.allowance.mockImplementation(() => {
        allowanceCallCount++;
        // Second token already approved (second allowance call)
        if (allowanceCallCount === 2) {
          return Promise.resolve(ethers.MaxUint256);
        }
        return Promise.resolve(BigInt(0));
      });

      mockTokenContract.approve.mockImplementation(() => {
        approveCallCount++;
        // Third token fails (second approve call)
        if (approveCallCount === 2) {
          throw new Error('Token contract error');
        }
        return Promise.resolve({
          hash: '0xabcdef1234567890',
          wait: vi.fn().mockResolvedValue({ status: 1 }),
        });
      });
      
      // Setup ethers mocks
      mockJsonRpcProvider.mockImplementation(() => mockProvider);
      mockWallet.mockImplementation(() => mockSigner);
      mockContract.mockImplementation(() => mockTokenContract);
      mockFormatEther.mockReturnValue('1.0');
      mockFormatUnits.mockReturnValue('20.0');

      const result = await approveTokenPermit2Module.processTokenApprovalWorkflow();

      expect(result.success).toBe(true);
      expect(result.total).toBe(3);
      expect(result.successful).toBe(1);
      expect(result.alreadyApproved).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.allSuccessful).toBe(false);
    });
  });
});
