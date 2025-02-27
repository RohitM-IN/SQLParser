import { tokenize } from "./tokenizer.js";
import { parse } from "./parser.js";
import { sanitizeQuery } from "./sanitizer.js";
import { convertToDevExpressFormat } from "./converter.js";

export function parseFilterString(sql) {
    if (sql.toUpperCase().startsWith("SELECT")) return null; // Skip full SQL queries
    let { sanitizedSQL, variables } = sanitizeQuery(sql);
    console.log("Sanitized SQL:", sanitizedSQL, "\n");
    const tokens = tokenize(sanitizedSQL);
    console.log("Tokens:", JSON.stringify(tokens, null, 2), "\n");
    
    const astwithVariables = parse(tokens, variables);
    variables = astwithVariables.variables;
    console.log("Variables:", JSON.stringify(variables, null, 2), "\n");
    
    const ast = astwithVariables.ast;
    console.log("AST:", JSON.stringify(ast, null, 2), "\n");
    return convertToDevExpressFormat(ast, variables);
}


var devexpress = parseFilterString("((ISNULL({0}, 0) = 0 AND CompanyID = {1}) OR CompanyID IS NULL) OR BranchID = {0}");

console.log("devexpress:", JSON.stringify(devexpress, null, 2));