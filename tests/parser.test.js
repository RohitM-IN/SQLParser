import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { convertAstToDevextreme, convertSQLToAst } from "../src";

// Shared with the C# DevexpressFilterParser tests (SQLParserTests), which render each 'filter' back to SQL.
const { groups, variables, converterOptions } = JSON.parse(
    readFileSync(new URL("./fixtures/FilterCases.json", import.meta.url), "utf8")
);

// A text field is either a single string or an array of lines.
const joinLines = (text, separator) => Array.isArray(text) ? text.join(separator) : text;

describe("Parser SQL to dx Filter Builder", () => {
    groups.forEach(({ name, cases }) => {
        describe(name, () => {
            cases.forEach(({ id, input, filter, skip }) => {
                const sql = joinLines(input, "\n");
                const test = skip?.js ? it.skip : it;

                test(`Test Case ${id}: ${sql}`, () => {
                    const expected = filter ?? null;

                    const astwithVariables = convertSQLToAst(sql);

                    if (astwithVariables == null) {
                        expect(null).toEqual(expected);
                        return;
                    }

                    const result = convertAstToDevextreme(astwithVariables.ast, variables, converterOptions);

                    if (result == null || result == true || result == false) {
                        expect([]).toEqual(expected);
                        return;
                    }

                    expect(result).toEqual(expected);
                });
            });
        });
    });
});
