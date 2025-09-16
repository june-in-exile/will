import {
  WitnessTester,
  byteToBit,
  hexToByte,
  splitBigInt,
  flattenEcdsaSignature,
} from "./util/index.js";
import { recoverPublicKey } from "./logic/index.js";
import { EcdsaSignature } from "./type/index.js";

describe("RecoverEcdsaPubkey Circuit", { timeout: 1200_000 }, function () {
  let circuit: WitnessTester<["signature", "msghash"], ["pubkey"]>;

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

    it("should recover the correct public key from hash and signature and verify its validity", async function (): Promise<void> {
      const testCases = [
        {
          signature: {
            r: splitBigInt(
              61320857676114964215011206860082363943382150288464079385053365955570904757666n,
            ),
            s: splitBigInt(
              3669204771806074039460563094225368662622142448155643933869652073552707766406n,
            ),
            v: 28,
          } as EcdsaSignature,
          msghash: byteToBit(
            hexToByte(
              "0x5f562a366837e7590339b67641062f1de6e49f2c03acdbfe0a59739063c94069",
            ),
          ),
        },
      ];

      for (const { signature, msghash } of testCases) {
        const pubkey = recoverPublicKey(signature, msghash);
        // console.debug("pubkey:", pubkey);
        // pubkey: [
        //     [
        //         16112729477231238493n,
        //         1263491400844624069n,
        //         9397608230358965727n,
        //         13022681780633155002n
        //     ],
        //     [
        //         5088976469350123869n,
        //         14288148230842228320n,
        //         1974812706588861334n,
        //         6651912937076820324n
        //     ]
        // ]

        // console.debug("flattenedSignature:", flattenedSignature);
        // flattenedSignature: [
        //     3635388866710369698n,
        //     14150193440802270518n,
        //     10245588598309835013n,
        //     9768976234752309462n,
        //     14767552236509120646n,
        //     2966207460252010332n,
        //     18156513832857580220n,
        //     584538044225285193n,
        //     28n
        // ]
        await circuit.expectPass(
          {
            signature: flattenEcdsaSignature(signature),
            msghash,
          },
          { pubkey },
        );
      }
    });
  });
});

describe(
  "RecoverEcdsaPubkeyUnconstrainted Circuit",
  { timeout: 1200_000 },
  function () {
    let circuit: WitnessTester<["signature", "msghash"], ["pubkey"]>;

    describe("Public Key Recovery from Hash and Signature", function (): void {
      beforeAll(async function (): Promise<void> {
        circuit = await WitnessTester.construct(
          "circuits/shared/components/permitVerify/pubkeyRecover.circom",
          "RecoverEcdsaPubkeyUnconstrainted",
          {
            templateParams: ["64", "4"],
          },
        );
        circuit.setConstraint(
          "recover public key from hash and signature (unconstrainted)",
        );
      }, 900_000);

      afterAll(async function (): Promise<void> {
        if (circuit) {
          await circuit.release();
        }
      });

      it("should recover the correct public key from hash and signature and verify its validity", async function (): Promise<void> {
        const testCases = [
          {
            signature: {
              r: splitBigInt(
                61320857676114964215011206860082363943382150288464079385053365955570904757666n,
              ),
              s: splitBigInt(
                3669204771806074039460563094225368662622142448155643933869652073552707766406n,
              ),
              v: 28,
            } as EcdsaSignature,
            msghash: byteToBit(
              hexToByte(
                "0x5f562a366837e7590339b67641062f1de6e49f2c03acdbfe0a59739063c94069",
              ),
            ),
          },
        ];

        for (const { signature, msghash } of testCases) {
          const pubkey = recoverPublicKey(signature, msghash);
          // console.debug("pubkey:", pubkey);
          // pubkey: [
          //     [
          //         16112729477231238493n,
          //         1263491400844624069n,
          //         9397608230358965727n,
          //         13022681780633155002n
          //     ],
          //     [
          //         5088976469350123869n,
          //         14288148230842228320n,
          //         1974812706588861334n,
          //         6651912937076820324n
          //     ]
          // ]

          // console.debug("flattenedSignature:", flattenedSignature);
          // flattenedSignature: [
          //     3635388866710369698n,
          //     14150193440802270518n,
          //     10245588598309835013n,
          //     9768976234752309462n,
          //     14767552236509120646n,
          //     2966207460252010332n,
          //     18156513832857580220n,
          //     584538044225285193n,
          //     28n
          // ]
          await circuit.expectPass(
            {
              signature: flattenEcdsaSignature(signature),
              msghash,
            },
            { pubkey },
          );
        }
      });
    });
  },
);