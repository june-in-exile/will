import { ethers } from "ethers";
import { validatePrivateKey } from "@shared/utils/format/wallet.js";
import { validateCidv1 } from "@shared/utils/format/cid.js";
import type { EnvironmentValidationOptions, ValidationResult } from "@shared/types/validation.js";

/**
 * Generic environment variable validation function
 * @param options Validation options including required fields, validators, and transforms
 * @returns Validation result with validated data or errors
 */
export function validateEnvironment<T extends Record<string, any>>(
  options: EnvironmentValidationOptions
): ValidationResult<T> {
  const errors: string[] = [];
  const data: Record<string, any> = {};

  // Check required fields
  if (options.required) {
    for (const field of options.required) {
      const value = process.env[field];
      if (!value) {
        errors.push(`Environment variable ${field} is not set`);
        continue;
      }
      data[field] = value;
    }
  }

  // Check optional fields
  if (options.optional) {
    for (const field of options.optional) {
      const value = process.env[field];
      if (value) {
        data[field] = value;
      }
    }
  }

  // Apply validators
  if (options.validators) {
    for (const [field, validator] of Object.entries(options.validators)) {
      const value = data[field];
      if (value && !validator(value)) {
        errors.push(`Invalid format for environment variable ${field}`);
      }
    }
  }

  // Apply transforms
  if (options.transforms) {
    for (const [field, transform] of Object.entries(options.transforms)) {
      const value = data[field];
      if (value) {
        try {
          data[field] = transform(value);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          errors.push(`Failed to transform ${field}: ${errorMessage}`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    data: data as T,
    errors
  };
}

// Common validators
export const commonValidators = {
  ethereumAddress: (value: string): boolean => ethers.isAddress(value),
  privateKey: (value: string): boolean => validatePrivateKey(value),
  cidv1: (value: string): boolean => validateCidv1(value),
  hexSignature: (value: string): boolean => {
    return value.match(/^0x[0-9a-fA-F]+$/) !== null;
  },
  signatureLength: (expectedLength: number) => (value: string): boolean => {
    return value.length === expectedLength;
  },
  numericString: (value: string): boolean => /^\d+$/.test(value),
  positiveNumber: (value: string): boolean => {
    const num = parseInt(value);
    return !isNaN(num) && num > 0;
  },
  futureTimestamp: (value: string): boolean => {
    const timestamp = parseInt(value);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    return !isNaN(timestamp) && timestamp > currentTimestamp;
  }
};

// Common transforms
export const commonTransforms = {
  toBigInt: (value: string): bigint => BigInt(value),
  toNumber: (value: string): number => parseInt(value),
  toLowerCase: (value: string): string => value.toLowerCase(),
  removeHexPrefix: (value: string): string => value.startsWith("0x") ? value.slice(2) : value
};

// Preset validation configurations for common use cases
export const presetValidations = {
  notarizeCID: (): EnvironmentValidationOptions => ({
    required: ["WILL_FACTORY", "EXECUTOR_PRIVATE_KEY", "CID", "EXECUTOR_SIGNATURE"],
    validators: {
      WILL_FACTORY: commonValidators.ethereumAddress,
      EXECUTOR_PRIVATE_KEY: commonValidators.privateKey,
      CID: commonValidators.cidv1,
      EXECUTOR_SIGNATURE: (value: string) => 
        commonValidators.hexSignature(value) && commonValidators.signatureLength(132)(value)
    }
  }),

  createWill: (): EnvironmentValidationOptions => ({
    required: ["WILL_FACTORY", "EXECUTOR_PRIVATE_KEY", "CID", "TESTATOR", "SALT"],
    validators: {
      WILL_FACTORY: commonValidators.ethereumAddress,
      EXECUTOR_PRIVATE_KEY: commonValidators.privateKey,
      CID: commonValidators.cidv1,
      TESTATOR: commonValidators.ethereumAddress,
      SALT: commonValidators.numericString
    },
    transforms: {
      SALT: commonTransforms.toBigInt
    }
  }),

  signatureTransfer: (): EnvironmentValidationOptions => ({
    required: ["WILL", "EXECUTOR_PRIVATE_KEY", "NONCE", "DEADLINE", "PERMIT2_SIGNATURE"],
    validators: {
      WILL: commonValidators.ethereumAddress,
      EXECUTOR_PRIVATE_KEY: commonValidators.privateKey,
      NONCE: commonValidators.numericString,
      DEADLINE: commonValidators.numericString,
      PERMIT2_SIGNATURE: (value: string) => 
        commonValidators.hexSignature(value) && commonValidators.signatureLength(132)(value)
    },
    transforms: {
      NONCE: commonTransforms.toBigInt,
      DEADLINE: commonTransforms.toBigInt
    }
  }),

  submitProof: (): EnvironmentValidationOptions => ({
    required: ["UPLOAD_CID_VERIFIER"],
    validators: {
      UPLOAD_CID_VERIFIER: commonValidators.ethereumAddress
    }
  }),

  ipfsDownload: (): EnvironmentValidationOptions => ({
    required: ["CID"],
    validators: {
      CID: commonValidators.cidv1
    }
  }),

  uploadCID: (): EnvironmentValidationOptions => ({
    required: ["WILL_FACTORY", "EXECUTOR_PRIVATE_KEY", "CID"],
    validators: {
      WILL_FACTORY: commonValidators.ethereumAddress,
      EXECUTOR_PRIVATE_KEY: commonValidators.privateKey,
      CID: commonValidators.cidv1
    }
  }),

  predictWill: (): EnvironmentValidationOptions => ({
    required: ["WILL_FACTORY"],
    validators: {
      WILL_FACTORY: commonValidators.ethereumAddress
    }
  }),

  transferSigning: (): EnvironmentValidationOptions => ({
    required: ["TESTATOR_PRIVATE_KEY", "PERMIT2"],
    validators: {
      TESTATOR_PRIVATE_KEY: commonValidators.privateKey,
      PERMIT2: commonValidators.ethereumAddress
    }
  }),

  cidSigning: (): EnvironmentValidationOptions => ({
    required: ["CID", "EXECUTOR_PRIVATE_KEY", "EXECUTOR"],
    validators: {
      CID: commonValidators.cidv1,
      EXECUTOR_PRIVATE_KEY: commonValidators.privateKey,
      EXECUTOR: commonValidators.ethereumAddress
    }
  }),

  tokenApproval: (): EnvironmentValidationOptions => ({
    required: ["TESTATOR_PRIVATE_KEY", "PERMIT2"],
    validators: {
      TESTATOR_PRIVATE_KEY: commonValidators.privateKey,
      PERMIT2: commonValidators.ethereumAddress
    }
  })
};