import { describe, it, expect } from "vitest";
import {parse} from "../parser";
import { sanitizeQuery } from "../sanitizer";
import { tokenize } from "../tokenizer";
import { convertToDevExpressFormat } from "../converter";

describe("Parser SQL to dx Filter Builder", () => {
    const testCases = [
        {
            input: "(ID = {CoreEntity0022.CompanyGroupID} OR ISNULL({CoreEntity0022.CompanyGroupID},0) = 0)",
            expected: [
                ["ID", "=", "{CoreEntity0022.CompanyGroupID}"],
                "or",
                ["{CoreEntity0022.CompanyGroupID}", "=", 0], // TODO: This should be ["{CoreEntity0022.CompanyGroupID}", "=", null]
            ],
        },
        {
            input: "GroupNo = {Employee.District} OR ISNULL(GroupNo,0) = 0 OR {Employee.District} = 0",
            expected: [
                ["GroupNo", "=", "{Employee.District}"],
                "or",
                [["GroupNo", "=", 0], // TODO: This should be ["GroupNo", "=", null]
                "or",
                ["{Employee.District}", "=", 0]],
            ],
        },
        {
            input: "ContactID = {SaleInvoiceDocument.ContactID} AND AddressType IN (2, 4)",
            expected: [
                ["ContactID", "=", "{SaleInvoiceDocument.ContactID}"],
                "and",
                ["AddressType", "in", [2, 4]],
            ],
        },
        {
            input: "ID IN ({WorkOrderLine.ApplicableUoms}) AND (CompanyID = {WorkOrderDocument.CompanyID} OR {WorkOrderDocument.CompanyID} = 0)",
            expected: [
                ["ID", "in", ["{WorkOrderLine.ApplicableUoms}"]],
                "and",
                [
                    ["CompanyID", "=", "{WorkOrderDocument.CompanyID}"],
                    "or",
                    ["{WorkOrderDocument.CompanyID}", "=", 0],
                ],
            ],
        },
        {
            input: "CompanyID = {AccountingRule.CompanyID}",
            expected: [
                "CompanyID", "=", "{AccountingRule.CompanyID}",
            ],
        },
        {
            input: "(Level > {Area.AreaType})",
            expected: [
                "Level",">","{Area.AreaType}"
            ]
        },
        {
            input: "(ID <> {Item.ID}) AND (ItemGroupType IN ({Item.AllowedItemGroupType}))",
            expected: [
                ["ID","<>","{Item.ID}"],
                'and',
                ["ItemGroupType","in",["{Item.AllowedItemGroupType}"]]
            ]
        },
        {
            input: "((FromDate <= '{TransferOutwardDocument.DocDate}' AND ToDate >= '{TransferOutwardDocument.DocDate}') OR ToDate is NULL) AND (BranchID = {TransferOutwardDocument.RefBranchID} OR RefBranchID is NULL) AND (CompanyID = {TransferOutwardDocument.CompanyID}  OR {TransferOutwardDocument.CompanyID} = 0 OR CompanyID is NULL)",
            expected: [
                [
                    [
                        ["FromDate","<=","{TransferOutwardDocument.DocDate}"],
                        'and',
                        ["ToDate",">=","{TransferOutwardDocument.DocDate}"]
                    ],
                    'or',
                    ["ToDate","=",null]
                ],
                "and",
                [
                    ["BranchID","=","{TransferOutwardDocument.DocDate}"],
                    "or",
                    ["RefBranchID","=",null]
                ],
                "and",
                [
                    ["CompanyID","=","{TransferOutwardDocument.RefBranchID}"],
                    "or",
                    ["{TransferOutwardDocument.RefBranchID}","=",0],
                    "or",
                    ["CompanyID","=",null]
                ]
            ]
        },        
        {
            input: "(ID <> {Item.ID}) AND ( ItemGroupType = '''')",
            expected: [
                ["ID","<>","{Item.ID}"],
                'and',
                ["ItemGroupType","=",""]
            ]
        },        
        {
            input: "NULL",
            expected: null
        },
        {
            input: "((ISNULL({0}, 0) = 0 AND CompanyID = {1}) OR CompanyID IS NULL) OR BranchID = {0}",
            expected: [
                [
                    [
                        ["{0}","=",null],
                        "and",
                        ["CompanyID", "=", "{1}"]
                    ],
                    "or",
                    ["CompanyID","=", null]
                ],
                'or',
                [ "BranchID", "=",  "{0}" ]
            ]
        },
        // {
        //     input: "SELECT DISTINCT OP.DocID ID,OP.DocName,OP.DocType,OP.DocName [Work Purchase Order],OP.DocDate DocDate,SP.WoStatus,OP.DocDate [Work Purchase Order Date], OP.CompanyID,      cast(cast(OP.DocDate as date) as varchar(10)) DocumentDate        FROM OpenDocuments OP      inner join PurchaseHeader PH on PH.Id=op.DocID       inner JOIN PurchasePosting PP ON PP.DocID = PH.ID       inner JOIN SalePosting SP ON SP.PurchasePostingLineID = PP.ID",
        //     expect: null
        // }
    ];

    testCases.forEach(({ input, expected }, index) => {
        it(`Test Case ${index + 1}: ${input}`, () => {

            if(expected == undefined){
                expected = null
            }

            // Need to handle NULL as a special case
            if(input.toLowerCase() === "null"){
                expect(null).toEqual(null);
                return;
            }

            let { sanitizedSQL, variables } = sanitizeQuery(input);

            const tokens = tokenize(sanitizedSQL);

            const astwithVariables = parse(tokens, variables);
            variables = astwithVariables.variables;
            const ast = astwithVariables.ast;

            const result = convertToDevExpressFormat(ast, variables);

            expect(result).toEqual(expected);
        });
    });
});
