import { WILL_TYPE } from "./willType.js";
import { PATHS_CONFIG } from "@config";
import type { WillType } from "@shared/types/will.js";

const WILL_FILE_PATH: Record<WillType, string> = {
    [WILL_TYPE.FORMATTED]: PATHS_CONFIG.will.formatted,
    [WILL_TYPE.ADDRESSED]: PATHS_CONFIG.will.addressed,
    [WILL_TYPE.SIGNED]: PATHS_CONFIG.will.signed,
    [WILL_TYPE.ENCRYPTED]: PATHS_CONFIG.will.encrypted,
    [WILL_TYPE.DOWNLOADED]: PATHS_CONFIG.will.downloaded,
    [WILL_TYPE.DECRYPTED]: PATHS_CONFIG.will.decrypted,
};

export { WILL_FILE_PATH };