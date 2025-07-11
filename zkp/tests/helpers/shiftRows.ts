import { AESTransforms } from "./aes256gcm";

function shiftRows(bytes: number[]): number[] {
    const byteBuf = Buffer.from(bytes);
    const shiftedByteBuf = AESTransforms.shiftRows(byteBuf);
    return Array.from(shiftedByteBuf);
};

export { shiftRows };