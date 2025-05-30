import { PATHS_CONFIG } from '../../config.js';
import { readFileSync, writeFileSync } from 'fs';
import chalk from 'chalk';

export function updateEnvVariable(key: string, value: string): void {
  const envPath = PATHS_CONFIG.env;
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
    console.log(chalk.yellow(`Updated ${key} to ${value} in .env file.`));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`Failed to update ${key} in ${envPath}: ${errorMessage}`));
    throw error;
  }
}