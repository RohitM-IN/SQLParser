// // Example usage
// // const devExpressFilter = parseFilterString("((ISNULL({0}, 0) = 0 AND CompanyID = {1}) OR CompanyID IS NULL) OR BranchID = {0} | [LeadDocument.BranchID] | [LeadDocument.CompanyID]", sampleResultObject);
// // const devExpressFilter = parseFilterString("FromDate <= '{TransferOutwardDocument.DocDate}' ", sampleResultObject, "TransferOutwardDocument", "789");
// // const devExpressFilter = parseFilterString("(RS2ID in ({SaleOrderStatusStmtGlobalRpt.StateID}) Or ({SaleOrderStatusStmtGlobalRpt.StateID} =0)) And (RS3ID  in (0,{SaleOrderStatusStmtGlobalRpt.RegionID}) Or {SaleOrderStatusStmtGlobalRpt.RegionID} =0 )", sampleResultObject,);

// import { convertToDevExpressFormat } from "./core/converter.js";
// import { parse } from "./core/parser.js";
// import { sanitizeQuery } from "./core/sanitizer.js";

// const sampleData = {
//     'LeadStatementGlobalRpt.StateID': null,
//     'LeadStatementGlobalRpt.RegionID': null,
//     'ServiceOrderDocument.SourceID': 2,
//     'CustomerOrders.OrderID': 76548
// }

// export function parseFilterString(filterString, sampleData = null) {
//     let { sanitizedSQL, extractedVariables } = sanitizeQuery(filterString);
//     console.log("Sanitized SQL:", sanitizedSQL, "\n");

//     const parsedResult = parse(sanitizedSQL, extractedVariables);
//     extractedVariables = parsedResult.variables;
//     console.log("Extracted Variables:", JSON.stringify(extractedVariables, null, 2), "\n");

//     const astTree = parsedResult.ast;
//     console.log("AST Tree:", JSON.stringify(astTree, null, 2), "\n");

//     return convertToDevExpressFormat({ ast: astTree, resultObject: sampleData });
// }

// const devexpress = parseFilterString("OrderID = {CustomerOrders.OrderID} AND Status IN (1, 3)", sampleData);
// console.log("DevExpress Filter:", JSON.stringify(devexpress, null, 2));
// // const devexpress = parseFilterString("(RS2ID in ({LeadStatementGlobalRpt.StateID}) Or ({LeadStatementGlobalRpt.StateID} =0)) And (RS3ID  in (0,{LeadStatementGlobalRpt.RegionID}) Or {LeadStatementGlobalRpt.RegionID} =0 )", sampleData);

// // const devExpressFilter = convertSQLToAst("(RS2ID in ({LeadStatementGlobalRpt.StateID}) Or ({LeadStatementGlobalRpt.StateID} =0)) And (RS3ID  in (0,{LeadStatementGlobalRpt.RegionID}) Or {LeadStatementGlobalRpt.RegionID} =0 ) ");
// // const devExpressFilterresult = convertAstToDevextreme(devExpressFilter.ast, devExpressFilter.variables, sampleData);
// // console.log("DevExpress Filter:", JSON.stringify(devExpressFilter, null, 2));
// // console.log("DevExpress Result:", JSON.stringify(devExpressFilterresult, null, 2));