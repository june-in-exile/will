pragma circom 2.0.0;

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
template Base64CharToValue() {
    signal input char;    // ASCII Code (0-127)
    signal output value;  // Base64 Value (0-64)
    
    signal isUpperCase;   // A-Z
    signal isLowerCase;   // a-z
    signal isDigit;       // 0-9
    signal isPlus;        // +
    signal isSlash;       // /
    signal isPadding;     // =
    
    component upperCheck = InRange(7, 65, 90);   // A-Z
    component lowerCheck = InRange(7, 97, 122);  // a-z  
    component digitCheck = InRange(7, 48, 57);   // 0-9
    component plusCheck = IsEqual();          // +
    component slashCheck = IsEqual();         // /
    component paddingCheck = IsEqual();       // =
    
    upperCheck.in <== char;
    lowerCheck.in <== char;
    digitCheck.in <== char;
    
    plusCheck.in[0] <== char;
    plusCheck.in[1] <== 43;  // ASCII for '+'
    
    slashCheck.in[0] <== char;
    slashCheck.in[1] <== 47;  // ASCII for '/'
    
    paddingCheck.in[0] <== char;
    paddingCheck.in[1] <== 61;  // ASCII for '='
    
    isUpperCase <== upperCheck.out;
    isLowerCase <== lowerCheck.out;
    isDigit <== digitCheck.out;
    isPlus <== plusCheck.out;
    isSlash <== slashCheck.out;
    isPadding <== paddingCheck.out;
    
    signal isValidChar;
    isValidChar <== isUpperCase + isLowerCase + isDigit + isPlus + isSlash + isPadding;
    isValidChar === 1;
    
    signal upperValue;    // A-Z -> 0-25
    signal lowerValue;    // a-z -> 26-51
    signal digitValue;    // 0-9 -> 52-61
    signal plusValue;     // + -> 62
    signal slashValue;    // / -> 63
    signal paddingValue;  // = -> 64
    
    upperValue <== isUpperCase * (char - 65);        // A=0, B=1, ..., Z=25
    lowerValue <== isLowerCase * (char - 97 + 26);   // a=26, b=27, ..., z=51
    digitValue <== isDigit * (char - 48 + 52);       // 0=52, 1=53, ..., 9=61
    plusValue <== isPlus * 62;
    slashValue <== isSlash * 63;
    paddingValue <== isPadding * 64;
    
    value <== upperValue + lowerValue + digitValue + plusValue + slashValue + paddingValue;
}

component main = Base64CharToValue();