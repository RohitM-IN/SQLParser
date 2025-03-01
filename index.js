import { parse } from "./parser.js";
import { sanitizeQuery } from "./sanitizer.js";
import { convertToDevExpressFormat } from "./converter.js";
import { sampleResultObject } from "./sample.js";

export function parseFilterString(filterString, sampleData = null) {
    if (filterString.toUpperCase().startsWith("SELECT")) return null; // Skip full SQL queries

    let { sanitizedSQL, extractedVariables } = sanitizeQuery(filterString);
    console.log("Sanitized SQL:", sanitizedSQL, "\n");

    const parsedResult = parse(sanitizedSQL, extractedVariables);
    extractedVariables = parsedResult.variables;
    console.log("Extracted Variables:", JSON.stringify(extractedVariables, null, 2), "\n");

    const astTree = parsedResult.ast;
    console.log("AST Tree:", JSON.stringify(astTree, null, 2), "\n");

    return convertToDevExpressFormat(astTree, extractedVariables, sampleData);
}

// Example usage
const devExpressFilter = parseFilterString("ID IN ({WorkOrderLine.ApplicableUoms}) AND (CompanyID = {WorkOrderDocument.CompanyID} OR {WorkOrderDocument.CompanyID} = 0)", sampleResultObject);

console.log("DevExpress Filter:", JSON.stringify(devExpressFilter, null, 2));
