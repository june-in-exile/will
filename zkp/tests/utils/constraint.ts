import * as fs from 'fs';
import * as path from 'path';

interface GlobalWithConstraints {
    CONSTRAINT_RECORDS_PATH?: string;
}

function getConstraintRecordsPath(): string {
    const globalWithConstraints = globalThis as GlobalWithConstraints;
    return globalWithConstraints.CONSTRAINT_RECORDS_PATH || './constraintRecords.json';
}

const CONSTRAINT_RECORDS_PATH = getConstraintRecordsPath();

interface ConstraintRecords {
    [circuitType: string]: {
        [description: string]: number;
    };
}


function getCurrentTestFileName(): string {
    try {
        const testPath = expect.getState().testPath as string;
        const fileNameWithExt = path.basename(testPath);
        return fileNameWithExt.replace(/\.test\.ts$/, "");
    } catch {
        return "unknown";
    }
}

/**
 * Record constraint count for a specific circuit and description
 * @param circuitType - The type of circuit
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
 * @param description - Description of the constraint test
 * @param circuitType - The type of circuit
 * @returns The recorded constraint count or null if not found
 */
function getRecordedConstraint(
    description: string,
    circuitType?: string
): number | null {
    if (!fs.existsSync(CONSTRAINT_RECORDS_PATH)) {
        return null;
    }

    const actualCircuitType = circuitType || getCurrentTestFileName();

    try {
        const data = fs.readFileSync(CONSTRAINT_RECORDS_PATH, 'utf8');
        const records: ConstraintRecords = JSON.parse(data);

        return records[actualCircuitType]?.[description] || null;
    } catch (error) {
        console.warn(`Warning: Could not read constraint records: ${error}`);
        return null;
    }
}

/**
 * Helper function to be used in beforeAll blocks (with explicit circuit type)
 * @param circuit - The circuit instance with getConstraintCount method
 * @param description - Description of the constraint test
 * @param circuitType - The type of circuit
 */
async function recordCircuitConstraints(
    circuit: { getConstraintCount(): Promise<number> },
    description: string,
    circuitType?: string
): Promise<void> {
    const constraintCount = await circuit.getConstraintCount();
    const actualCircuitType = circuitType || getCurrentTestFileName();
    console.info(description, constraintCount);
    recordConstraint(actualCircuitType, description, constraintCount);
}

export { getRecordedConstraint, recordCircuitConstraints }