import { describe, expect, it } from "vitest";
import { convertToDevExpressFormat } from "../src/core/converter";
import { parse } from "../src/core/parser";
import { sanitizeQuery } from "../src/core/sanitizer";
import { convertAstToDevextreme, convertSQLToAst } from "../src";

describe("Parser SQL to dx Filter Builder", () => {
    const testCases = [
        {
            input: "(ID = {CoreEntity0022.CompanyGroupID} OR ISNULL({CoreEntity0022.CompanyGroupID},0) = 0)",
            expected: [
                // [
                "ID", "=", 42
                // ],
                // "or",
                // [42, "=", null], 
            ],
        },
        {
            input: "GroupNo = {Employee.District} OR ISNULL(GroupNo,0) = 0 OR {Employee.District} = 0",
            expected: [
                // ["GroupNo", "=", 0],
                // "or",
                // ["GroupNo", "=", null],
                // "or",
                // [0, "=", 0],
            ],
        },
        {
            input: "ContactID = {SaleInvoiceDocument.ContactID} AND AddressType IN (2, 4)",
            expected: [
                ["ContactID", "=", 42],
                "and",
                [["AddressType", "=", 2], 'or', ["AddressType", "=", 4]],
            ],
        },
        {
            input: "ID IN ({WorkOrderLine.ApplicableUoms}) AND (CompanyID = {WorkOrderDocument.CompanyID} OR {WorkOrderDocument.CompanyID} = 0)",
            expected: [
                [["ID", "=", "UOM1"], 'or', ["ID", "=", "UOM2"], 'or', ["ID", "=", "UOM3"]],
                "and",
                // [
                ["CompanyID", "=", 42],
                // "or",
                // [42, "=", 0],
                // ],
            ],
        },
        {
            input: "CompanyID = {AccountingRule.CompanyID}",
            expected: [
                "CompanyID", "=", 42,
            ],
        },
        {
            input: "(Level > {Area.AreaType})",
            expected: [
                "Level", ">", 42
            ]
        },
        {
            input: "(ID <> {Item.ID}) AND (ItemGroupType IN ({Item.AllowedItemGroupType}))",
            expected: [
                ["ID", "<>", 42],
                'and',
                [["ItemGroupType", "=", "1"], 'or', ["ItemGroupType", "=", "2"]]
            ]
        },
        {
            input: "((FromDate <= '{TransferOutwardDocument.DocDate}' AND ToDate >= '{TransferOutwardDocument.DocDate}') OR ToDate is NULL) AND (BranchID = {TransferOutwardDocument.RefBranchID} OR RefBranchID is NULL) AND (CompanyID = {TransferOutwardDocument.CompanyID}  OR {TransferOutwardDocument.CompanyID} = 0 OR CompanyID is NULL)",
            expected: [
                [
                    [
                        ["FromDate", "<=", "2022-01-01"],
                        'and',
                        ["ToDate", ">=", "2022-01-01"]
                    ],
                    'or',
                    ["ToDate", "=", null]
                ],
                "and",
                [
                    ["BranchID", "=", 42],
                    "or",
                    ["RefBranchID", "=", null]
                ],
                "and",
                [
                    ["CompanyID", "=", 7],
                    // "or",
                    // [7,"=",0],
                    "or",
                    ["CompanyID", "=", null]
                ]
            ]
        },
        {
            input: "(ID <> {Item.ID}) AND ( ItemGroupType = '''')",
            expected: [
                ["ID", "<>", 42],
                'and',
                ["ItemGroupType", "=", ""]
            ]
        },
        {
            input: "((ISNULL({0}, 0) = 0 AND CompanyID = {1}) OR CompanyID IS NULL) OR BranchID = {0} | [LeadDocument.BranchID] | [LeadDocument.CompanyID]",
            expected: [
                // [
                // [
                // [42,"=",null],
                // "and",
                ["CompanyID", "=", 7],
                // ],
                "or",
                ["CompanyID", "=", null],
                // ],
                'or',
                ["BranchID", "=", 42]
            ]
        },
        {
            input: "FromDate Between '10-10-2021' AND '10-10-2022'",
            expected: [
                "FromDate", "between", ["10-10-2021", "10-10-2022"]
            ]
        },
        {
            input: "BranchID is Null OR BranchID is not 12",
            expected: [
                ["BranchID", "=", null],
                "or",
                ["BranchID", "!=", 12]
            ]
        },
        {
            input: "ISNULL(SourceID,0) = {ServiceOrderDocument.SourceID} OR ISNULL(SourceID,0) = 0",
            expected: [
                ["SourceID", "=", 2],
                "or",
                ["SourceID", "=", null, { "defaultValue": 0, "type": "ISNULL" }, null],
                "or",
                ["SourceID", "=", 0],
                "or",
                ["SourceID", "=", null, { "defaultValue": 0, "type": "ISNULL" }, null]
            ]
        },
        {
            input: "(CompanyID = {LeadDocument.CompanyID} OR ISNULL(CompanyID,0) = 0) AND (ISNULL(IsSubdealer,0) = {LeadDocument.AllowSubDealer})",
            expected: [
                [
                    ["CompanyID", "=", 7],
                    "or",
                    [
                        ["CompanyID", "=", 0],
                        "or",
                        ["CompanyID", "=", null, { "defaultValue": 0, "type": "ISNULL" }, null]
                    ]
                ],
                "and",
                [
                    ["IsSubdealer", "=", true],
                    "or",
                    ["IsSubdealer", "=", null, { "defaultValue": 0, "type": "ISNULL" }, null]
                ]
            ]
        },
        {
            input: 'AddressType NOT IN (2, 4)',
            expected: [
                ["AddressType", "!=", 2],
                "and",
                ["AddressType", "!=", 4]
            ]
        },
        {
            input: "AddressType IN ('2', ('4')) OR AddressType =({ServiceOrderDocument .SourceID})",
            expected: [
                ["AddressType", "=", '2'],
                "or",
                ["AddressType", "=", '4'],
                "or",
                ["AddressType", "=", 2]
            ]
        },
        {
            input: "(ISNULL(TicketID, 0) = ISNULL({SupportResolution.TicketID}, 0))",
            expected: [
                ["TicketID", "=", 123],
                "or",
                ["TicketID", "=", null, { "defaultValue": 0, "type": "ISNULL" }, null]
            ]
        },
        {
            input: "CompanyID = ISNULL({LeadDocument.CompanyID},0) OR (ISNULL(CompanyID,0) = 0))",
            expected: [
                ["CompanyID", "=", 7],
                "or",
                ["CompanyID", "=", null, { "defaultValue": 0, "type": "ISNULL" }, null],
                "or",
                ["CompanyID", "=", 0],
                "or",
                ["CompanyID", "=", null, { "defaultValue": 0, "type": "ISNULL" }, null]

            ]
        },
        {
            input: "CompanyName like '{LeadDocument.CompanyID}' AND BranchName not like '{LeadDocument.BranchID}'",
            expected: [
                ["CompanyName", "contains", "7"],
                "and",
                ["BranchName", "notcontains", "42"]
            ]
        }
    ];

    testCases.forEach(({ input, expected }, index) => {
        it(`Test Case ${index + 1}: ${input}`, () => {

            if (expected == undefined) {
                expected = null
            }

            let astwithVariables;
            astwithVariables = convertSQLToAst(input);


            if (astwithVariables == null) {
                expect(null).toEqual(expected);
                return;
            }

            const variables = astwithVariables.variables;
            const ast = astwithVariables.ast;

            const result = convertAstToDevextreme(ast, sampleData);

            if (result == null || result == true || result == false) {
                expect([]).toEqual(expected);
                return;
            }

            expect(result).toEqual(expected);
        });
    });
});


const sampleData = {
    "CoreEntity0022.CompanyGroupID": 42,
    "CoreEntity0022.BranchID": 7,
    "Employee.District": 0,
    "Employee.BranchID": 7,
    "SaleInvoiceDocument.ContactID": 42,
    "SaleInvoiceDocument.BranchID": 7,
    "AccountingRule.CompanyID": 42,
    "AccountingRule.BranchID": 7,
    "Area.AreaType": 42,
    "Area.BranchID": 7,
    "Item.ID": 42,
    "Item.BranchID": 7,
    "Item.AllowedItemGroupType": "1,2",
    "WorkOrderLine.ApplicableUoms": ["UOM1", "UOM2", "UOM3"],
    "WorkOrderLine.CompanyID": 2,
    "WorkOrderDocument.CompanyID": 42,
    "WorkOrderDocument.BranchID": 7,
    "TransferOutwardDocument.DocDate": "2022-01-01",
    "TransferOutwardDocument.RefBranchID": 42,
    "TransferOutwardDocument.CompanyID": 7,
    "LeadDocument.BranchID": 42,
    "LeadDocument.CompanyID": 7,
    "ServiceOrderDocument.SourceID": 2,
    "LeadDocument.AllowSubDealer": true,
    "SupportResolution.TicketID": 123
};