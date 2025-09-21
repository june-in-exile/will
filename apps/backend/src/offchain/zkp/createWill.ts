/* 
 * Generate ZK Proof for create Will
 * 
 * input:
 *  - private: key in @shared/utils/cryptography/key.txt
 *  - public: ciphertext, iv in @apps/backend/will/7_downloaded.json, testator, estates in @apps/backend/will/9_deserialized.json
 * 
 * output: 
 *  - proof.json in @zkp/circuits/willCreation/proofs/proof.json
 *  - public.json in @zkp/circuits/willCreation/proofs/public.json
 * 
 * The proof.json proves the testator and estates come from ciphertext. All three parameters are revealed in public.json
 * @apps/backend/src/onchain/willFactory/createWill.ts script will read and submit the proof on-chain
 */
