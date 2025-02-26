export function convertToDevExpressFormat(ast, variables = []) {
    if (!ast) return null;

    if (ast.type === "comparison") {
        return [convertValue(ast.field), ast.operator, convertValue(ast.value, variables)];
    } else if (ast.type === "logical") {
        return [
            convertToDevExpressFormat(ast.left, variables),
            ast.operator.toLowerCase(),
            convertToDevExpressFormat(ast.right, variables)
        ];
    } else if (ast.type === "function" && ast.name === "ISNULL") {
        // Convert ISNULL(arg, default) to [arg, '=', default]
        return convertValue(ast.args[0], variables);
    } else if (ast.type === "value") {
        return convertValue(ast.value, variables);
    }

    throw new Error(`Unsupported AST node: ${ast.type}`);
}

function convertValue(value, variables) {
    if (typeof value === "object" && value.type === "placeholder") {
        return `{${value.value}}`;
    }
    return value;
}