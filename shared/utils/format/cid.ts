import { CID } from "multiformats/cid";

export function validateCIDv1(cid: string): boolean {
  try {
    const parsedCID = CID.parse(cid);
    return parsedCID.version === 1;
  } catch {
    return false;
  }
}
