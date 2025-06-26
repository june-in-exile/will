export type Base64String = string & { readonly __brand: 'Base64String' };

export const Base64String = {
    /**
     * Check if a string is valid base64 format
     * @param str - String to validate
     * @returns true if valid base64, false otherwise
     */
    isValid: (str: string): boolean => {
        // Check basic format - only valid base64 characters
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(str)) {
            return false;
        }

        // Check length is multiple of 4
        if (str.length % 4 !== 0) {
            return false;
        }

        // Additional validation: try decode/encode cycle
        try {
            const decoded = Buffer.from(str, 'base64');
            const reencoded = decoded.toString('base64');
            return reencoded === str;
        } catch {
            return false;
        }
    },

    /**
     * Create Base64String from a regular string with validation
     * @param str - String to convert
     * @returns Base64String if valid
     * @throws Error if invalid base64 format
     */
    fromString: (str: string): Base64String => {
        if (!Base64String.isValid(str)) {
            throw new Error(`Invalid base64 string: "${str}"`);
        }
        return str as Base64String;
    },

    /**
     * Create Base64String from Buffer
     * @param buffer - Buffer to encode
     * @returns Base64String
     */
    fromBuffer: (buffer: Buffer): Base64String =>
        buffer.toString('base64') as Base64String,

    /**
     * Create Base64String from UTF-8 string
     * @param str - UTF-8 string to encode
     * @returns Base64String
     */
    fromUtf8: (str: string): Base64String =>
        Buffer.from(str, 'utf8').toString('base64') as Base64String,

    /**
     * Convert Base64String to Buffer
     * @param base64 - Base64String to decode
     * @returns Buffer
     */
    toBuffer: (base64: Base64String): Buffer =>
        Buffer.from(base64, 'base64'),

    /**
     * Convert Base64String to UTF-8 string
     * @param base64 - Base64String to decode
     * @returns UTF-8 string
     */
    toUtf8: (base64: Base64String): string =>
        Buffer.from(base64, 'base64').toString('utf8'),

    /**
     * Safely create Base64String with detailed error information
     * @param str - String to validate and convert
     * @returns Object with success status and result or error
     */
    safeParse: (str: string):
        | { success: true; data: Base64String }
        | { success: false; error: string } => {
        try {
            const result = Base64String.fromString(str);
            return { success: true, data: result };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: message };
        }
    },

    /**
     * Detect if string is likely base64 or UTF-8
     * @param str - String to analyze
     * @returns 'base64', 'utf8', or 'unknown'
     */
    detectEncoding: (str: string): 'base64' | 'utf8' | 'unknown' => {
        // Check if valid base64
        if (Base64String.isValid(str)) {
            return 'base64';
        }

        // Check if printable UTF-8
        try {
            const encoded = Buffer.from(str, 'utf8').toString('utf8');
            if (encoded === str && /^[\x20-\x7E\s]*$/.test(str)) {
                return 'utf8';
            }
        } catch {
            // ignore
        }

        return 'unknown';
    },

    /**
     * Smart creation - auto-detect and convert if needed
     * @param str - Input string
     * @returns Object with Base64String and conversion info
     */
    smartCreate: (str: string): {
        result: Base64String;
        wasConverted: boolean;
        originalEncoding: 'base64' | 'utf8' | 'unknown'
    } => {
        const encoding = Base64String.detectEncoding(str);

        switch (encoding) {
            case 'base64':
                return {
                    result: str as Base64String,
                    wasConverted: false,
                    originalEncoding: 'base64'
                };

            case 'utf8':
                return {
                    result: Base64String.fromUtf8(str),
                    wasConverted: true,
                    originalEncoding: 'utf8'
                };

            default:
                throw new Error(`Cannot convert string to Base64: "${str}" (encoding: ${encoding})`);
        }
    }
};