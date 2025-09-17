import {
  WitnessTester,
  byteToBit,
  hexToByte,
  splitBigInt,
  flattenEcdsaSignature,
} from "./util/index.js";
import { recoverPublicKey } from "./logic/index.js";
import { EcdsaSignature } from "./type/index.js";

describe("RecoverEcdsaPubkey Circuit", { timeout: 600_000 }, function () {
  let circuit: WitnessTester<["bitsMsghash", "signature"], ["pubkey"]>;

  describe("Public Key Recovery from Hash and Signature", function (): void {
    beforeAll(async function (): Promise<void> {
      circuit = await WitnessTester.construct(
        "circuits/shared/components/permitVerify/pubkeyRecover.circom",
        "RecoverEcdsaPubkey",
        {
          templateParams: ["64", "4"],
        },
      );
      circuit.setConstraint("recover public key from hash and signature");
    }, 900_000);

    afterAll(async function (): Promise<void> {
      if (circuit) {
        await circuit.release();
      }
    });

    it("should recover the correct public key from hash and signature for v = 27", async function (): Promise<void> {
      const testCases = [
        {
          bitsMsghash: byteToBit(
            hexToByte(
              "0x3bbbc719c9f5bb11b342bbe24efe817e51f8be9ff221c9c39db36a021b25698d",
            ),
          ),
          signature: {
            r: splitBigInt(
              102567697852014547315382042593675460197342567083159776607784644328561150954232n,
            ),
            s: splitBigInt(
              52134877877881638094793553157168048959789429635890134607058794667628919732463n,
            ),
            v: 27,
          } as EcdsaSignature,
        },
      ]
      for (const { signature, bitsMsghash } of testCases) {
        const pubkey = recoverPublicKey(signature, bitsMsghash);
        await circuit.expectPass(
          {
            signature: flattenEcdsaSignature(signature),
            bitsMsghash,
          },
          { pubkey },
        );
      }
    });

    it("should recover the correct public key from hash and signature for v = 28", async function (): Promise<void> {
      const testCases = [
        {
          bitsMsghash: byteToBit(
            hexToByte(
              "0xc60e0462fea0617384363e60c33b91cdd60571a18c044c15ddd19bcddf6c25f1",
            ),
          ),
          signature: {
            r: splitBigInt(
              61320857676114964215011206860082363943382150288464079385053365955570904757666n,
            ),
            s: splitBigInt(
              3669204771806074039460563094225368662622142448155643933869652073552707766406n,
            ),
            v: 28,
          } as EcdsaSignature,
        },
      ]
      for (const { signature, bitsMsghash } of testCases) {
        const pubkey = recoverPublicKey(signature, bitsMsghash);
        await circuit.expectPass(
          {
            signature: flattenEcdsaSignature(signature),
            bitsMsghash,
          },
          { pubkey },
        );
      }
    });
  });
});