import { Tokenizer } from "./tokenizer.js";

// Define operator precedence for parsing expressions
const OPERATOR_PRECEDENCE = {
	"OR": 1, "AND": 2, "=": 3, "!=": 3, ">": 3, "<": 3, ">=": 3, "<=": 3,
	"IN": 3, "<>": 3, "LIKE": 3, "IS": 3, "BETWEEN": 3
};

const LITERALS = ["number", "string", "null"];

// Regular expression to check for unsupported SQL patterns (like SELECT-FROM or JOIN statements)
const UNSUPPORTED_PATTERN = /\bSELECT\b.*\bFROM\b|\bINNER\s+JOIN\b/i;

export function parse(input, variables = []) {

	// Return null if the input contains unsupported SQL statements
	if (UNSUPPORTED_PATTERN.test(input)) {
		return null;
	}

	const tokenizer = new Tokenizer(input);
	let currentToken = tokenizer.nextToken();

	// // Debugging: log the tokens
	// const tokens = [];
	// let tempToken = currentToken;
	// while (tempToken) {
	//   tokens.push(tempToken);
	//   tempToken = tokenizer.peekNextToken();
	//   tokenizer.nextToken();
	// }

	// console.log("Tokens:", tokens);

	// // Reset the tokenizer
	// tokenizer.reset();
	// currentToken = tokenizer.nextToken();

	// Moves to the next token in the input
	function next() {
		currentToken = tokenizer.nextToken();
	}

	// Validate the current token
	const expectedToken = (token, expected, errorMessage) => {
		if (!token || token.value.toUpperCase() !== expected) {
			throw new Error(errorMessage);
		}
	};

	// Parse IN list of values
	function parseInList(token) {
		expectedToken(token, "(", "Expected ( after IN");

		const values = [];
		while (currentToken && currentToken.value !== ")") {
			if (currentToken.type === "comma") {
				next();
				continue;
			}
			values.push(parseValue());
		}
		expectedToken(currentToken, ")", "Expected ) after IN list");

		next(); // Consume closing parenthesis

		return { type: "value", value: values };
	}


	// Parse BETWEEN operator which requires two values separated by AND
	function parseBetweenComparison(field, operator) {
		const firstValue = parseValue();

		expectedToken(currentToken, "AND", "Expected AND after BETWEEN");

		next(); // Consume AND

		const secondValue = parseValue();

		return {
			type: "comparison",
			field,
			operator,
			value: [firstValue, secondValue] // Store both values in an array
		};
	}

	function parseFunction() {
		const funcName = currentToken.value.toUpperCase();
		next();

		expectedToken(currentToken, "(", `Expected ( after ${funcName}`);

		next();

		const args = [];
		while (currentToken && currentToken.value !== ")") {
			args.push(parseExpression());
			if (currentToken && currentToken.value === ",") next();
		}

		expectedToken(currentToken, ")", `Expected ) after ${funcName}`);

		next(); // Consume the closing parenthesis

		// Check if the next token is an operator and process it
		if (currentToken && currentToken.type === "operator") {
			const operator = currentToken.value;
			next(); // Move to the next token after the operator
			const value = parseValue(); // Parse the value after the operator

			return {
				type: "comparison",
				left: { type: "function", name: funcName, args },
				operator,
				value
			};
		}

		return { type: "function", name: funcName, args };
	}

	// Parses logical expressions using operator precedence
	function parseExpression(minPrecedence = 0) {
		let left = parseTerm();

		// Continue parsing while the current token is an operator with sufficient precedence
		while (currentToken && currentToken.type === "operator" && OPERATOR_PRECEDENCE[currentToken.value.toUpperCase()] >= minPrecedence) {
			const operator = currentToken.value.toUpperCase();
			next(); // Move to the next token

			// Recursively parse the right-hand expression with adjusted precedence
			const right = parseExpression(OPERATOR_PRECEDENCE[operator]);
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

			expectedToken(currentToken, ")", "Missing closing parenthesis");

			next();

			return expr;
		}

		// Handle function calls like ISNULL(field)
		if (currentToken.type === "function") return parseFunction();

		// Handle literal values (numbers, strings, null)
		if (LITERALS.includes(currentToken.type)) {
			const value = parseValue();
			return { type: "value", value };
		}

		// Otherwise, assume it's a field name
		const fieldType = currentToken.type;
		const field = parseValue();

		// Check if it's part of a comparison expression
		if (currentToken && currentToken.type === "operator") {
			const operator = currentToken.value.toLowerCase();
			next();

			if (operator === "between") return parseBetweenComparison(field, operator);

			// For other comparison operators, parse a single right-hand value
			const valueType = currentToken.type;
			const value = parseValue(operator);

			// Check for invalid comparisons between two identifiers
			if (fieldType === "identifier" && valueType === "identifier") {
				throw new Error(`Invalid comparison: ${field} ${operator} ${value}`);
			}

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
		if (operatorToken && operatorToken.toUpperCase() === "IN") return parseInList(token);

		throw new Error(`Unexpected value: ${token.value}`);
	}


	// Start parsing and return the AST with extracted variables
	return { ast: parseExpression(), variables };
}