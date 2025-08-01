// ========== Encoding ==========
const UTF8 = "utf8";
const ASCII = "ascii";
const BASE64 = "base64";
const HEX = "hex";

// ========== Cryptography ==========
const AES_256_GCM = "aes-256-gcm";
const CHACHA20_POLY1305 = "chacha20-poly1305";

// ========== Blockchain ==========
const ETHEREUM_CHAIN_ID = BigInt(1);
const ETHEREUM_USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const ETHEREUM_LINK = "0x514910771AF9Ca656af840dff83E8264EcF986CA";

const ARB_SEPOLIA_CHAIN_ID = BigInt(421614);

const ARB_SEPOLIA_USDC = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";
const ARB_SEPOLIA_LINK = "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E";

const ANVIL_RPC_URL = "http://127.0.0.1:8545";
const ANVIL_CHAIN_ID = BigInt(31337);

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

export {
  UTF8,
  ASCII,
  BASE64,
  HEX,
  AES_256_GCM,
  CHACHA20_POLY1305,
  ETHEREUM_CHAIN_ID,
  ETHEREUM_USDC,
  ETHEREUM_LINK,
  ARB_SEPOLIA_CHAIN_ID,
  ARB_SEPOLIA_USDC,
  ARB_SEPOLIA_LINK,
  ANVIL_RPC_URL,
  ANVIL_CHAIN_ID,
  ERC20_ABI,
};
