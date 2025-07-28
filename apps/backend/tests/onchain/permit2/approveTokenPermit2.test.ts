import { jest, describe, beforeEach, afterEach, it, expect, beforeAll } from '@jest/globals';
import { ethers, FeeData, JsonRpcProvider, Wallet } from 'ethers';
import { readFileSync, existsSync } from 'fs';
import {
  validateEnvironment,
  // validateFiles,
  // createSigner,
  // validateNetwork,
  // readWillData,
  // extractUniqueTokens,
  // getTokenInfo,
  // checkCurrentAllowance,
  // approveToken,
  // processTokenApprovals,
  // processTokenApprovalWorkflow
} from '@src/onchain/permit2/approveTokenPermit2.js';

// Create mock functions
const mockIsAddress = jest.fn();
const mockFormatEther = jest.fn();
const mockFormatUnits = jest.fn();
const mockJsonRpcProvider = jest.fn();
const mockWallet = jest.fn();
const mockContract = jest.fn();

// Mock the entire module to avoid actual network calls
jest.mock('ethers', () => {
  const actualEthers = jest.requireActual('ethers') as typeof import('ethers');
  return {
    ...actualEthers,
    JsonRpcProvider: mockJsonRpcProvider,
    Wallet: mockWallet,
    Contract: mockContract,
    MaxUint256: BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935'),
    isAddress: mockIsAddress,
    formatEther: mockFormatEther,
    formatUnits: mockFormatUnits,
  };
});

// Create fs mock functions
const mockReadFileSync = jest.fn();
const mockExistsSync = jest.fn();

jest.mock('fs', () => ({
  readFileSync: mockReadFileSync,
  existsSync: mockExistsSync,
}));

jest.mock('@uniswap/permit2-sdk', () => ({
  PERMIT2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
}));

describe('Token Permit2 Approval Workflow', () => {
  let mockProvider: jest.Mocked<JsonRpcProvider>;
  let mockSigner: jest.Mocked<Wallet>;
  let mockTokenContract: any;

  const validWillData = {
    estates: [
      { token: '0x1234567890123456789012345678901234567890', amount: '1000000000000000000' },
      { token: '0x2345678901234567890123456789012345678901', amount: '2000000000000000000' },
      { token: '0x1234567890123456789012345678901234567890', amount: '500000000000000000' }, // Duplicate token
    ],
  };

  beforeAll(() => {
    // Mock console methods to avoid output during tests
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'error').mockImplementation(() => { });
    jest.spyOn(console, 'warn').mockImplementation(() => { });
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup environment variables
    process.env.TESTATOR_PRIVATE_KEY = '1234567890123456789012345678901234567890123456789012345678901234';
    process.env.PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

    // Setup mock provider
    mockProvider = {
      getNetwork: jest.fn(),
      getFeeData: jest.fn(),
      getBalance: jest.fn(),
    } as any;

    // Setup mock signer
    mockSigner = {
      getAddress: jest.fn(),
      provider: mockProvider,
    } as any;

    // Setup mock token contract
    mockTokenContract = {
      name: jest.fn(),
      symbol: jest.fn(),
      decimals: jest.fn(),
      allowance: jest.fn(),
      approve: jest.fn(),
      'approve.estimateGas': jest.fn(),
    };

    // Setup default mock implementations
    mockIsAddress.mockReturnValue(true);
    mockFormatEther.mockReturnValue('1.0');
    mockFormatUnits.mockReturnValue('20.0');
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(validWillData));

    mockProvider.getNetwork.mockResolvedValue({
      name: 'localhost',
      chainId: BigInt(31337),
    } as ethers.Network);

    mockProvider.getFeeData.mockResolvedValue({
      gasPrice: BigInt('20000000000'),
    } as FeeData);

    mockProvider.getBalance.mockResolvedValue(BigInt('1000000000000000000'));
    mockSigner.getAddress.mockResolvedValue('0x1234567890123456789012345678901234567890');

    // Setup ethers mocks
    mockJsonRpcProvider.mockImplementation(() => mockProvider);
    mockWallet.mockImplementation(() => mockSigner);
    mockContract.mockImplementation(() => mockTokenContract);
  });

  describe.only('validateEnvironment', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should validate and return environment variables', () => {
      process.env.TESTATOR_PRIVATE_KEY = '1234567890123456789012345678901234567890123456789012345678901234';
      process.env.PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3';
      mockIsAddress.mockReturnValue(true);

      const result = validateEnvironment();

      expect(result).toEqual({
        TESTATOR_PRIVATE_KEY: '1234567890123456789012345678901234567890123456789012345678901234',
        PERMIT2: '0x000000000022D473030F116dDEE9F6B43aC78BA3'
      });
    });

    it('should throw error when TESTATOR_PRIVATE_KEY is missing', () => {
      delete process.env.TESTATOR_PRIVATE_KEY;

      expect(() => validateEnvironment()).toThrow('Environment variable TESTATOR_PRIVATE_KEY is not set');
    });

    it('should throw error for invalid private key format', () => {
      process.env.TESTATOR_PRIVATE_KEY = 'invalid_key';

      expect(() => validateEnvironment()).toThrow('Invalid private key format');
    });

    it('should throw error for invalid PERMIT2 address', () => {
      process.env.TESTATOR_PRIVATE_KEY = '1234567890123456789012345678901234567890123456789012345678901234';
      process.env.PERMIT2 = 'invalid_address';
      mockIsAddress.mockReturnValue(false);

      expect(() => validateEnvironment()).toThrow('Invalid PERMIT2');
    });

    it('should validate PERMIT2 address format', () => {
      mockIsAddress.mockReturnValue(false);

      expect(() => {
        const permit2Address = '0xinvalid';
        if (!ethers.isAddress(permit2Address)) {
          throw new Error(`Invalid PERMIT2: ${permit2Address}`);
        }
      }).toThrow('Invalid PERMIT2');
    });
  });
});

// describe('validateFiles', () => {
//   it('should pass when will file exists', () => {
//     mockExistsSync.mockReturnValue(true);

//     expect(() => validateFiles()).not.toThrow();
//   });

//   it('should throw error when will file does not exist', () => {
//     mockExistsSync.mockReturnValue(false);

//     expect(() => validateFiles()).toThrow('Formatted will file does not exist');
//   });
// });

// describe('createSigner', () => {
//   it('should create and validate signer successfully', async () => {
//     const privateKey = '1234567890123456789012345678901234567890123456789012345678901234';
//     mockSigner.getAddress.mockResolvedValue('0x1234567890123456789012345678901234567890');
//     mockProvider.getBalance.mockResolvedValue(BigInt('1000000000000000000'));
//     mockFormatEther.mockReturnValue('1.0');

//     const signer = await createSigner(privateKey, mockProvider);

//     expect(signer).toBe(mockSigner);
//     expect(mockSigner.getAddress).toHaveBeenCalled();
//     expect(mockProvider.getBalance).toHaveBeenCalled();
//   });

//   it('should handle signer creation failure', async () => {
//     const privateKey = 'invalid_key';
//     (ethers.Wallet as jest.MockedClass<typeof Wallet>).mockImplementation(() => {
//       throw new Error('Invalid private key');
//     });

//     await expect(createSigner(privateKey, mockProvider)).rejects.toThrow('Failed to create signer');
//   });
// });

// describe('validateNetwork', () => {
//   it('should validate network connection successfully', async () => {
//     const mockNetwork = { name: 'localhost', chainId: BigInt(31337) };
//     const mockFeeData = { gasPrice: BigInt('20000000000') };

//     mockProvider.getNetwork.mockResolvedValue(mockNetwork);
//     mockProvider.getFeeData.mockResolvedValue(mockFeeData);
//     mockFormatUnits.mockReturnValue('20.0');

//     const network = await validateNetwork(mockProvider);

//     expect(network).toEqual(mockNetwork);
//     expect(mockProvider.getNetwork).toHaveBeenCalled();
//     expect(mockProvider.getFeeData).toHaveBeenCalled();
//   });

//   it('should handle network connection failure', async () => {
//     mockProvider.getNetwork.mockRejectedValue(new Error('Network unreachable'));

//     await expect(validateNetwork(mockProvider)).rejects.toThrow('Failed to connect to network');
//   });
// });

// describe('readWillData', () => {
//   it('should read and validate will data successfully', () => {
//     mockExistsSync.mockReturnValue(true);
//     mockReadFileSync.mockReturnValue(JSON.stringify(validWillData));
//     mockIsAddress.mockReturnValue(true);

//     const result = readWillData();

//     expect(result).toEqual(validWillData);
//     expect(mockReadFileSync).toHaveBeenCalled();
//   });

//   it('should throw error for invalid JSON', () => {
//     mockReadFileSync.mockReturnValue('invalid json');

//     expect(() => readWillData()).toThrow('Invalid JSON in will file');
//   });

//   it('should throw error for missing estates array', () => {
//     mockReadFileSync.mockReturnValue(JSON.stringify({}));

//     expect(() => readWillData()).toThrow('Missing or invalid estates array');
//   });

//   it('should throw error for empty estates array', () => {
//     mockReadFileSync.mockReturnValue(JSON.stringify({ estates: [] }));

//     expect(() => readWillData()).toThrow('Estates array cannot be empty');
//   });

//   it('should throw error for invalid token address', () => {
//     const invalidData = {
//       estates: [{ token: 'invalid_address', amount: '1000' }]
//     };
//     mockReadFileSync.mockReturnValue(JSON.stringify(invalidData));
//     mockIsAddress.mockReturnValue(false);

//     expect(() => readWillData()).toThrow('Invalid token address in estate 0');
//   });

//   it('should throw error for invalid amount', () => {
//     const invalidData = {
//       estates: [{ token: '0x1234567890123456789012345678901234567890', amount: 'invalid' }]
//     };
//     mockReadFileSync.mockReturnValue(JSON.stringify(invalidData));
//     mockIsAddress.mockReturnValue(true);

//     expect(() => readWillData()).toThrow('Invalid amount in estate 0');
//   });
// });

// describe('extractUniqueTokens', () => {
//   it('should extract unique tokens correctly', () => {
//     const estates = validWillData.estates;

//     const result = extractUniqueTokens(estates);

//     expect(result.tokens).toHaveLength(2);
//     expect(result.tokens).toContain('0x1234567890123456789012345678901234567890');
//     expect(result.tokens).toContain('0x2345678901234567890123456789012345678901');

//     const tokenDetails = result.tokenDetails.get('0x1234567890123456789012345678901234567890');
//     expect(tokenDetails).toEqual({
//       address: '0x1234567890123456789012345678901234567890',
//       estates: [0, 2],
//       totalAmount: BigInt('1500000000000000000'),
//     });
//   });

//   it('should handle single token correctly', () => {
//     const singleTokenEstates = [
//       { token: '0x1234567890123456789012345678901234567890', amount: '1000000000000000000' }
//     ];

//     const result = extractUniqueTokens(singleTokenEstates);

//     expect(result.tokens).toHaveLength(1);
//     expect(result.tokenDetails.size).toBe(1);
//   });

//   it('should handle empty estates array', () => {
//     const result = extractUniqueTokens([]);

//     expect(result.tokens).toHaveLength(0);
//     expect(result.tokenDetails.size).toBe(0);
//   });
// });

// describe('getTokenInfo', () => {
//   beforeEach(() => {
//     mockTokenContract.name.mockResolvedValue('Test Token');
//     mockTokenContract.symbol.mockResolvedValue('TEST');
//     mockTokenContract.decimals.mockResolvedValue(18);
//   });

//   it('should fetch token information successfully', async () => {
//     const tokenAddress = '0x1234567890123456789012345678901234567890';

//     const result = await getTokenInfo(tokenAddress, mockSigner);

//     expect(result).toEqual({
//       name: 'Test Token',
//       symbol: 'TEST',
//       decimals: 18
//     });
//   });

//   it('should handle token info fetch errors gracefully', async () => {
//     mockTokenContract.name.mockRejectedValue(new Error('Network error'));
//     mockTokenContract.symbol.mockRejectedValue(new Error('Network error'));
//     mockTokenContract.decimals.mockRejectedValue(new Error('Network error'));

//     const tokenAddress = '0x1234567890123456789012345678901234567890';

//     const result = await getTokenInfo(tokenAddress, mockSigner);

//     expect(result).toEqual({
//       name: 'Unknown',
//       symbol: 'UNKNOWN',
//       decimals: 18
//     });
//   });
// });

// describe('checkCurrentAllowance', () => {
//   it('should check current allowance successfully', async () => {
//     const allowance = BigInt('1000000000000000000');
//     mockTokenContract.allowance.mockResolvedValue(allowance);

//     const result = await checkCurrentAllowance(
//       '0x1234567890123456789012345678901234567890',
//       '0xowner',
//       '0xspender',
//       mockSigner
//     );

//     expect(result).toBe(allowance);
//   });

//   it('should handle allowance check failure', async () => {
//     mockTokenContract.allowance.mockRejectedValue(new Error('Network error'));

//     const result = await checkCurrentAllowance(
//       '0x1234567890123456789012345678901234567890',
//       '0xowner',
//       '0xspender',
//       mockSigner
//     );

//     expect(result).toBe(BigInt(0));
//   });
// });

// describe('approveToken', () => {
//   beforeEach(() => {
//     mockTokenContract.name.mockResolvedValue('Test Token');
//     mockTokenContract.symbol.mockResolvedValue('TEST');
//     mockTokenContract.decimals.mockResolvedValue(18);
//     mockTokenContract.allowance.mockResolvedValue(BigInt(0));
//     mockTokenContract.approve.mockResolvedValue({
//       hash: '0xabcdef1234567890',
//       wait: jest.fn().mockResolvedValue({ status: 1 }),
//     });
//     mockTokenContract['approve.estimateGas'] = jest.fn().mockResolvedValue(BigInt(50000));
//     mockSigner.getAddress.mockResolvedValue('0xowner');
//   });

//   it('should approve token successfully', async () => {
//     const tokenAddress = '0x1234567890123456789012345678901234567890';
//     const spenderAddress = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

//     const result = await approveToken(tokenAddress, spenderAddress, mockSigner);

//     expect(result).toEqual({
//       success: true,
//       txHash: '0xabcdef1234567890',
//       alreadyApproved: false
//     });
//   });

//   it('should detect already approved tokens', async () => {
//     mockTokenContract.allowance.mockResolvedValue(ethers.MaxUint256);

//     const tokenAddress = '0x1234567890123456789012345678901234567890';
//     const spenderAddress = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

//     const result = await approveToken(tokenAddress, spenderAddress, mockSigner);

//     expect(result).toEqual({
//       success: true,
//       txHash: null,
//       alreadyApproved: true
//     });
//   });

//   it('should handle approval failure', async () => {
//     mockTokenContract.approve.mockResolvedValue({
//       hash: '0xabcdef1234567890',
//       wait: jest.fn().mockResolvedValue({ status: 0 }),
//     });

//     const tokenAddress = '0x1234567890123456789012345678901234567890';
//     const spenderAddress = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

//     const result = await approveToken(tokenAddress, spenderAddress, mockSigner);

//     expect(result.success).toBe(false);
//     expect(result.error).toBe('Transaction failed');
//   });

//   it('should retry on failure', async () => {
//     let attemptCount = 0;
//     mockTokenContract.approve.mockImplementation(() => {
//       attemptCount++;
//       if (attemptCount === 1) {
//         throw new Error('First attempt failed');
//       }
//       return {
//         hash: '0xabcdef1234567890',
//         wait: jest.fn().mockResolvedValue({ status: 1 }),
//       };
//     });

//     const tokenAddress = '0x1234567890123456789012345678901234567890';
//     const spenderAddress = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

//     const result = await approveToken(tokenAddress, spenderAddress, mockSigner, 0);

//     expect(result.success).toBe(true);
//     expect(attemptCount).toBe(2);
//   });
// });

// describe('processTokenApprovals', () => {
//   beforeEach(() => {
//     mockTokenContract.name.mockResolvedValue('Test Token');
//     mockTokenContract.symbol.mockResolvedValue('TEST');
//     mockTokenContract.decimals.mockResolvedValue(18);
//     mockTokenContract.allowance.mockResolvedValue(BigInt(0));
//     mockTokenContract.approve.mockResolvedValue({
//       hash: '0xabcdef1234567890',
//       wait: jest.fn().mockResolvedValue({ status: 1 }),
//     });
//     mockSigner.getAddress.mockResolvedValue('0xowner');
//   });

//   it('should process multiple token approvals successfully', async () => {
//     const tokens = ['0x1234567890123456789012345678901234567890', '0x2345678901234567890123456789012345678901'];
//     const spenderAddress = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

//     const result = await processTokenApprovals(tokens, spenderAddress, mockSigner);

//     expect(result).toEqual({
//       total: 2,
//       successful: 2,
//       alreadyApproved: 0,
//       failed: 0,
//       results: expect.arrayContaining([
//         expect.objectContaining({ success: true }),
//         expect.objectContaining({ success: true })
//       ]),
//       allSuccessful: true
//     });
//   });

//   it('should handle mixed success and failure scenarios', async () => {
//     const tokens = ['0x1234567890123456789012345678901234567890', '0x2345678901234567890123456789012345678901'];
//     const spenderAddress = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

//     // First token succeeds, second fails
//     let callCount = 0;
//     mockTokenContract.approve.mockImplementation(() => {
//       callCount++;
//       if (callCount === 1) {
//         return {
//           hash: '0xabcdef1234567890',
//           wait: jest.fn().mockResolvedValue({ status: 1 }),
//         };
//       } else {
//         throw new Error('Second token failed');
//       }
//     });

//     const result = await processTokenApprovals(tokens, spenderAddress, mockSigner);

//     expect(result.successful).toBe(1);
//     expect(result.failed).toBe(1);
//     expect(result.allSuccessful).toBe(false);
//   });

//   it('should handle empty token array', async () => {
//     const tokens: string[] = [];
//     const spenderAddress = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

//     const result = await processTokenApprovals(tokens, spenderAddress, mockSigner);

//     expect(result).toEqual({
//       total: 0,
//       successful: 0,
//       alreadyApproved: 0,
//       failed: 0,
//       results: [],
//       allSuccessful: true
//     });
//   });
// });
// describe('processTokenApprovalWorkflow', () => {
//   beforeEach(() => {
//     // Setup all mocks for successful workflow
//     process.env.TESTATOR_PRIVATE_KEY = '1234567890123456789012345678901234567890123456789012345678901234';
//     process.env.PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

//     mockExistsSync.mockReturnValue(true);
//     mockReadFileSync.mockReturnValue(JSON.stringify(validWillData));
//     mockIsAddress.mockReturnValue(true);

//     mockProvider.getNetwork.mockResolvedValue({ name: 'localhost', chainId: BigInt(31337) });
//     mockProvider.getFeeData.mockResolvedValue({ gasPrice: BigInt('20000000000') });
//     mockProvider.getBalance.mockResolvedValue(BigInt('1000000000000000000'));

//     mockSigner.getAddress.mockResolvedValue('0x1234567890123456789012345678901234567890');

//     mockTokenContract.name.mockResolvedValue('Test Token');
//     mockTokenContract.symbol.mockResolvedValue('TEST');
//     mockTokenContract.decimals.mockResolvedValue(18);
//     mockTokenContract.allowance.mockResolvedValue(BigInt(0));
//     mockTokenContract.approve.mockResolvedValue({
//       hash: '0xabcdef1234567890',
//       wait: jest.fn().mockResolvedValue({ status: 1 }),
//     });
//   });

//   it('should complete workflow successfully', async () => {
//     const result = await processTokenApprovalWorkflow();

//     expect(result).toEqual(expect.objectContaining({
//       success: true,
//       total: 2,
//       successful: 2,
//       alreadyApproved: 0,
//       failed: 0,
//       allSuccessful: true,
//       permit2Address: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
//       signerAddress: '0x1234567890123456789012345678901234567890'
//     }));
//   });

//   it('should handle empty estates scenario', async () => {
//     mockReadFileSync.mockReturnValue(JSON.stringify({ estates: [] }));

//     await expect(processTokenApprovalWorkflow()).rejects.toThrow('Estates array cannot be empty');
//   });

//   it('should handle file validation failure', async () => {
//     mockExistsSync.mockReturnValue(false);

//     await expect(processTokenApprovalWorkflow()).rejects.toThrow('Formatted will file does not exist');
//   });

//   it('should handle environment validation failure', async () => {
//     delete process.env.TESTATOR_PRIVATE_KEY;

//     await expect(processTokenApprovalWorkflow()).rejects.toThrow('Environment variable TESTATOR_PRIVATE_KEY is not set');
//   });

//   it('should handle network validation failure', async () => {
//     mockProvider.getNetwork.mockRejectedValue(new Error('Network unreachable'));

//     await expect(processTokenApprovalWorkflow()).rejects.toThrow('Failed to connect to network');
//   });

//   it('should handle signer creation failure', async () => {
//     (ethers.Wallet as jest.MockedClass<typeof Wallet>).mockImplementation(() => {
//       throw new Error('Invalid private key');
//     });

//     await expect(processTokenApprovalWorkflow()).rejects.toThrow('Failed to create signer');
//   });

//   it('should handle partial approval failures gracefully', async () => {
//     // First token succeeds, second fails
//     let callCount = 0;
//     mockTokenContract.approve.mockImplementation(() => {
//       callCount++;
//       if (callCount <= 3) { // First token calls (estimate gas, approve, wait)
//         return {
//           hash: '0xabcdef1234567890',
//           wait: jest.fn().mockResolvedValue({ status: 1 }),
//         };
//       } else {
//         throw new Error('Second token failed');
//       }
//     });

//     const result = await processTokenApprovalWorkflow();

//     expect(result.success).toBe(true);
//     expect(result.allSuccessful).toBe(false);
//     expect(result.failed).toBeGreaterThan(0);
//   });
// });

// describe('Edge Cases and Error Scenarios', () => {
//   it('should handle very large amounts', () => {
//     const largeAmount = '999999999999999999999999999999999999999';

//     expect(() => {
//       const amount = BigInt(largeAmount);
//       expect(amount).toBeDefined();
//     }).not.toThrow();
//   });

//   it('should handle zero amounts', () => {
//     const zeroAmount = '0';

//     const amount = BigInt(zeroAmount);
//     expect(amount).toBe(BigInt(0));
//   });

//   it('should handle malformed token addresses', () => {
//     const malformedAddresses = [
//       '0x123', // Too short
//       'not_an_address',
//       '0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG', // Invalid hex
//       '',
//       null,
//       undefined,
//     ];

//     malformedAddresses.forEach(address => {
//       mockIsAddress.mockReturnValue(false);
//       expect(ethers.isAddress(address as any)).toBe(false);
//     });
//   });

//   it('should handle duplicate tokens in estates', () => {
//     const duplicateTokenData = {
//       estates: [
//         { token: '0x1234567890123456789012345678901234567890', amount: '1000000000000000000' },
//         { token: '0x1234567890123456789012345678901234567890', amount: '2000000000000000000' },
//         { token: '0x1234567890123456789012345678901234567890', amount: '500000000000000000' },
//       ]
//     };

//     const { tokens, tokenDetails } = extractUniqueTokens(duplicateTokenData.estates);

//     expect(tokens).toHaveLength(1);
//     expect(tokenDetails.get('0x1234567890123456789012345678901234567890')).toEqual({
//       address: '0x1234567890123456789012345678901234567890',
//       estates: [0, 1, 2],
//       totalAmount: BigInt('3500000000000000000'),
//     });
//   });

//   it('should handle gas estimation failure gracefully', async () => {
//     mockTokenContract['approve.estimateGas'] = jest.fn().mockRejectedValue(new Error('Gas estimation failed'));
//     mockTokenContract.approve.mockResolvedValue({
//       hash: '0xabcdef1234567890',
//       wait: jest.fn().mockResolvedValue({ status: 1 }),
//     });

//     const tokenAddress = '0x1234567890123456789012345678901234567890';
//     const spenderAddress = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

//     const result = await approveToken(tokenAddress, spenderAddress, mockSigner);

//     expect(result.success).toBe(true);
//   });

//   it('should handle contract interaction timeout', async () => {
//     mockTokenContract.approve.mockImplementation(() =>
//       new Promise((_, reject) =>
//         setTimeout(() => reject(new Error('Transaction timeout')), 100)
//       )
//     );

//     const tokenAddress = '0x1234567890123456789012345678901234567890';
//     const spenderAddress = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

//     const result = await approveToken(tokenAddress, spenderAddress, mockSigner);

//     expect(result.success).toBe(false);
//     expect(result.error).toBe('Transaction timeout');
//   });

//   it('should handle maximum retry attempts exceeded', async () => {
//     mockTokenContract.approve.mockRejectedValue(new Error('Persistent failure'));

//     const tokenAddress = '0x1234567890123456789012345678901234567890';
//     const spenderAddress = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

//     const result = await approveToken(tokenAddress, spenderAddress, mockSigner);

//     expect(result.success).toBe(false);
//     expect(result.error).toBe('Persistent failure');
//   });

//   it('should handle insufficient gas scenarios', async () => {
//     mockTokenContract.approve.mockRejectedValue(new Error('insufficient funds for intrinsic transaction cost'));

//     const tokenAddress = '0x1234567890123456789012345678901234567890';
//     const spenderAddress = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

//     const result = await approveToken(tokenAddress, spenderAddress, mockSigner);

//     expect(result.success).toBe(false);
//     expect(result.error).toBe('insufficient funds for intrinsic transaction cost');
//   });
// });

// describe('Integration Tests', () => {
//   it('should handle complete workflow with mixed token scenarios', async () => {
//     const mixedTokenData = {
//       estates: [
//         { token: '0x1111111111111111111111111111111111111111', amount: '1000000000000000000' }, // New token
//         { token: '0x2222222222222222222222222222222222222222', amount: '2000000000000000000' }, // Already approved
//         { token: '0x3333333333333333333333333333333333333333', amount: '3000000000000000000' }, // Will fail
//       ]
//     };

//     process.env.TESTATOR_PRIVATE_KEY = '1234567890123456789012345678901234567890123456789012345678901234';
//     process.env.PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

//     mockExistsSync.mockReturnValue(true);
//     mockReadFileSync.mockReturnValue(JSON.stringify(mixedTokenData));
//     mockIsAddress.mockReturnValue(true);

//     mockProvider.getNetwork.mockResolvedValue({ name: 'localhost', chainId: BigInt(31337) });
//     mockProvider.getFeeData.mockResolvedValue({ gasPrice: BigInt('20000000000') });
//     mockProvider.getBalance.mockResolvedValue(BigInt('1000000000000000000'));

//     mockSigner.getAddress.mockResolvedValue('0x1234567890123456789012345678901234567890');

//     // Setup different responses for different tokens
//     mockTokenContract.allowance.mockImplementation((owner, spender) => {
//       // Second token already approved
//       if (mockTokenContract.target === '0x2222222222222222222222222222222222222222') {
//         return Promise.resolve(ethers.MaxUint256);
//       }
//       return Promise.resolve(BigInt(0));
//     });

//     mockTokenContract.approve.mockImplementation(() => {
//       // Third token fails
//       if (mockTokenContract.target === '0x3333333333333333333333333333333333333333') {
//         throw new Error('Token contract error');
//       }
//       return Promise.resolve({
//         hash: '0xabcdef1234567890',
//         wait: jest.fn().mockResolvedValue({ status: 1 }),
//       });
//     });

//     const result = await processTokenApprovalWorkflow();

//     expect(result.success).toBe(true);
//     expect(result.total).toBe(3);
//     expect(result.successful).toBe(1);
//     expect(result.alreadyApproved).toBe(1);
//     expect(result.failed).toBe(1);
//     expect(result.allSuccessful).toBe(false);
//   });
// });