import { AESKeyExpansion } from "./aes256gcm";
import { Word } from "../types";

function expandKey(key: Word[]): Word[] { 
    const keyBytes = Buffer.concat(key.map(keyWord => Buffer.from(keyWord.bytes)));

    const expandedKey = AESKeyExpansion.expandKey(keyBytes);

    return expandedKey.map(buf => ({ bytes: [buf[0], buf[1], buf[2], buf[3]] }));
}

export { expandKey };