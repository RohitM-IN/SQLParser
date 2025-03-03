import { Tokenizer } from "./tokenizer.js";

// Define operator precedence for parsing expressions
const precedence = {
  "OR": 1, "AND": 2, "=": 3, "!=": 3, ">": 3, "<": 3, ">=": 3, "<=": 3,
  "IN": 3, "<>": 3, "LIKE": 3, "IS": 3, "BETWEEN": 3
};

// Regular expression to check for unsupported SQL patterns (like SELECT-FROM or JOIN statements)
const unsupportedPattern = /\bSELECT\b.*\bFROM\b|\bINNER\s+JOIN\b/i;

export function parse(input, variables = []) {

  // Return null if the input contains unsupported SQL statements
  if (unsupportedPattern.test(input)) {
    return null;
  }

  const tokenizer = new Tokenizer(input);
  let currentToken = tokenizer.nextToken();

  // Moves to the next token in the input
  function next() {
    currentToken = tokenizer.nextToken();
  }

  // Parses logical expressions using operator precedence
  function parseExpression(minPrecedence = 0) {
    let left = parseTerm();

    // Continue parsing while the current token is an operator with sufficient precedence
    while (currentToken && currentToken.type === "operator" && precedence[currentToken.value.toUpperCase()] >= minPrecedence) {
      const operator = currentToken.value.toUpperCase();
      next(); // Move to the next token

      // Recursively parse the right-hand expression with adjusted precedence
      const right = parseExpression(precedence[operator]);
      left = { type: "logical", operator, left, right };
    }

    return left;
  }

  // Parses individual terms, including literals, functions, and comparisons
  function parseTerm() {
    if (!currentToken) throw new Error("Unexpected end of input");

    // Handle parenthesized expressions
    if (currentToken.type === "paren" && currentToken.value === "(") {
      next();
      const expr = parseExpression();
      if (!currentToken || currentToken.value !== ")") throw new Error("Missing closing parenthesis");
      next();
      return expr;
    }

    // Handle function calls like ISNULL(field)
    if (currentToken.type === "function") {
      const funcName = currentToken.value.toUpperCase();
      next();
      if (!currentToken || currentToken.value !== "(") throw new Error(`Expected ( after ${funcName}`);
      next();

      const args = [];
      while (currentToken && currentToken.value !== ")") {
        args.push(parseExpression());
        if (currentToken && currentToken.value === ",") next();
      }

      next(); // Consume the closing parenthesis
      return { type: "function", name: funcName, args };
    }

    // Handle literal values (numbers, strings, null)
    if (["number", "string", "null"].includes(currentToken.type)) {
      const value = parseValue();
      return { type: "value", value };
    }

    // Otherwise, assume it's a field name
    const field = parseValue();

    // Check if it's part of a comparison expression
    if (currentToken && currentToken.type === "operator") {
      const operator = currentToken.value.toLowerCase();
      next();

      if (operator === "between") {
        // Parse BETWEEN operator which requires two values separated by AND
        const firstValue = parseValue();

        if (!currentToken || currentToken.value.toUpperCase() !== "AND") {
          throw new Error("Expected AND after BETWEEN");
        }
        next(); // Consume AND

        const secondValue = parseValue();

        return {
          type: "comparison",
          field,
          operator,
          value: [firstValue, secondValue] // Store both values in an array
        };
      }

      // For other comparison operators, parse a single right-hand value
      const value = parseValue(operator);
      return { type: "comparison", field, operator, value };
    }

    return { type: "field", value: field };
  }

  // Parses values including numbers, strings, placeholders, and IN lists
  function parseValue(operatorToken) {
    if (!currentToken) throw new Error("Unexpected end of input");

    const token = currentToken;
    next(); // Move to the next token

    if (token.type === "number") return Number(token.value);
    if (token.type === "string") return token.value.slice(1, -1).replace(/''/g, "");
    if (token.type === "identifier") return token.value;
    if (token.type === "null") return null;

    // Handle placeholders like `{VariableName}`
    if (token.type === "placeholder") {
      const val = token.value.slice(1, -1);
      if (!variables.includes(val)) variables.push(val);
      return { type: "placeholder", value: val };
    }

    // Handle IN operator which requires a list of values
    if (operatorToken && operatorToken.toUpperCase() === "IN") {
      if (!token || token.value !== "(") throw new Error("Expected ( after IN");

      const values = [];
      while (currentToken && currentToken.value !== ")") {
        if (currentToken.type === "comma") {
          next();
          continue;
        }
        values.push(parseValue());
      }

      if (currentToken && currentToken.value === ")") next(); // Consume closing parenthesis
      return { type: "value", value: values };
    }

    throw new Error(`Unexpected value: ${token.value}`);
  }

  // Start parsing and return the AST with extracted variables
  return { ast: parseExpression(), variables };
}