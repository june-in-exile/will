import { WitnessTester, bigIntToByte, hexToByte } from "./util/index.js";
import { abiEncode } from "./logic/index.js";
import { Byte32 } from "./type/index.js";

const TOKEN_PERMISSIONS_TYPEHASH = hexToByte('0x618358ac3db8dc274f0cd8829da7e234bd48cd73c4a740aede1adec9846d06a1') as Byte32;
const PERMIT_BATCH_TRANSFER_FROM_TYPEHASH = hexToByte('0xfcf35f5ac6a2c28868dc44c302166470266239195f02b0ee408334829333b766') as Byte32;

describe("AbiEncode Circuit", function () {
    let circuit: WitnessTester<["values"], ["encodedValue"]>;

    describe("Abi.Encode(TOKEN_PERMISSIONS_TYPEHASH, token, amount)", function (): void {
        beforeAll(async function (): Promise<void> {
            circuit = await WitnessTester.construct(
                "circuits/shared/components/AbiEncoder/AbiEncoder.circom",
                "AbiEncode",
                {
                    templateParams: ["3"],
                },
            );
            circuit.setConstraint("abi.encode(TOKEN_PERMISSIONS_TYPEHASH, token, amount)");
        });

        afterAll(async function (): Promise<void> {
            if (circuit) {
                await circuit.release();
            }
        });

        it("should encode single token permission correctly", async function (): Promise<void> {
            const token = bigIntToByte(673548107664921955330296301951937659338232343117n, 32);
            const amount = bigIntToByte(1000n, 32);

            const values = [TOKEN_PERMISSIONS_TYPEHASH, token, amount] as Byte32[];
            const encodedValue = abiEncode(values);

            await circuit.expectPass({ values }, { encodedValue });

        });
    });

    describe("Abi.Encode(PERMIT_BATCH_TRANSFER_FROM_TYPEHASH, permissionDigest, spender, nonce, deadline)", function (): void {
        beforeAll(async function (): Promise<void> {
            circuit = await WitnessTester.construct(
                "circuits/shared/components/AbiEncoder/AbiEncoder.circom",
                "AbiEncode",
                {
                    templateParams: ["5"],
                },
            );
            circuit.setConstraint("abi.encode(PERMIT_BATCH_TRANSFER_FROM_TYPEHASH, permissionDigest, spender, nonce, deadline)");
        });

        afterAll(async function (): Promise<void> {
            if (circuit) {
                await circuit.release();
            }
        });

        it.only("should encode batch permit correctly", async function (): Promise<void> {
            const tokenPermissions = hexToByte('0x53fdab7265e432f9ca14c873ec6fa8dcbd18fdedcb42a1602cad79aa9e1b5ec9');
            const spender = bigIntToByte(732565455009656814900284710031916618803287670512n, 32);
            const nonce = bigIntToByte(139895343447235933714306105636108089805n, 32);
            const deadline = bigIntToByte(1788798363n, 32);

            const values = [PERMIT_BATCH_TRANSFER_FROM_TYPEHASH, tokenPermissions, spender, nonce, deadline] as Byte32[];
            const encodedValue = abiEncode(values);

            await circuit.expectPass({ values }, { encodedValue });
        });
    });
});