const precedence = { "OR": 1, "AND": 2, "=": 3, "!=": 3, ">": 3, "<": 3, ">=": 3, "<=": 3, "IN": 3, "<>": 3, "LIKE": 3, "IS": 3, "BETWEEN": 3 };

function parse(tokens, variables) {
    let index = 0;

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
        // Handle parenthesized expressions
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
                args.push(parseExpression());
                if (tokens[index]?.value === ",") index++;
            }
            index++; // Consume )
            return { type: "function", name: funcName, args };
        }

        // Handle literal values (number, string, null)
        if (tokens[index]?.type === 'number' || tokens[index]?.type === 'string' || tokens[index]?.type === 'null') {
            const value = parseValue();
            return { type: "value", value: value };
        }

        // Handle field comparisons
        const field = parseValue();
        const operatorToken = tokens[index];
        
        if (operatorToken?.type === "operator") {
            index++;
            const value = parseValue(operatorToken);
            return { type: "comparison", field, operator: operatorToken.value, value };
        }

        return { type: "field", value: field };
    }

    function parseValue(operatorToken) {
        const token = tokens[index++];
        
        if (!token) throw new Error("Unexpected end of input");
        
        if (token.type === "number") return Number(token.value);
        if (token.type === "string") return token.value.slice(1, -1).replace(/''/g, "");
        if (token.type === "identifier") return token.value;
        if (token.type === "null") return null;
        
        if (token.type === "placeholder") {
            let val = token.value.slice(1, -1);
            if (!variables.includes(val)) {
                variables.push(val);
            }
            return { type: "placeholder", value: val };
        }
        
        // Handle IN operator
        if (operatorToken && operatorToken.value.toUpperCase() === 'IN') {
            if (tokens[index-1]?.value !== "(") throw new Error("Expected ( after IN");
            
            let values = [];
            while (index < tokens.length && tokens[index]?.value !== ")") {
                if (tokens[index]?.type === "comma") {
                    index++;
                    continue;
                }
                values.push(parseValue());
            }
            
            if (tokens[index]?.value === ")") index++; // Consume closing parenthesis
            return { type: "value", value: values };
        }
        
        throw new Error(`Unexpected value: ${token.value}`);
    }

    return { ast: parseExpression(), variables };
}

export { parse };