import { CID } from "multiformats/cid";

function validateCidv1(cid: string): boolean {
  try {
    const parsedCID = CID.parse(cid);
    return parsedCID.version === 1;
  } catch {
    return false;
  }
}

export { validateCidv1 };