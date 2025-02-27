/**
 * Converts an AST to DevExpress filter format with ResultObject support
 * @param {Object} ast - The abstract syntax tree
 * @param {Array} variables - Array of variable names
 * @param {Object} resultObject - Optional ResultObject for placeholder resolution
 * @returns {Array} DevExpress format filter
 */
function convertToDevExpressFormat(ast, variables, resultObject = null) {
    if (!ast) return null;

    if (ast.type === "logical") {
        // Handle logical operators (AND, OR)
        const operator = ast.operator.toLowerCase();
        if (operator === "and" || operator === "or") {
            return [
                convertToDevExpressFormat(ast.left, variables, resultObject),
                operator,
                convertToDevExpressFormat(ast.right, variables, resultObject)
            ];
        } else {
            // Handle other operators (=, >, <, etc.)
            return [
                convertToDevExpressFormat(ast.left, variables, resultObject),
                operator,
                convertToDevExpressFormat(ast.right, variables, resultObject)
            ];
        }
    } else if (ast.type === "comparison") {
        // Handle special case for IS NULL
        if (ast.operator.toUpperCase() === "IS" && ast.value === null) {
            return [ast.field, "=", null];
        }
        
        // Handle IN operator
        if (ast.operator.toUpperCase() === "IN") {
            return [ast.field, "in", convertValue(ast.value, variables, resultObject)];
        }
        
        // Handle other comparison operators
        return [ast.field, ast.operator.toLowerCase(), convertValue(ast.value, variables, resultObject)];
    } else if (ast.type === "function") {
        // Special handling for ISNULL function in a comparison
        if (ast.name === "ISNULL" && ast.args && ast.args.length >= 2) {
            // DevExpress doesn't use ISNULL in the same way, so we just use the first arg directly
            const firstArgValue = convertValue(ast.args[0], variables, resultObject);
            return firstArgValue;
        }
        
        // Generic function handling
        return [ast.name.toLowerCase(), convertValues(ast.args, variables, resultObject)];
    } else if (ast.type === "field") {
        return convertValue(ast.value, variables, resultObject);
    } else if (ast.type === "value") {
        return convertValue(ast.value, variables, resultObject);
    }
    
    return null;
}

/**
 * Convert an array of values
 */
function convertValues(values, variables, resultObject) {
    if (!values) return [];
    return values.map(val => convertValue(val, variables, resultObject));
}

/**
 * Convert a single value with ResultObject support
 */
function convertValue(val, variables, resultObject) {
    if (val === null) return null;
    
    // Handle arrays (for IN operator)
    if (Array.isArray(val)) {
        return val.map(item => convertValue(item, variables, resultObject));
    }
    
    // Handle placeholder objects
    if (typeof val === "object") {
        // Check if it's a placeholder object
        if (val && val.type === "placeholder") {
            // If resultObject provided, attempt to resolve the placeholder value
            if (resultObject && typeof val.value === 'string') {
                return resolvePlaceholderFromResultObject(val.value, resultObject);
            }
            return `{${val.value}}`;
        }
        
        // Special handling for ISNULL function
        if (val.type === "function" && val.name === "ISNULL" && val.args && val.args.length >= 2) {
            const firstArgValue = convertValue(val.args[0], variables, resultObject);
            return firstArgValue;
        }
        
        // Handle nested AST nodes
        if (val.type) {
            return convertToDevExpressFormat(val, variables, resultObject);
        }
    }
    
    // Return primitive values as-is
    return val;
}

/**
 * Resolves a placeholder value from the ResultObject
 * Format: {EntityName.AttributeName}
 */
function resolvePlaceholderFromResultObject(placeholder, resultObject) {
    if (!resultObject) return `{${placeholder}}`;
    
    try {
        // Parse the placeholder to get entity name and attribute
        const [entityName, attributeName] = placeholder.split('.');
        
        // Check if the entity exists in the ResultObject
        if (resultObject[entityName]) {
            const entityData = resultObject[entityName];
            
            // If we have data for this entity
            if (entityData.Data && entityData.Data.length > 0) {
                // Get the first data item (or you could implement more complex selection logic)
                const dataItem = entityData.Data[0];
                
                // Check if the attribute exists in the data item's value
                if (attributeName && dataItem.value && dataItem.value.hasOwnProperty(attributeName)) {
                    return dataItem.value[attributeName];
                } else {
                    // If attribute not found, return first property as fallback
                    const firstKey = Object.keys(dataItem.value)[0];
                    if (firstKey) {
                        return dataItem.value[firstKey];
                    }
                }
            }
        }
        
        // If we can't resolve, return the original placeholder
        return `{${placeholder}}`;
    } catch (error) {
        console.error(`Error resolving placeholder ${placeholder}:`, error);
        return `{${placeholder}}`;
    }
}

export { convertToDevExpressFormat };