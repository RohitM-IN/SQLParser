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

    // Handle always-true conditions like [0, "=", 0] in OR expressions
    if (ast.type === "logical" && ast.operator.toLowerCase() === "or") {
        // Check if any part of the OR condition is always true
        if (isAlwaysTrueCondition(ast)) {
            return [1, "=", 1]; // Short-circuit: this is always true
        }
    }

    // Handle ISNULL special case
    if (isIsNullComparisonToZero(ast)) {
        const field = ast.left.args[0];
        return [convertValue(field, variables, resultObject), "=", null];
    }

    // Short-circuit for simple constant comparisons
    if (ast.type === "comparison" && isSimpleConstantComparison(ast)) {
        const result = evaluateConstantComparison(ast);
        return result ? [1, "=", 1] : [1, "=", 0];
    }

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
 * Extracts the placeholder value from an ISNULL comparison pattern.
 */
function extractPlaceholderFromIsNullComparison(ast) {
    if (ast?.type === "logical" && ast?.operator === "=" &&
        ast?.left?.type === "function" && ast?.left?.name === "ISNULL" &&
        ast?.left?.args?.[0]?.type === "field" && 
        ast?.left?.args?.[0]?.value?.type === "placeholder") {
        
        return ast.left.args[0].value.value;
    }
    return null;
}

/**
 * Resolves a placeholder value directly.
 */
function resolvePlaceholderValue(placeholder, resultObject) {
    if (!resultObject || !placeholder) return null;
    
    try {
        const [entityName, attributeName] = placeholder.split('.');
        const entityData = resultObject[entityName]?.Data?.[0]?.value;
        
        return entityData?.[attributeName] ?? null;
    } catch (error) {
        console.error(`Error resolving placeholder ${placeholder}:`, error);
        return null;
    }
}

/**
 * Checks if the AST is a pattern like ISNULL(x) = 0.
 */
function isIsNullComparisonToZero(ast) {
    return ast?.type === "logical" && 
           ast?.operator === "=" &&
           ast?.left?.type === "function" && 
           ast?.left?.name === "ISNULL" &&
           ast?.left?.args?.[0]?.type === "field" &&
           ast?.right?.type === "value" && 
           ast?.right?.value === 0;
}

/**
 * Checks if an AST node is a simple constant comparison (e.g., 1 = 1).
 */
function isSimpleConstantComparison(ast) {
    if (!ast || ast.type !== "comparison") return false;
    
    const fieldIsConstant = typeof ast.field === "number" || 
                           (ast.field?.type === "value" && !isNaN(Number(ast.field.value)));
    
    const valueIsConstant = typeof ast.value === "number" || 
                            (ast.value?.type === "value" && !isNaN(Number(ast.value.value)));
    
    return fieldIsConstant && valueIsConstant;
}

/**
 * Evaluates a simple constant comparison.
 */
function evaluateConstantComparison(ast) {
    const left = typeof ast.field === "number" ? ast.field : 
                (ast.field?.type === "value" ? Number(ast.field.value) : NaN);
                
    const right = typeof ast.value === "number" ? ast.value : 
                 (ast.value?.type === "value" ? Number(ast.value.value) : NaN);
    
    switch (ast.operator.toLowerCase()) {
        case '=': return left === right;
        case '<>': return left !== right;
        case '>': return left > right;
        case '>=': return left >= right;
        case '<': return left < right;
        case '<=': return left <= right;
        default: return false;
    }
}

/**
 * Handles logical operators (AND, OR).
 */
// Then modify handleLogicalOperator to better handle OR logic with always-true conditions
function handleLogicalOperator(ast, variables, resultObject, parentOperator) {
    const operator = ast.operator.toLowerCase();

    // Return early for always-true conditions in OR expressions
    if (operator === "or" && isAlwaysTrueCondition(ast)) {
        return [1, "=", 1]; // Short-circuit: this is always true
    }

    // Handle ISNULL(x) = 0 specifically
    if (ast.operator === "=" && 
        ast.left?.type === "function" && 
        ast.left?.name === "ISNULL") {
        
        const field = ast.left.args[0];
        return [convertValue(field, variables, resultObject), "=", null];
    }

    // Recursively process left and right operands
    const left = convertToDevExpressFormat(ast.left, variables, resultObject, operator);
    const right = convertToDevExpressFormat(ast.right, variables, resultObject, operator);

    // Enhanced short-circuit evaluation
    if (isAlwaysTrue(left)) {
        if (operator === "or") return [1, "=", 1]; // OR with true is always true
        if (operator === "and") return right;      // AND with true depends on right side
    }
    
    if (isAlwaysTrue(right)) {
        if (operator === "or") return [1, "=", 1]; // OR with true is always true
        if (operator === "and") return left;       // AND with true depends on left side
    }
    
    if (isAlwaysFalse(left)) {
        if (operator === "and") return [1, "=", 0]; // AND with false is always false
        if (operator === "or") return right;        // OR with false depends on right side
    }
    
    if (isAlwaysFalse(right)) {
        if (operator === "and") return [1, "=", 0]; // AND with false is always false
        if (operator === "or") return left;         // OR with false depends on left side
    }

    // Flatten logical expressions if needed
    if (shouldFlattenLogicalTree(parentOperator, operator, ast)) {
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


    // Default case: standard comparison
    return [
        convertValue(ast.field, variables, resultObject),
        ast.operator.toLowerCase(),
        convertValue(ast.value, variables, resultObject),
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

/**
 * Detects if a condition is always true (1 = 1)
 */
export function isAlwaysTrue(condition) {
    return Array.isArray(condition) && condition.length === 3 &&
           (condition[0] == 1 && condition[1] === "=" && condition[2] == 1) || (condition[0] == 0 && condition[1] === "=" && condition[2] == 0);
}

/**
 * Detects if a condition is always false (1 = 0)
 */
function isAlwaysFalse(condition) {
    return Array.isArray(condition) && condition.length === 3 &&
           condition[0] == 1 && condition[1] === "=" && condition[2] == 0;
}

/**
 * Checks if an AST node or any of its children represents a condition that is always true
 */
function isAlwaysTrueCondition(ast) {
    if (!ast) return false;
    
    // Direct check for patterns like [0, "=", 0] or [1, "=", 1]
    if (ast.type === "logical" && ast.operator === "=") {
        if (ast.left?.type === "value" && ast.right?.type === "value") {
            const leftVal = Number(ast.left.value);
            const rightVal = Number(ast.right.value);
            if (!isNaN(leftVal) && !isNaN(rightVal) && leftVal === rightVal) {
                return true;
            }
        }
    }
    
    // Check for ISNULL(x) = 0 pattern when x is obviously not null
    if (isIsNullComparisonToZero(ast)) {
        const field = ast.left.args[0];
        if (field.type === "value" && field.value !== null) {
            return true; // ISNULL(non-null-value) = 0 is always true
        }
    }
    
    // Recursive check for children
    if (ast.left && isAlwaysTrueCondition(ast.left)) {
        return true;
    }
    
    if (ast.right && isAlwaysTrueCondition(ast.right)) {
        return true;
    }
    
    return false;
}

export { convertToDevExpressFormat };