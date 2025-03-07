import { LOGICAL_OPERATORS } from "../constants.js";

/**
 * Main conversion function that sets up the global context
 * @returns {Array|null} DevExpress format filter
 */
function DevExpressConverter() {
    // Global variables accessible throughout the converter
    let resultObject = null;
    let EnableShortCircuit = true;

    /**
   * Main conversion function that sets up the global context
   * @param {Object} ast - The abstract syntax tree
   * @param {Object} ResultObject - Optional object for placeholder resolution
   * @param {boolean} enableShortCircuit - Optional enabling and disabling the shortcircuit ie evaluating value = value scenario 
   * @returns {Array|null} DevExpress format filter
   */
    function convert(ast, ResultObject = null, enableShortCircuit = true) {
        // Set up global context
        resultObject = ResultObject;
        EnableShortCircuit = enableShortCircuit;

        // Process the AST
        let result = processAstNode(ast);

        // Handle special cases for short circuit
        if (result === true || result === false || result === null) return [];

        return processAstNode(ast);
    }

    /**
     * Process an AST node based on its type
     * @param {Object} ast - The AST node to process
     * @param {string} parentOperator - The operator of the parent logical node (if any)
     * @returns {Array|null|boolean} DevExpress format filter or boolean for short-circuit
     */
    function processAstNode(ast, parentOperator = null) {
        if (!ast) return null; // Return null if the AST is empty

        switch (ast.type) {
            case "logical":
                return handleLogicalOperator(ast, parentOperator);
            case "comparison":
                return handleComparisonOperator(ast);
            case "function":
                return handleFunction(ast);
            case "field":
            case "value":
                return convertValue(ast.value);
            default:
                return null;
        }
    }

    /**
     * Handles logical operators (AND, OR) and applies short-circuit optimizations.
     * @param {Object} ast - The logical operator AST node.
     * @param {string} parentOperator - The operator of the parent logical node.
     * @returns {Array|boolean} DevExpress format filter or boolean for short-circuit.
     */
    function handleLogicalOperator(ast, parentOperator) {
        const operator = ast.operator.toLowerCase();

        // Special case: Handle ISNULL comparison with a value
        if (isNullCheck(ast.left, ast.right)) {
            const resolvedValue = convertValue(ast.right);

            // Short-circuit: If left argument is a placeholder, return boolean result directly
            if (EnableShortCircuit && ast.left.args[0]?.value?.type === "placeholder") {
                return resolvedValue == null;
            }

            return [processAstNode(ast.left), operator, null];
        }
        if (isNullCheck(ast.right, ast.left)) {
            const resolvedValue = convertValue(ast.left);

            // Short-circuit: If right argument is a placeholder, return boolean result directly
            if (EnableShortCircuit && ast.right.args[0]?.value?.type === "placeholder") {
                return resolvedValue == null;
            }

            return [null, operator, processAstNode(ast.right)];
        }

        // Recursively process left and right operands
        const left = processAstNode(ast.left, operator);
        const right = processAstNode(ast.right, operator);

        if (EnableShortCircuit) {
            // Short-circuit: always-true conditions
            if (left === true || right === true) {
                if (operator === 'or') return true;
                return left === true ? right : left;
            }

            // Short-circuit: always-false conditions
            if (left === false || right === false) {
                return left === false ? right : left;
            }

        }

        // Detect and flatten nested logical expressions
        if (parentOperator === null) {
            if (left.length === 3 && LOGICAL_OPERATORS.includes(left[1])) parentOperator = left[1];
            if (right.length === 3 && LOGICAL_OPERATORS.includes(right[1])) parentOperator = right[1];
        }

        // Flatten nested logical expressions if applicable
        if (shouldFlattenLogicalTree(parentOperator, operator, ast)) {
            return flattenLogicalTree(left, operator, right);
        }
        return [left, operator, right];
    }

    /**
     * Handles comparison operators (=, <>, IN, IS) and applies optimizations.
     * @param {Object} ast - The comparison operator AST node.
     * @returns {Array|boolean} DevExpress format filter or boolean for short-circuit.
     */
    function handleComparisonOperator(ast) {
        const operator = ast.operator.toUpperCase();

        // Handle "IS NULL" condition
        if (operator === "IS" && ast.value === null) {
            return [ast.field, "=", null];
        }

        // Handle "IN" condition, including comma-separated values
        if (operator === "IN" || operator === "NOT IN") {
            return handleInOperator(ast, operator);
        }

        const left = ast.left !== undefined ? processAstNode(ast.left) : convertValue(ast.field);
        const right = ast.right !== undefined ? processAstNode(ast.right) : convertValue(ast.value);
        const operatorToken = ast.operator.toLowerCase();

        let comparison = [left, operatorToken, right];

        if (isFunctionNullCheck(ast.left, true)) {
            comparison = [[left, operatorToken, right], 'or', [left, operatorToken, null]];
        } else if (isFunctionNullCheck(ast.right, true)) {
            comparison = [[left, operatorToken, right], 'or', [right, operatorToken, null]];
        }

        // Apply short-circuit evaluation if enabled
        if (EnableShortCircuit) {
            if (isAlwaysTrue(comparison)) return true;
            if (isAlwaysFalse(comparison)) return false;
        }

        return comparison;
    }

    /**
     * Handles function calls, focusing on ISNULL.
     * @param {Object} ast - The function AST node.
     * @returns {*} Resolved function result.
     */
    function handleFunction(ast) {
        if (ast.name === "ISNULL" && ast.args && ast.args.length >= 2) {
            const firstArg = ast.args[0];

            // Resolve placeholders
            if (firstArg.type === "placeholder") {
                return resolvePlaceholderFromResultObject(firstArg.value);
            }
            return convertValue(firstArg);
        }

        // this should never happen as we are only handling ISNULL and should throw an error
        throw new Error(`Unsupported function: ${ast.name}`);
    }


    /**
     * Handles the IN operator specifically.
     * @param {Object} ast - The comparison operator AST node.
     * @returns {Array} DevExpress format filter.
     */
    function handleInOperator(ast, operator) {
        let resolvedValue = convertValue(ast.value);

        // Handle comma-separated values in a string
        if (Array.isArray(resolvedValue) && resolvedValue.length === 1) {
            const firstValue = resolvedValue[0];
            if (typeof firstValue === 'string' && firstValue.includes(',')) {
                resolvedValue = firstValue.split(',').map(v => v.trim());
            } else {
                resolvedValue = firstValue;
            }
        } else if (typeof resolvedValue === 'string' && resolvedValue.includes(',')) {
            resolvedValue = resolvedValue.split(',').map(v => v.trim());
        }

        let operatorToken = operator === "IN" ? '=' : operator === "NOT IN" ? '!=' : operator;
        let joinOperatorToken = operator === "IN" ? 'or' : operator === "NOT IN" ? 'and' : operator;

        if (Array.isArray(resolvedValue) && resolvedValue.length) {
            return resolvedValue.flatMap(i => [[ast.field, operatorToken, i], joinOperatorToken]).slice(0, -1);
        }

        return [ast.field, operatorToken, resolvedValue];
    }

    /**
     * Converts a single value, resolving placeholders and handling special cases.
     * @param {*} val - The value to convert.
     * @returns {*} Converted value.
     */
    function convertValue(val) {
        if (val === null) return null;

        // Handle array values
        if (Array.isArray(val)) {
            return val.map(item => convertValue(item));
        }

        // Handle object-based values
        if (typeof val === "object") {
            if (val.type === "placeholder") {
                return resolvePlaceholderFromResultObject(val.value);
            }

            // Special handling for ISNULL function
            if (isFunctionNullCheck(val)) {
                return convertValue(val.args[0]);
            }

            // Handle nested AST nodes
            if (val.type) {
                return processAstNode(val);
            }
        }

        return val;
    }

    /**
     * Resolves placeholder values from the result object.
     * @param {string} placeholder - The placeholder to resolve.
     * @returns {*} Resolved placeholder value.
     */
    function resolvePlaceholderFromResultObject(placeholder) {
        if (!resultObject) return `{${placeholder}}`;


        return resultObject.hasOwnProperty(placeholder) ? resultObject[placeholder] : `{${placeholder}}`;
    }

    /**
     * Checks if a node is an ISNULL function check.
     * @param {Object} node - The node to check.
     * @param {Object} valueNode - The value node.
     * @returns {boolean} True if this is an ISNULL check.
     */
    function isNullCheck(node, valueNode) {
        return node?.type === "function" && node.name === "ISNULL" && valueNode?.type === "value";
    }

    /**
     * Checks if a node is a ISNULL function without value
     * @param {Object} node 
     * @returns {boolean} True if this is an ISNULL check.
     */
    function isFunctionNullCheck(node, isPlaceholderCheck = false) {
        const isValidFunction = node?.type === "function" && node?.name === "ISNULL" && node?.args?.length >= 2;

        return isPlaceholderCheck ? isValidFunction && node?.args[0]?.value?.type !== "placeholder" : isValidFunction;
    }


    /**
     * Determines whether the logical tree should be flattened.
     * This is based on the parent operator and the current operator.
     * @param {string} parentOperator - The operator of the parent logical node.
     * @param {string} operator - The operator of the current logical node.
     * @param {Object} ast - The current AST node.
     * @returns {boolean} True if the tree should be flattened, false otherwise.
     */
    function shouldFlattenLogicalTree(parentOperator, operator, ast) {
        return parentOperator !== null && operator === parentOperator || ast.operator === ast.right?.operator;
    }

    /**
     * Flattens a logical tree by combining nested logical nodes.
     * @param {Array} left - The left side of the logical expression.
     * @param {string} operator - The logical operator.
     * @param {Array} right - The right side of the logical expression.
     * @returns {Array} The flattened logical tree.
     */
    function flattenLogicalTree(left, operator, right) {
        const parts = [];

        // Flatten left side if it has the same operator
        if (Array.isArray(left) && left[1] === operator) {
            parts.push(...left);
        } else {
            parts.push(left);
        }

        // Add the operator
        parts.push(operator);

        // Flatten right side if it has the same operator
        if (Array.isArray(right) && right[1] === operator) {
            parts.push(...right);
        } else {
            parts.push(right);
        }

        return parts;
    }


    /**
     * Checks if a condition is always true.
     * @param {Array} condition - The condition to check.
     * @returns {boolean} True if the condition is always true.
     */
    function isAlwaysTrue(condition) {
        return Array.isArray(condition) && condition.length === 3 && evaluateExpression(...condition) == true;
    }

    /**
     * Checks if a condition is always false.
     * @param {Array} condition - The condition to check.
     * @returns {boolean} True if the condition is always false.
     */
    function isAlwaysFalse(condition) {
        return Array.isArray(condition) && condition.length === 3 && evaluateExpression(...condition) == false;
    }

    /**
     * Evaluates a simple expression.
     * @param {*} left - The left operand.
     * @param {string} operator - The operator.
     * @param {*} right - The right operand.
     * @returns {boolean|null} The result of the evaluation or null if not evaluable.
     */
    function evaluateExpression(left, operator, right) {
        if ((left !== null && isNaN(left)) || (right !== null && isNaN(right))) return null;

        if (left === null || right === null) {
            if (operator === '=' || operator === '==') return left === right;
            if (operator === '<>' || operator === '!=') return left !== right;
            return null; // Any comparison with null should return null
        }

        switch (operator) {
            case '=': case '==': return left === right;
            case '<>': case '!=': return left !== right;
            case '>': return left > right;
            case '>=': return left >= right;
            case '<': return left < right;
            case '<=': return left <= right;
            default: return null; // Invalid operator
        }
    }

    return { init: convert };

}

// Create a global instance
const devExpressConverter = DevExpressConverter();

/**
 * Converts an abstract syntax tree to DevExpress format
 * @param {Object} ast - The abstract syntax tree
 * @param {Object} resultObject - Optional object for placeholder resolution
 * @param {string} enableShortCircuit - Optional enabling and disabling the shortcircuit ie evaluating value = value scenario 
 * @returns {Array|null} DevExpress format filter
 */
export function convertToDevExpressFormat({ ast, resultObject = null, enableShortCircuit = true }) {
    return devExpressConverter.init(ast, resultObject, enableShortCircuit);
}