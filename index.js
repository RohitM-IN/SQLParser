import { parse } from "./parser.js";
import { sanitizeQuery } from "./sanitizer.js";
import { convertToDevExpressFormat } from "./converter.js";
import { sampleResultObject } from "./sample.js";

export function parseFilterString(sql, resultObject = null) {
    if (sql.toUpperCase().startsWith("SELECT")) return null; // Skip full SQL queries
    let { sanitizedSQL, variables } = sanitizeQuery(sql);
    console.log("Sanitized SQL:", sanitizedSQL, "\n");
    // const tokens = tokenize(sanitizedSQL);
    // console.log("Tokens:", JSON.stringify(tokens, null, 2), "\n");
    
    const astwithVariables = parse(sanitizedSQL, variables);
    variables = astwithVariables.variables;
    console.log("Variables:", JSON.stringify(variables, null, 2), "\n");
    
    const ast = astwithVariables.ast;
    console.log("AST:", JSON.stringify(ast, null, 2), "\n");
    return convertToDevExpressFormat(ast, variables, resultObject);
}


var devexpress = parseFilterString("FromDate Between '10-10-2021' AND '10-10-2022'",sampleResultObject);

console.log("devexpress:", JSON.stringify(devexpress, null, 2));