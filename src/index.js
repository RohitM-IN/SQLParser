import { convertToDevExpressFormat } from "./core/converter.js";
import { parse } from "./core/parser.js";
import { sanitizeQuery } from "./core/sanitizer.js";


export function convertSQLToAst(filterString, enableConsoleLogs = false) {
    let { sanitizedSQL, extractedVariables } = sanitizeQuery(filterString);

    const parsedResult = parse(sanitizedSQL, extractedVariables);

    if (enableConsoleLogs === true) {
        console.log("Sanitized SQL:", sanitizedSQL, "\n");
        console.log("Extracted Variables:", JSON.stringify(parsedResult.variables, null, 2), "\n");
        console.log("AST Tree:", JSON.stringify(parsedResult.ast, null, 2), "\n");
    }
    return parsedResult;
}

export function convertAstToDevextreme(ast, state = null, enableShortCircuit = true) {
    return convertToDevExpressFormat({ ast, resultObject: state, enableShortCircuit })
}



