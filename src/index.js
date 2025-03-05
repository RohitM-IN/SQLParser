import { convertToDevExpressFormat } from "./core/converter.js";
import { parse } from "./core/parser.js";
import { sanitizeQuery } from "./core/sanitizer.js";


export function convertSQLToAst(filterString, enableConsoleLogs = false) {
    let { sanitizedSQL, extractedVariables } = sanitizeQuery(filterString);
    enableConsoleLogs && console.log("Sanitized SQL:", sanitizedSQL, "\n");

    const parsedResult = parse(sanitizedSQL, extractedVariables);

    enableConsoleLogs && console.log("Extracted Variables:", JSON.stringify(parsedResult.variables, null, 2), "\n");
    enableConsoleLogs && console.log("AST Tree:", JSON.stringify(parsedResult.ast, null, 2), "\n");

    return parsedResult;
}

export function convertAstToDevextreme(ast, variables, state) {
    return convertToDevExpressFormat({ ast, variables, resultObject: state })
}



