const precedence = { "OR": 1, "AND": 2, "=": 3, "!=": 3, ">": 3, "<": 3, ">=": 3, "<=": 3 };

function parse(tokens,variables) {
    let index = 0;

    // Modified parseExpression function in parser.js
    function parseExpression(minPrecedence = 0) {
        let left = parseTerm();
        while (index < tokens.length) {
            const token = tokens[index];
            if (token.type !== "operator" || precedence[token.value.toUpperCase()] < minPrecedence) break;
            const operator = token.value.toUpperCase();
            index++; // Advance index after operator
            const right = parseExpression(precedence[operator]);
            left = { type: "logical", operator, left, right };
        }
        return left;
    }

    function parseTerm() {
        if (tokens[index]?.value === "(") {
            index++;
            const expr = parseExpression();
            if (tokens[index]?.value !== ")") throw new Error("Missing closing parenthesis");
            index++;
            return expr;
        }

        // Handle ISNULL function
        if (tokens[index]?.type === "function") {
            const funcName = tokens[index].value.toUpperCase();
            index++;
            if (tokens[index]?.value !== "(") throw new Error(`Expected ( after ${funcName}`);
            index++;
            const args = [];
            while (tokens[index]?.value !== ")") {
                args.push(parseValue());
                if (tokens[index]?.value === ",") index++;
            }
            index++; // Consume )
            return { type: "function", name: funcName, args };
        }

        if (tokens[index]?.type == 'number' || tokens[index]?.type == 'string') {
            const value = parseValue();

            return { type: "value", value: value }
        }

        const field = parseValue();
        const operatorToken = tokens[index];
        if (operatorToken?.type === "operator") {
            index++;
            const value = parseValue();
            return { type: "comparison", field, operator: operatorToken.value, value };
        }


        throw new Error(`Unexpected token: ${tokens[index]?.value}`);
    }

    function parseValue() {
        const token = tokens[index++];
        if (token.type === "number") return Number(token.value);
        if (token.type === "string") return token.value.slice(1, -1).replace(/''/g, "'"); // Handle escaped quotes
        if (token.type === "identifier") return token.value;
        if (token.type === "placeholder") {
            let val = token.value.slice(1, -1);

            if(!variables.includes(val))
                variables.push(val);

            return { type: "placeholder", value: val }
        };
        throw new Error(`Unexpected value: ${token.value}`);
    }

    return {ast: parseExpression(), variables};
}

export { parse };