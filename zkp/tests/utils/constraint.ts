import * as fs from 'fs';
import * as path from 'path';

// Configuration
const CONSTRAINT_RECORDS_PATH = path.join(__dirname, '../../constraintRecords.json');

interface ConstraintRecords {
    [circuitType: string]: {
        [description: string]: number;
    };
}

/**
 * Initialize constraint records file with default structure
 */
function initializeConstraintRecords(): void {
    const defaultRecords: ConstraintRecords = {
        arithmetic: {},
        base64: {},
        bits: {},
        byteSubstitution: {},
        columnMixing: {},
        counterIncrement: {},
        ctrEncrypt: {},
        encryptBlock: {},
        galoisField: {},
        gcmEncrypt: {},
        j0Computation: {},
        keyExpansion: {},
        multiplier2: {},
        range: {},
        roundKeyAddition: {},
        rowShifting: {},
        utf8: {},
    };

    if (!fs.existsSync(CONSTRAINT_RECORDS_PATH)) {
        fs.writeFileSync(CONSTRAINT_RECORDS_PATH, JSON.stringify(defaultRecords, null, 2));
        console.log(`✅ Initialized constraint records file: ${CONSTRAINT_RECORDS_PATH}`);
    }
}

/**
 * Record constraint count for a specific circuit and description
 * @param circuitType - The type of circuit (e.g., 'gcmEncrypt', 'ctrEncrypt')
 * @param description - Description of the constraint test
 * @param constraintCount - The actual constraint count
 */
function recordConstraint(
    circuitType: string,
    description: string,
    constraintCount: number
): void {
    let records: ConstraintRecords = {};

    // Load existing records if file exists
    if (fs.existsSync(CONSTRAINT_RECORDS_PATH)) {
        try {
            const data = fs.readFileSync(CONSTRAINT_RECORDS_PATH, 'utf8');
            records = JSON.parse(data);
        } catch (error) {
            console.warn(`Warning: Could not parse existing constraint records: ${error}`);
            records = {};
        }
    }

    // Initialize circuit type if it doesn't exist
    if (!records[circuitType]) {
        records[circuitType] = {};
    }

    // Update the constraint count
    records[circuitType][description] = constraintCount;

    // Write back to file with pretty formatting
    try {
        fs.writeFileSync(CONSTRAINT_RECORDS_PATH, JSON.stringify(records, null, 2));
        console.log(`📊 Recorded constraint: ${circuitType} - ${description}: ${constraintCount}`);
    } catch (error) {
        console.error(`Error writing constraint records: ${error}`);
    }
}

/**
 * Get constraint count for a specific circuit and description
 * @param circuitType - The type of circuit
 * @param description - Description of the constraint test
 * @returns The recorded constraint count or null if not found
 */
function getRecordedConstraint(
    circuitType: string,
    description: string
): number | null {
    if (!fs.existsSync(CONSTRAINT_RECORDS_PATH)) {
        return null;
    }

    try {
        const data = fs.readFileSync(CONSTRAINT_RECORDS_PATH, 'utf8');
        const records: ConstraintRecords = JSON.parse(data);

        return records[circuitType]?.[description] || null;
    } catch (error) {
        console.warn(`Warning: Could not read constraint records: ${error}`);
        return null;
    }
}

/**
 * Helper function to be used in beforeAll blocks
 * @param circuit - The circuit instance with getConstraintCount method
 * @param circuitType - The type of circuit
 * @param description - Description of the constraint test
 */
async function recordCircuitConstraints(
    circuit: { getConstraintCount(): Promise<number> },
    circuitType: string,
    description: string
): Promise<void> {
    const constraintCount = await circuit.getConstraintCount();
    console.info(description, constraintCount);
    recordConstraint(circuitType, description, constraintCount);
}

export { initializeConstraintRecords, recordConstraint, getRecordedConstraint, recordCircuitConstraints }