import { createHelia } from 'helia';
import { json } from '@helia/json';
import { CID } from 'multiformats/cid';
import { getDecryptionKey, decrypt } from '../utils/crypto/decrypt.js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { config } from 'dotenv';
import chalk from 'chalk';

const modulePath = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(modulePath, '../.env') });

const decryptedTestamentPath = resolve(modulePath, '../testament/6_decrypted.json'); 

function decryptJson(downloaded) {
    const authTag = downloaded.authTag;
    const ciphertext = downloaded.ciphertext;
    const algorithm = process.env.ALGORITHM;
    const iv = downloaded.iv;
    const encryptionKey = getDecryptionKey();

    console.info("Decrypting...");
    const plaintext = decrypt(ciphertext, algorithm, encryptionKey, iv, authTag);
    console.info(chalk.green(`Testament downloaded and decrypted.`));
    writeFileSync(decryptedTestamentPath, plaintext);
    console.log("Decrypted testament saved to:", decryptedTestamentPath);
};

async function test() {
    console.info("Downloading...");
    const encryptedTestamentPath = resolve(modulePath, '../testament/5_encrypted.json'); 
    const encryptedTestament = readFileSync(encryptedTestamentPath, 'utf8');

    const encryptedTestamentJson = JSON.parse(encryptedTestament);
    decryptJson(encryptedTestamentJson);
};

async function main() {
    const helia = await createHelia();
    const j = json(helia);

    const cid = CID.parse(process.env.CID);
    console.info("CID:", cid.toString());

    console.info("Downloading...");
    const encryptedTestamentJson = await j.get(cid);

    decryptJson(encryptedTestamentJson);
}

// test().catch(error => console.error("Error in main:", error));
main().catch(error => console.error("Error in main:", error));