/* 
 * Generate ZK Proof for upload CID
 * 
 * input:
 *  - private: key in @shared/utils/cryptography/key.txt
 *  - public: ciphertext, iv in @apps/backend/will/6_encrypted.json
 * 
 * output: 
 *  - proof.json in @zkp/circuits/cidUpload/proofs/proof.json
 *  - public.json in @zkp/circuits/cidUpload/proofs/public.json
 * 
 * The proof.json proves the ciphertext in public.json contains valid permit
 * @apps/backend/src/onchain/willFactory/uploadCid.ts script will read and submit the proof on-chain
 */
