interface EnvironmentValidationOptions {
  required?: string[];
  optional?: string[];
  validators?: Record<string, (value: string) => boolean>;
  transforms?: Record<string, (value: string) => any>;
}

interface ValidationResult<T = Record<string, any>> {
  isValid: boolean;
  data: T;
  errors: string[];
}

export type { EnvironmentValidationOptions, ValidationResult };
