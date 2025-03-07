export type StateDataObject = Record<string, any>;

export interface SanitizedQuery {
    sanitizedSQL: string;
    extractedVariables: string[];
}

export interface ParsedResult {
    ast: any; // Define a more specific type if possible
    variables: string[];
}

export interface ConvertToDevExpressFormatParams {
    ast: any; // Define a more specific type if possible
    resultObject: StateDataObject;
    enableShortCircuit?: boolean;
}

export function sanitizeQuery(filterString: string): SanitizedQuery;

export function parse(query: string, variables: string[]): ParsedResult;

export function convertToDevExpressFormat(params: ConvertToDevExpressFormatParams): any;

export function convertSQLToAst(
    filterString: string,
    SampleData?: StateDataObject | null,
    enableConsoleLogs?: boolean
): ParsedResult;

export function convertAstToDevextreme(
    ast: any, // Define a more specific type if possible
    state: StateDataObject,
    enableShortCircuit?: boolean,
): any;
