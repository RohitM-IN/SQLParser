import { describe, expect, it } from "vitest";
import { convertAstToDevextreme, convertSQLToAst } from "../src";

describe("Parser SQL to dx Filter Builder", () => {
    const testCases = [
        {
            input: "NULL",
            expected: []
        },
        {
            input: "SELECT DISTINCT O.OrderID AS ID, O.CustomerName, O.OrderType, O.CustomerName AS [Online Order], O.OrderDate AS OrderDate, D.DeliveryStatus, O.OrderDate AS [Online Order Date], O.CompanyID, CAST(CAST(O.OrderDate AS DATE) AS VARCHAR(10)) AS DocumentDate FROM Orders O INNER JOIN Payment P ON P.OrderID = O.OrderID INNER JOIN Shipment S ON S.PaymentID = P.PaymentID INNER JOIN Delivery D ON D.ShipmentID = S.ShipmentID ",
            expect: null
        },
        {
            input: "CompanyID = CompanyID2 = {AccountingRule.CompanyID}",
            expected: "Error: Invalid comparison: CompanyID = CompanyID2",
        },
        {
            input: "( CompanyID = {AccountingRule.CompanyID}",
            expected: "Error: Missing closing parenthesis"
        }

    ];

    testCases.forEach(({ input, expected }, index) => {
        it(`Test Case ${index + 1}: ${input}`, () => {

            if (expected == undefined) {
                expected = null
            }

            let astwithVariables;
            try {
                astwithVariables = convertSQLToAst(input);
            } catch (error) {
                expect(error.message).toEqual(expected.replace("Error: ", ""));
                return;
            }

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
    "AccountingRule.CompanyID": 42,
};