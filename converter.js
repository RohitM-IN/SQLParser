const EnableShortCircuit = true;

/**
 * Converts an AST to DevExpress filter format.
 * @param {Object} ast - The abstract syntax tree.
 * @param {Array} variables - Array of variable names.
 * @param {Object} resultObject - Optional object for placeholder resolution.
 * @param {string} parentOperator - The operator of the parent logical node (if any).
 * @returns {Array|null} DevExpress format filter.
 */
function convertToDevExpressFormat(ast, variables, resultObject = null, parentOperator = null) {
    if (!ast) return null;

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
 * Handles logical operators (AND, OR).
 */
function handleLogicalOperator(ast, variables, resultObject, parentOperator) {
    const operator = ast.operator.toLowerCase();

    // Special case: Handle ISNULL comparison with a value
    if (isNullCheck(ast.left, ast.right)) {
        const resolvedValue = convertValue(ast.right, variables, resultObject);

        if(EnableShortCircuit && ast.left.args[0]?.value?.type === "placeholder") {
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

    if(EnableShortCircuit && (left === true || right === true)) {
        if(operator === 'or') return true;
        return left === true ? right : left;
    }

    // behave same for 'or' and 'and'
    if(EnableShortCircuit && (left === false || right === false)) {
        return left === false ? right : left;
    }

    // Flatten logical expressions if needed
    if (shouldFlattenLogicalTree(parentOperator, operator, ast)) {

        if(EnableShortCircuit && (left === true || right === true)) {
            if(operator === 'or') return true;
            return left === true ? right : left;
        }

        return flattenLogicalTree(left, operator, right);
    }
    return [left, operator, right];
}

/**
 * Handles comparison operators (e.g., =, <>, IN, IS).
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

        if (Array.isArray(resolvedValue) && resolvedValue.length === 1) {
            const firstValue = resolvedValue[0];

            // Convert single string with commas into an array
            resolvedValue = firstValue.includes(',')
                ? firstValue.split(',').map(v => v.trim()) 
                : firstValue;
        }
        
        return [ast.field, "in", resolvedValue];
    }

    const left = convertValue(ast.field, variables, resultObject);
    const right = convertValue(ast.value, variables, resultObject);

    if(EnableShortCircuit && isAlwaysTrue([left, operator, right])) {
        return true;
    }
    if(EnableShortCircuit && isAlwaysFalse([left, operator, right])) {
        return false;
    }

    // Default case: standard comparison
    return [
        left,
        ast.operator.toLowerCase(),
        right,
    ];
}

/**
 * Handles function calls, including ISNULL.
 */
function handleFunction(ast, variables, resultObject) {
    if (ast.name === "ISNULL" && ast.args && ast.args.length >= 2) {
        const firstArg = ast.args[0];

        // Resolve placeholders if applicable
        if (firstArg.type === "placeholder") {
            const resolvedValue = resolvePlaceholderFromResultObject(firstArg.value, resultObject);
            return resolvedValue !== `{${firstArg.value}}` ? resolvedValue : null;
        }

        return convertValue(firstArg, variables, resultObject);
    }

    // Generic function handling
    return [ast.name.toLowerCase(), convertValues(ast.args, variables, resultObject)];
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
 * Resolves a placeholder value from the result object.
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
 * Checks if a node represents an ISNULL function used in a comparison.
 */
function isNullCheck(node, valueNode) {
    return node?.type === "function" && node.name === "ISNULL" && valueNode?.type === "value";
}

/**
 * Determines if a logical tree should be flattened.
 */
function shouldFlattenLogicalTree(parentOperator, operator, ast) {
    return parentOperator !== null && operator === parentOperator || ast.operator === ast.right?.operator;
}

/**
 * Flattens nested logical trees for a cleaner DevExpress format.
 */
function flattenLogicalTree(left, operator, right) {
    let parts = Array.isArray(left) && left[1] === operator ? left : [left];
    parts.push(operator);
    parts = parts.concat(Array.isArray(right) && right[1] === operator ? right : [right]);
    return parts;
}

// Detects 1 = 1 (Always True)
function isAlwaysTrue(condition) {
    return Array.isArray(condition) && condition.length === 3 && evaluateExpression(condition[0], condition[1], condition[2]) == true;
}

// Detects 1 = 0 (Always False)
function isAlwaysFalse(condition) {
    return Array.isArray(condition) && condition.length === 3 && evaluateExpression(condition[0], condition[1], condition[2]) == false;
}

function evaluateExpression(left, operator, right) {

    if(isNaN(left) || isNaN(right) || left === null || right === null) {
        return null;
    }

    switch (operator.toLowerCase()) {
        case '=':
        case '==':
            return left === right;
        case '<>':
        case '!=':
            return left !== right;
        case '>':
            return left > right;
        case '>=':
            return left >= right;
        case '<':
            return left < right;
        case '<=':
            return left <= right;
        default:
            // For unsupported operators, default to false
            return false;
    }
}

export { convertToDevExpressFormat };
