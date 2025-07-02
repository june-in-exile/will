pragma circom 2.2.2;

include "circomlib/circuits/comparators.circom";
include "range.circom";

/**
 * Base64 Mapping Table：
 * A-Z: 0-25   (ASCII 65-90)
 * a-z: 26-51  (ASCII 97-122)  
 * 0-9: 52-61  (ASCII 48-57)
 * +:   62     (ASCII 43)
 * /:   63     (ASCII 47)
 * =:   64     (ASCII 61, padding)
 */
template AsciiToBase64() {
    signal input asciiCode;     // (0-127)
    signal output base64Value;  // (0-64)
    
    signal {bool} isUpperCase <== InRange(7, 65, 90)(asciiCode);    // A-Z
    signal {bool} isLowerCase <== InRange(7, 97, 122)(asciiCode);   // a-z
    signal {bool} isDigit <== InRange(7, 48, 57)(asciiCode);        // 0-9
    signal {bool} isPlus <== IsEqual()([asciiCode,43]);             // +
    signal {bool} isSlash <== IsEqual()([asciiCode,47]);            // /
    signal {bool} isPadding <== IsEqual()([asciiCode,61]);          // =

    isUpperCase + isLowerCase + isDigit + isPlus + isSlash + isPadding === 1;
    
    signal upperValue <== isUpperCase * (asciiCode - 65);       // A=0, B=1, ..., Z=25
    signal lowerValue <== isLowerCase * (asciiCode - 97 + 26);  // a=26, b=27, ..., z=51
    signal digitValue <== isDigit * (asciiCode - 48 + 52);      // 0=52, 1=53, ..., 9=61
    signal plusValue <== isPlus * 62;                           // +=62
    signal slashValue <== isSlash * 63;                         // /=63
    signal paddingValue <== isPadding * 64;                     // ==64
    
    upperValue + lowerValue + digitValue + plusValue + slashValue + paddingValue ==> base64Value;
}