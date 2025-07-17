import { AESGCM } from "./aes-gcm";

function computeJ0Standard(iv: Byte12): Byte16 {
    const ivBuffer = Buffer.from(iv);
    const hashKey = Buffer.alloc(16); // This won't be used

    const j0Buffer = AESGCM.computeJ0(ivBuffer, hashKey);
    return Array.from(j0Buffer) as Byte16;
}


function computeJ0NonStandard(iv: Byte12, hashKey: Byte16): Byte16 {
    const ivBuffer = Buffer.from(iv);
    const hashKeyBuffer = Buffer.from(hashKey);

    const j0Buffer = AESGCM.computeJ0(ivBuffer, hashKeyBuffer);
    return Array.from(j0Buffer) as Byte16;
}

export { computeJ0Standard, computeJ0NonStandard };
