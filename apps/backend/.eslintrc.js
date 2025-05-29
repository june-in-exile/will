module.exports = {
  root: true,
  env: { node: true, es2022: true },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended'
  ],
  ignorePatterns: ['dist', '.eslintrc.js'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': 'off'
  }
}
