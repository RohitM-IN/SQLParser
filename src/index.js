import { convertToDevExpressFormat } from "./core/converter.js";
import { parse } from "./core/parser.js";
import { sanitizeQuery } from "./core/sanitizer.js";


export function convertSQLToAst(filterString, SampleData = null, enableConsoleLogs = false) {
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

// export function parseFilterString(filterString, sampleData = null) {
//     if (filterString.toUpperCase().startsWith("SELECT")) return null; // Skip full SQL queries

//     let { sanitizedSQL, extractedVariables } = sanitizeQuery(filterString);
//     console.log("Sanitized SQL:", sanitizedSQL, "\n");

//     const parsedResult = parse(sanitizedSQL, extractedVariables);
//     extractedVariables = parsedResult.variables;
//     console.log("Extracted Variables:", JSON.stringify(extractedVariables, null, 2), "\n");

//     const astTree = parsedResult.ast;
//     console.log("AST Tree:", JSON.stringify(astTree, null, 2), "\n");

//     return convertToDevExpressFormat({ ast: astTree, variables: extractedVariables, resultObject: sampleData });
// }

// Example usage
// const devExpressFilter = parseFilterString("((ISNULL({0}, 0) = 0 AND CompanyID = {1}) OR CompanyID IS NULL) OR BranchID = {0} | [LeadDocument.BranchID] | [LeadDocument.CompanyID]", sampleResultObject);
// const devExpressFilter = parseFilterString("FromDate <= '{TransferOutwardDocument.DocDate}' ", sampleResultObject, "TransferOutwardDocument", "789");
// const devExpressFilter = parseFilterString("(RS2ID in ({SaleOrderStatusStmtGlobalRpt.StateID}) Or ({SaleOrderStatusStmtGlobalRpt.StateID} =0)) And (RS3ID  in (0,{SaleOrderStatusStmtGlobalRpt.RegionID}) Or {SaleOrderStatusStmtGlobalRpt.RegionID} =0 )", sampleResultObject,);

// console.log("DevExpress Filter:", JSON.stringify(devExpressFilter, null, 2));
