// 
export const LITERALS = ["number", "string", "null"];

// Define operator precedence for parsing expressions
export const OPERATOR_PRECEDENCE = {
    "OR": 1, "AND": 2, "=": 3, "!=": 3, ">": 3, "<": 3, ">=": 3, "<=": 3,
    "IN": 3, "<>": 3, "LIKE": 3, "IS": 3, "BETWEEN": 3
};

// Regular expression to check for unsupported SQL patterns (like SELECT-FROM or JOIN statements)
export const UNSUPPORTED_PATTERN = /\bSELECT\b.*\bFROM\b|\bINNER\s+JOIN\b/i;
