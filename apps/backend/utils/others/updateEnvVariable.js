import { PATHS_CONFIG } from '../../config.js';
import { readFileSync, writeFileSync } from 'fs';
import chalk from 'chalk';

/**
 * Updates an environment variable in the specified .env file
 * @param {string} envPath - Path to the .env file
 * @param {string} key - Environment variable key
 * @param {string} value - Environment variable value
 */
function updateEnvVariable(envPath, key, value) {
  try {
    let envContent = readFileSync(envPath, 'utf8');

    // Use word boundaries to match exact key names
    const regex = new RegExp(`\\b${key}\\b=.*`, 'g');

    if (regex.test(envContent)) {
      // Reset regex lastIndex and replace existing variable
      regex.lastIndex = 0;
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      // Append new variable, ensuring proper line ending
      const separator = envContent.endsWith('\n') ? '' : '\n';
      envContent += `${separator}${key}=${value}`;
    }

    writeFileSync(envPath, envContent);
  } catch (error) {
    console.error(chalk.red(`Failed to update ${key} in ${envPath}: ${error.message}`));
    throw error;
  }
}

/**
 * Generic function to update environment variables with logging
 * @param {'backend' | 'foundry'} envType - Type of environment file
 * @param {string} key - Environment variable key
 * @param {string} value - Environment variable value
 */
function updateEnvWithLogging(envType, key, value) {
  const envPath = PATHS_CONFIG.env[envType];
  
  if (!envPath) {
    throw new Error(`Unknown environment type: ${envType}`);
  }

  updateEnvVariable(envPath, key, value);
  console.log(chalk.yellow(`Updated ${key} to ${value} in ${envType} .env file.`));
}

/**
 * Updates environment variable in backend .env file
 * @param {string} key - Environment variable key
 * @param {string} value - Environment variable value
 */
export function updateBackendEnvVariable(key, value) {
  updateEnvWithLogging('backend', key, value);
}

/**
 * Updates environment variable in foundry .env file
 * @param {string} key - Environment variable key
 * @param {string} value - Environment variable value
 */
export function updateFoundryEnvVariable(key, value) {
  updateEnvWithLogging('foundry', key, value);
}

/**
 * Updates environment variable in multiple .env files
 * @param {Array<'backend' | 'foundry'>} envTypes - Array of environment types
 * @param {string} key - Environment variable key
 * @param {string} value - Environment variable value
 */
export function updateMultipleEnvVariables(envTypes, key, value) {
  envTypes.forEach(envType => {
    updateEnvWithLogging(envType, key, value);
  });
}