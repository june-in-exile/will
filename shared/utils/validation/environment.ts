import { validateEthereumAddress, validatePrivateKey, validateSignature } from "@shared/utils/validation/blockchain.js";
import { validateCidv1 } from "@shared/utils/validation/cid.js";
import { stringToBigInt } from "@shared/utils/transform/encoding.js";
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

const validators = {
  ethereumAddress: (value: string): boolean => validateEthereumAddress(value),
  privateKey: (value: string): boolean => validatePrivateKey(value),
  cidv1: (value: string): boolean => validateCidv1(value),
  signature: (value: string): boolean => validateSignature(value),
  numericString: (value: string): boolean => /^\d+$/.test(value),
};

// Preset validation configurations for common use cases
export const presetValidations = {
  tokenApproval: (): EnvironmentValidationOptions => ({
    required: ["TESTATOR_PRIVATE_KEY", "PERMIT2"],
    validators: {
      TESTATOR_PRIVATE_KEY: validators.privateKey,
      PERMIT2: validators.ethereumAddress
    }
  }),

  predictWill: (): EnvironmentValidationOptions => ({
    required: ["WILL_FACTORY"],
    validators: {
      WILL_FACTORY: validators.ethereumAddress
    }
  }),

  transferSigning: (): EnvironmentValidationOptions => ({
    required: ["TESTATOR_PRIVATE_KEY", "PERMIT2"],
    validators: {
      TESTATOR_PRIVATE_KEY: validators.privateKey,
      PERMIT2: validators.ethereumAddress
    }
  }),

  uploadCid: (): EnvironmentValidationOptions => ({
    required: ["WILL_FACTORY", "EXECUTOR_PRIVATE_KEY", "CID"],
    validators: {
      WILL_FACTORY: validators.ethereumAddress,
      EXECUTOR_PRIVATE_KEY: validators.privateKey,
      CID: validators.cidv1
    }
  }),

  submitProof: (): EnvironmentValidationOptions => ({
    required: ["UPLOAD_CID_VERIFIER"],
    validators: {
      UPLOAD_CID_VERIFIER: validators.ethereumAddress
    }
  }),

  ipfsDownload: (): EnvironmentValidationOptions => ({
    required: ["CID"],
    validators: {
      CID: validators.cidv1
    }
  }),

  cidSigning: (): EnvironmentValidationOptions => ({
    required: ["CID", "EXECUTOR_PRIVATE_KEY", "EXECUTOR"],
    validators: {
      CID: validators.cidv1,
      EXECUTOR_PRIVATE_KEY: validators.privateKey,
      EXECUTOR: validators.ethereumAddress
    }
  }),

  notarizeCid: (): EnvironmentValidationOptions => ({
    required: ["WILL_FACTORY", "EXECUTOR_PRIVATE_KEY", "CID", "EXECUTOR_SIGNATURE"],
    validators: {
      WILL_FACTORY: validators.ethereumAddress,
      EXECUTOR_PRIVATE_KEY: validators.privateKey,
      CID: validators.cidv1,
      EXECUTOR_SIGNATURE: (value: string) =>
        validators.signature(value)
    }
  }),

  createWill: (): EnvironmentValidationOptions => ({
    required: ["WILL_FACTORY", "EXECUTOR_PRIVATE_KEY", "CID", "TESTATOR", "SALT"],
    validators: {
      WILL_FACTORY: validators.ethereumAddress,
      EXECUTOR_PRIVATE_KEY: validators.privateKey,
      CID: validators.cidv1,
      TESTATOR: validators.ethereumAddress,
      SALT: validators.numericString
    },
    transforms: {
      SALT: stringToBigInt
    }
  }),

  signatureTransfer: (): EnvironmentValidationOptions => ({
    required: ["WILL", "EXECUTOR_PRIVATE_KEY", "NONCE", "DEADLINE", "PERMIT2_SIGNATURE"],
    validators: {
      WILL: validators.ethereumAddress,
      EXECUTOR_PRIVATE_KEY: validators.privateKey,
      NONCE: validators.numericString,
      DEADLINE: validators.numericString,
      PERMIT2_SIGNATURE: (value: string) =>
        validators.signature(value)
    },
    transforms: {
      NONCE: stringToBigInt,
      DEADLINE: stringToBigInt
    }
  }),
};