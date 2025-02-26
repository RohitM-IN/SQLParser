export function convertToDevExpressFormat(ast, variables = []) {
    if (!ast) return null;

    if (ast.type === "comparison") {
        if(ast.operator.toLowerCase() === "is"){
            ast.operator = "=";
        }
        return [convertValue(ast.field), ast.operator.toLowerCase(), convertValue(ast.value, variables)];
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

function convertValue(val, variables) {
    if (typeof val === "object" && val.type === "placeholder") {
        return `{${val.value}}`;
    }
    if(typeof val.value === "object" && val.value.length > 0){
        return val.value;
    }
    return val;
}