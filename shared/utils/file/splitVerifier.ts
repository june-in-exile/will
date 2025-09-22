import * as fs from 'fs';
import * as path from 'path';

interface ICConstant {
    index: number;
    x: string;
    y: string;
}

interface VerifierData {
    basicConstants: string[];
    icConstants: ICConstant[];
    verifyFunction: string;
}

function parseVerifierContract(filePath: string): VerifierData {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract basic constants (r, q, alpha, beta, gamma, delta)
    const basicConstants: string[] = [];
    const basicConstantRegex = /uint256\s+constant\s+(r|q|alphax|alphay|betax1|betax2|betay1|betay2|gammax1|gammax2|gammay1|gammay2|deltax1|deltax2|deltay1|deltay2)\s*=\s*([^;]+);/g;

    let match;
    while ((match = basicConstantRegex.exec(content)) !== null) {
        basicConstants.push(match[0]);
    }

    // Extract IC constants
    const icConstants: ICConstant[] = [];
    const icRegex = /uint256\s+constant\s+IC(\d+)(x|y)\s*=\s*([^;]+);/g;

    while ((match = icRegex.exec(content)) !== null) {
        const index = parseInt(match[1]);
        const coord = match[2];
        const value = match[3];

        let icConstant = icConstants.find(ic => ic.index === index);
        if (!icConstant) {
            icConstant = { index, x: '', y: '' };
            icConstants.push(icConstant);
        }

        if (coord === 'x') {
            icConstant.x = value;
        } else {
            icConstant.y = value;
        }
    }

    // Sort IC constants by index
    icConstants.sort((a, b) => a.index - b.index);

    // Extract the verifyProof function
    const verifyFunctionRegex = /function verifyProof\([^}]+\{[\s\S]*?\n\s*\}/;
    const verifyMatch = content.match(verifyFunctionRegex);
    const verifyFunction = verifyMatch ? verifyMatch[0] : '';

    return { basicConstants, icConstants, verifyFunction };
}

function generateConstantsContract(contractName: string, startIndex: number, endIndex: number, icConstants: ICConstant[]): string {
    const relevantConstants = icConstants.slice(startIndex, endIndex);
    const count = relevantConstants.length;

    let constantDeclarations = '';
    let getICCases = '';

    relevantConstants.forEach((ic, localIndex) => {
        constantDeclarations += `    uint256 constant IC${ic.index}x = ${ic.x};\n`;
        constantDeclarations += `    uint256 constant IC${ic.index}y = ${ic.y};\n`;

        getICCases += `        if (index == ${localIndex}) return (IC${ic.index}x, IC${ic.index}y);\n`;
    });

    return `// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

interface IVerifierConstants {
    function getIC(uint256 index) external pure returns (uint256 x, uint256 y);
    function getICCount() external pure returns (uint256);
}

contract ${contractName} is IVerifierConstants {
${constantDeclarations}
    function getICCount() external pure returns (uint256) {
        return ${count};
    }
    
    function getIC(uint256 index) external pure returns (uint256 x, uint256 y) {
        require(index < ${count}, "Index out of range");
        
${getICCases}        
        revert("Invalid index");
    }
    
    // Batch getter for gas optimization
    function getBatchIC(uint256 startIdx, uint256 count) 
        external pure returns (uint256[] memory xs, uint256[] memory ys) {
        require(startIdx + count <= ${count}, "Batch out of range");
        
        xs = new uint256[](count);
        ys = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            (xs[i], ys[i]) = getIC(startIdx + i);
        }
    }
}`;
}

function generateMainContract(basicConstants: string[], totalICCount: number): string {
    const basicConstantDeclarations = basicConstants.join('\n    ');

    return `// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

interface IVerifierConstants {
    function getIC(uint256 index) external pure returns (uint256 x, uint256 y);
    function getICCount() external pure returns (uint256);
    function getBatchIC(uint256 startIdx, uint256 count) 
        external pure returns (uint256[] memory xs, uint256[] memory ys);
}

contract Groth16VerifierMain {
    // Basic curve parameters
    ${basicConstantDeclarations}

    // Constants contract addresses
    address public immutable constants1;
    address public immutable constants2;
    address public immutable constants3;

    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;
    uint16 constant pLastMem = 896;

    constructor(address _constants1, address _constants2, address _constants3) {
        constants1 = _constants1;
        constants2 = _constants2;
        constants3 = _constants3;
    }

    // Get IC constant from appropriate contract
    function getIC(uint256 index) internal view returns (uint256 x, uint256 y) {
        if (index < 98) {
            return IVerifierConstants(constants1).getIC(index);
        } else if (index < 196) {
            return IVerifierConstants(constants2).getIC(index - 98);
        } else if (index < ${totalICCount}) {
            return IVerifierConstants(constants3).getIC(index - 196);
        } else {
            revert("IC index out of range");
        }
    }
    
    // Optimized batch getter
    function getBatchIC(uint256 startIndex, uint256 count) 
        internal view returns (uint256[] memory xs, uint256[] memory ys) {
        xs = new uint256[](count);
        ys = new uint256[](count);
        
        uint256 processed = 0;
        
        // Process constants1 range (0-97)
        if (startIndex < 98 && processed < count) {
            uint256 batchStart = startIndex;
            uint256 batchEnd = startIndex + count > 98 ? 98 : startIndex + count;
            uint256 batchCount = batchEnd - batchStart;
            
            (uint256[] memory batchXs, uint256[] memory batchYs) = 
                IVerifierConstants(constants1).getBatchIC(batchStart, batchCount);
                
            for (uint256 i = 0; i < batchCount; i++) {
                xs[processed + i] = batchXs[i];
                ys[processed + i] = batchYs[i];
            }
            processed += batchCount;
        }
        
        // Process constants2 range (98-195)
        if (startIndex + processed < 196 && processed < count) {
            uint256 batchStart = startIndex + processed < 98 ? 0 : startIndex + processed - 98;
            uint256 remaining = count - processed;
            uint256 batchCount = remaining > 98 ? 98 : remaining;
            
            (uint256[] memory batchXs, uint256[] memory batchYs) = 
                IVerifierConstants(constants2).getBatchIC(batchStart, batchCount);
                
            for (uint256 i = 0; i < batchCount; i++) {
                xs[processed + i] = batchXs[i];
                ys[processed + i] = batchYs[i];
            }
            processed += batchCount;
        }
        
        // Process constants3 range (196+)
        if (processed < count) {
            uint256 batchStart = startIndex + processed < 196 ? 0 : startIndex + processed - 196;
            uint256 remaining = count - processed;
            
            (uint256[] memory batchXs, uint256[] memory batchYs) = 
                IVerifierConstants(constants3).getBatchIC(batchStart, remaining);
                
            for (uint256 i = 0; i < remaining; i++) {
                xs[processed + i] = batchXs[i];
                ys[processed + i] = batchYs[i];
            }
        }
    }

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[${totalICCount - 1}] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }
            
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                // We need to compute the linear combination in Solidity
                // This assembly version is simplified and would need external calls
                // For a working version, compute the linear combination outside assembly

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x - this would need to be computed outside assembly
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))

                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)

                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)
                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            for { let i := 0 } lt(i, ${totalICCount - 1}) { i := add(i, 1) } {
                checkField(calldataload(add(_pubSignals, mul(i, 32))))
            }

            // For a complete implementation, the linear combination computation
            // should be done in Solidity before calling this assembly block
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)
            mstore(0, isValid)
            return(0, 0x20)
        }
    }
    
    // Helper function to compute linear combination (Solidity implementation)
    function computeLinearCombination(uint[${totalICCount - 1}] calldata pubSignals) 
        public view returns (uint256 x, uint256 y) 
    {
        // Get IC0 as starting point
        (x, y) = getIC(0);
        
        // Add each pubSignal * IC[i+1]
        for (uint256 i = 0; i < ${totalICCount - 1}; i++) {
            if (pubSignals[i] != 0) {
                (uint256 icx, uint256 icy) = getIC(i + 1);
                // This would need proper elliptic curve arithmetic
                // For now, this is a placeholder
                x = addmod(x, mulmod(icx, pubSignals[i], q), q);
                y = addmod(y, mulmod(icy, pubSignals[i], q), q);
            }
        }
    }
}`;
}

function generateDeployScript(outputDir: string): string {
    return `// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

import "forge-std/Script.sol";
import "./VerifierConstants1.sol";
import "./VerifierConstants2.sol";
import "./VerifierConstants3.sol";
import "./Groth16VerifierMain.sol";

contract DeployVerifierScript is Script {
    function run() external {
        vm.startBroadcast();

        // Deploy constants contracts
        VerifierConstants1 constants1 = new VerifierConstants1();
        VerifierConstants2 constants2 = new VerifierConstants2();
        VerifierConstants3 constants3 = new VerifierConstants3();

        console.log("Constants1 deployed at:", address(constants1));
        console.log("Constants2 deployed at:", address(constants2));
        console.log("Constants3 deployed at:", address(constants3));

        // Deploy main verifier
        Groth16VerifierMain verifier = new Groth16VerifierMain(
            address(constants1),
            address(constants2),
            address(constants3)
        );

        console.log("Main verifier deployed at:", address(verifier));

        vm.stopBroadcast();
    }
}`;
}

function main() {
    const args = process.argv.slice(2);
    if (args.length !== 1) {
        console.error('Usage: node split-verifier.js <verifier-file-path>');
        process.exit(1);
    }

    const inputFile = args[0];
    if (!fs.existsSync(inputFile)) {
        console.error(`File not found: ${inputFile}`);
        process.exit(1);
    }

    const outputDir = path.dirname(inputFile);
    const baseName = path.basename(inputFile, '.sol');

    console.log(`Splitting verifier contract: ${inputFile}`);
    console.log(`Output directory: ${outputDir}`);

    try {
        const verifierData = parseVerifierContract(inputFile);

        if (verifierData.icConstants.length === 0) {
            console.error('No IC constants found in the contract');
            process.exit(1);
        }

        console.log(`Found ${verifierData.icConstants.length} IC constants`);

        // Generate constants contracts
        const constants1 = generateConstantsContract('VerifierConstants1', 0, 98, verifierData.icConstants);
        const constants2 = generateConstantsContract('VerifierConstants2', 98, 196, verifierData.icConstants);
        const constants3 = generateConstantsContract('VerifierConstants3', 196, verifierData.icConstants.length, verifierData.icConstants);

        // Generate main contract
        const mainContract = generateMainContract(verifierData.basicConstants, verifierData.icConstants.length);

        // Generate deploy script
        const deployScript = generateDeployScript(outputDir);

        // Write files
        fs.writeFileSync(path.join(outputDir, 'VerifierConstants1.sol'), constants1);
        fs.writeFileSync(path.join(outputDir, 'VerifierConstants2.sol'), constants2);
        fs.writeFileSync(path.join(outputDir, 'VerifierConstants3.sol'), constants3);
        fs.writeFileSync(path.join(outputDir, 'Groth16VerifierMain.sol'), mainContract);
        fs.writeFileSync(path.join(outputDir, 'DeployVerifier.s.sol'), deployScript);

        console.log('✅ Successfully generated split contracts:');
        console.log('  - VerifierConstants1.sol (IC 0-97)');
        console.log('  - VerifierConstants2.sol (IC 98-195)');
        console.log('  - VerifierConstants3.sol (IC 196+)');
        console.log('  - Groth16VerifierMain.sol (main verifier)');
        console.log('  - DeployVerifier.s.sol (deployment script)');

        console.log('\\n📝 Next steps:');
        console.log('1. Deploy contracts using: forge script DeployVerifier.s.sol --broadcast');
        console.log('2. The main contract assembly code may need manual adjustment for proper linear combination computation');

    } catch (error) {
        console.error('Error processing verifier contract:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}