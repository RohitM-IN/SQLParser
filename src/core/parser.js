import { LITERALS, LOGICAL_OPERATORS, OPERATOR_PRECEDENCE, UNSUPPORTED_PATTERN } from "../constants.js";
import { Tokenizer } from "./tokenizer.js";


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
	// 	tokens.push(tempToken);
	// 	tempToken = tokenizer.peekNextToken();
	// 	tokenizer.nextToken();
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
		const functionName = currentToken.value.toUpperCase();
		next();

		expectedToken(currentToken, "(", `Expected ( after ${functionName}`);

		next();

		const functionArgs = [];
		while (currentToken && currentToken.value !== ")") {
			functionArgs.push(parseExpression());
			if (currentToken && currentToken.value === ",") next();
		}

		expectedToken(currentToken, ")", `Expected ) after ${functionName}`);

		next(); // Consume the closing parenthesis

		// Check if the next token is an operator and process it
		if (currentToken && currentToken.type === "operator") {
			const operator = currentToken.value;
			next(); // Move to the next token after the operator
			const rightOperand = parseValue(); // Parse the value after the operator
			const nodeType = LOGICAL_OPERATORS.includes(operator.toLowerCase()) ? "logical" : "comparison";

			if (nodeType === "logical") {
				return { type: "logical", operator, left: { type: "function", name: functionName, args: functionArgs }, right: rightOperand };
			}

			return {
				type: "comparison",
				left: { type: "function", name: functionName, args: functionArgs },
				operator,
				value: rightOperand
			};
		}

		return { type: "function", name: functionName, args: functionArgs };
	}

	// Parses logical expressions using operator precedence
	function parseExpression(minPrecedence = 0) {
		let left = parseTerm();

		// Continue parsing while the current token is an operator with sufficient precedence
		while (currentToken && currentToken.type === "operator" && OPERATOR_PRECEDENCE[currentToken.value.toUpperCase()] >= minPrecedence) {
			const operator = currentToken.value.toUpperCase();
			next(); // Move to the next token

			if (operator === "IN" || operator === "NOT IN") {
				const rightList = parseValue(operator);
				left = {
					type: "comparison",
					field: left,
					operator: operator,
					value: rightList
				};
			}

			if (LOGICAL_OPERATORS.includes(operator.toLowerCase())) {
				// Recursively parse the right-hand expression with adjusted precedence
				const right = parseExpression(OPERATOR_PRECEDENCE[operator]);
				left = { type: "logical", operator, left, right };
			} else if (currentToken?.type == "identifier") {
				const right = parseValue(operator);
				let newOperator = inverseOperator(operator);

				left = {
					type: "comparison",
					right: left,
					operator: newOperator,
					left: { type: "field", value: right }
				};
			}
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
			const originalOperator = currentToken.originalValue;
			next();

			if (operator === "between") return parseBetweenComparison(field, operator);

			if (currentToken.type === "function") {
				const functionNode = parseFunction();

				if (fieldType === "identifier" && functionNode.type === "function") {
					return {
						type: "comparison",
						field,
						operator,
						value: functionNode,
						originalOperator
					}
				}

				// Wrap the function inside a comparison if it's directly after an operator
				const leftComparison = {
					type: "comparison",
					field,
					operator,
					value: functionNode.left,
					originalOperator
				};

				functionNode.left = leftComparison;
				return functionNode;
			}

			// For other comparison operators, parse a single right-hand value
			const valueType = currentToken.type;
			const value = parseValue(operator);

			// Check for invalid comparisons between two identifiers
			if (fieldType === "identifier" && valueType === "identifier") {
				throw new Error(`Invalid comparison: ${field} ${operator} ${value}`);
			}

			// Swap the field and value if the field is a placeholder and the value is an identifier
			if (valueType == "identifier" && fieldType == "placeholder") {
				let newOperator = inverseOperator(operator);
				return { type: "comparison", value: field, operator: newOperator, field: value, originalOperator };
			}

			return { type: "comparison", field, operator, value, originalOperator };
		}

		return { type: "field", value: field };
	}

	function inverseOperator(operator) {
		switch (operator.toUpperCase()) {
			case ">": return "<";
			case "<": return ">";
			case ">=": return "<=";
			case "<=": return ">=";
			default: return operator; // Return the operator as is if no inverse is defined
		}
	}

	// Parses values including numbers, strings, placeholders, and IN lists
	function parseValue(operatorToken) {
		if (!currentToken) throw new Error("Unexpected end of input");

		// Handle function without consuming the token
		if (currentToken.type === "function") {
			return parseFunction();
		}

		const token = currentToken;
		next(); // Move to the next token

		switch (token.type) {
			case "number":
				return Number(token.value);

			case "string":
				return token.value.slice(1, -1).replace(/''/g, "");

			case "identifier":
				return token.value;

			case "null":
				return null;

			case "placeholder": {
				const val = token.value.slice(1, -1);
				if (!variables.includes(val)) variables.push(val);
				return { ...token, type: "placeholder", value: val };
			}

			case "paren": {
				if (currentToken.type === "function") {
					return parseFunction();
				}
				// Handle ({Placeholder}) syntax for placeholders inside parentheses
				const nextToken = tokenizer.peekNextToken();
				if (currentToken && currentToken.type === "placeholder" &&
					nextToken && nextToken.type === "paren") {
					const val = parseValue();
					return { type: "placeholder", value: val };
				}
				break;
			}
		}

		// Handle IN or NOT IN operator (outside switch as intended)
		operatorToken = operatorToken?.toUpperCase();
		if (operatorToken === "IN" || operatorToken === "NOT IN") {
			return parseInList(token);
		}

		throw new Error(`Unexpected value: ${token.value}`);
	}



	// Start parsing and return the AST with extracted variables
	return { ast: parseExpression(), variables };
}