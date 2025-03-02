const EnableShortCircuit = true;

/**
 * Converts an AST (Abstract Syntax Tree) to DevExpress filter format.
 * @param {Object} ast - The abstract syntax tree.
 * @param {Array} variables - Array of variable names.
 * @param {Object} resultObject - Optional object for placeholder resolution.
 * @param {string} parentOperator - The operator of the parent logical node (if any).
 * @returns {Array|null} DevExpress format filter.
 */
function convertToDevExpressFormat(ast, variables, resultObject = null, parentOperator = null) {
    if (!ast) return null; // Return null if the AST is empty

    switch (ast.type) {
        case "logical":
            return handleLogicalOperator(ast, variables, resultObject, parentOperator);
        case "comparison":
            return handleComparisonOperator(ast, variables, resultObject);
        case "function":
            return handleFunction(ast, variables, resultObject);
        case "field":
        case "value":
            return convertValue(ast.value, variables, resultObject);
        default:
            return null;
    }
}

/**
 * Handles logical operators (AND, OR) and applies short-circuit optimizations.
 */
function handleLogicalOperator(ast, variables, resultObject, parentOperator) {
    const operator = ast.operator.toLowerCase();

    // Special case: Handle ISNULL comparison with a value
    if (isNullCheck(ast.left, ast.right)) {
        const resolvedValue = convertValue(ast.right, variables, resultObject);

        // Short-circuit: If left argument is a placeholder, return boolean result directly
        if (EnableShortCircuit && ast.left.args[0]?.value?.type === "placeholder") {
            return resolvedValue == null ? true : false;
        }

        return [convertToDevExpressFormat(ast.left, variables, resultObject), operator, null];
    }
    if (isNullCheck(ast.right, ast.left)) {
        return [null, operator, convertToDevExpressFormat(ast.right, variables, resultObject)];
    }

    // Recursively process left and right operands
    const left = convertToDevExpressFormat(ast.left, variables, resultObject, operator);
    const right = convertToDevExpressFormat(ast.right, variables, resultObject, operator);

    // Short-circuit: Optimize for always-true conditions
    if (EnableShortCircuit && (left === true || right === true)) {
        if (operator === 'or') return true;
        return left === true ? right : left;
    }

    // Short-circuit: Optimize for always-false conditions
    if (EnableShortCircuit && (left === false || right === false)) {
        return left === false ? right : left;
    }

    // Detect and flatten nested logical expressions
    if(parentOperator === null){
        if(left.length === 3 && ['and', 'or'].includes(left[1])) parentOperator = left[1];
        if(right.length === 3 && ['and', 'or'].includes(right[1])) parentOperator = right[1];
    }

    // Flatten nested logical expressions if applicable
    if (shouldFlattenLogicalTree(parentOperator, operator, ast)) {
        return flattenLogicalTree(left, operator, right);
    }
    return [left, operator, right];
}

/**
 * Handles comparison operators (=, <>, IN, IS) and applies optimizations.
 */
function handleComparisonOperator(ast, variables, resultObject) {
    const operator = ast.operator.toUpperCase();

    // Handle "IS NULL" condition
    if (operator === "IS" && ast.value === null) {
        return [ast.field, "=", null];
    }

    // Handle "IN" condition, including comma-separated values
    if (operator === "IN") {
        let resolvedValue = convertValue(ast.value, variables, resultObject);

        // Convert single-string CSV into an array
        if (Array.isArray(resolvedValue) && resolvedValue.length === 1) {
            const firstValue = resolvedValue[0];
            resolvedValue = firstValue.includes(',')
                ? firstValue.split(',').map(v => v.trim())
                : firstValue;
        }
        return [ast.field, "in", resolvedValue];
    }

    const left = convertValue(ast.field, variables, resultObject);
    const right = convertValue(ast.value, variables, resultObject);

    // Short-circuit evaluation
    if (EnableShortCircuit && isAlwaysTrue([left, operator, right])) return true;
    if (EnableShortCircuit && isAlwaysFalse([left, operator, right])) return false;

    return [left, ast.operator.toLowerCase(), right];
}

/**
 * Handles function calls, including ISNULL.
 */
function handleFunction(ast, variables, resultObject) {
    if (ast.name === "ISNULL" && ast.args && ast.args.length >= 2) {
        const firstArg = ast.args[0];

        // Resolve placeholders
        if (firstArg.type === "placeholder") {
            const resolvedValue = resolvePlaceholderFromResultObject(firstArg.value, resultObject);
            return resolvedValue !== `{${firstArg.value}}` ? resolvedValue : null;
        }
        return convertValue(firstArg, variables, resultObject);
    }

    // this should never happen as we are only handling ISNULL and should throw an error
    throw new Error(`Unsupported function: ${ast.name}`);
}

/**
 * Converts an array of values.
 */
function convertValues(values, variables, resultObject) {
    return values ? values.map(val => convertValue(val, variables, resultObject)) : [];
}

/**
 * Converts a single value, resolving placeholders and handling ISNULL.
 */
function convertValue(val, variables, resultObject) {
    if (val === null) return null;
    
    // Handle array values
    if (Array.isArray(val)) {
        return val.map(item => convertValue(item, variables, resultObject));
    }

    // Handle object-based values
    if (typeof val === "object") {
        if (val.type === "placeholder") {
            return resolvePlaceholderFromResultObject(val.value, resultObject);
        }

        // Special handling for ISNULL function
        if (val.type === "function" && val.name === "ISNULL" && val.args?.length >= 2) {
            return convertValue(val.args[0], variables, resultObject);
        }

        // Handle nested AST nodes
        if (val.type) {
            return convertToDevExpressFormat(val, variables, resultObject);
        }
    }

    return val;
}

/**
 * Resolves placeholder values from the result object.
 */
function resolvePlaceholderFromResultObject(placeholder, resultObject) {
    if (!resultObject) return `{${placeholder}}`;
    try {
        const [entityName, attributeName] = placeholder.split('.');
        const entityData = resultObject[entityName]?.Data?.[0]?.value;
        return entityData?.[attributeName] ?? Object.values(entityData ?? {})[0] ?? `{${placeholder}}`;
    } catch (error) {
        console.error(`Error resolving placeholder ${placeholder}:`, error);
        return `{${placeholder}}`;
    }
}

/**
 * Utility functions for null checking and tree flattening.
 */
function isNullCheck(node, valueNode) {
    return node?.type === "function" && node.name === "ISNULL" && valueNode?.type === "value";
}

function shouldFlattenLogicalTree(parentOperator, operator, ast) {
    return parentOperator !== null && operator === parentOperator || ast.operator === ast.right?.operator;
}

function flattenLogicalTree(left, operator, right) {
    let parts = Array.isArray(left) && left[1] === operator ? left : [left];
    parts.push(operator);
    parts = parts.concat(Array.isArray(right) && right[1] === operator ? right : [right]);
    return parts;
}

/**
 * Utility functions to detect always-true or always-false expressions.
 */
function isAlwaysTrue(condition) {
    return Array.isArray(condition) && condition.length === 3 && evaluateExpression(condition[0], condition[1], condition[2]) == true;
}

function isAlwaysFalse(condition) {
    return Array.isArray(condition) && condition.length === 3 && evaluateExpression(condition[0], condition[1], condition[2]) == false;
}

function evaluateExpression(left, operator, right) {
    if (isNaN(left) || isNaN(right) || left === null || right === null) return null;
    switch (operator.toLowerCase()) {
        case '=': case '==': return left === right;
        case '<>': case '!=': return left !== right;
        case '>': return left > right;
        case '>=': return left >= right;
        case '<': return left < right;
        case '<=': return left <= right;
        default: return false;
    }
}

export { convertToDevExpressFormat };
