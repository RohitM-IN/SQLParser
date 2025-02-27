const tokenTypes = [
    { type: "whitespace", regex: /^\s+/ },
    { type: "function", regex: /^\b(ISNULL)\b/i }, // Match functions like ISNULL
    { type: "null", regex: /^\bNULL\b/i }, // Match NULL as a standalone keyword
    { type: "number", regex: /^\d+/ },
    // New rule for quoted placeholder:
    { type: "placeholder", regex: /^'(\{[^}]+\})'/ },
    { type: "string", regex: /^'(''|[^'])*'/ }, // Handle escaped quotes
    { type: "operator", regex: /^(=>|<=|!=|>=|<=|=|<>|>|<|AND|OR|BETWEEN|IN|LIKE|IS)/i },
    { type: "identifier", regex: /^[\w.]+/i }, // Match identifiers with dots
    { type: "placeholder", regex: /^\{[^}]+\}/ }, 
    { type: "paren", regex: /^(\(|\))/ },
    { type: "comma", regex: /^,/ },
  ];
  
  function tokenize(input) {
    const tokens = [];
    let remainingInput = input;
  
    while (remainingInput.length > 0) {
      let matched = false;
  
      for (const { type, regex } of tokenTypes) {
        const match = regex.exec(remainingInput);
        if (match) {
          if (type !== "whitespace") {
            // For quoted placeholder, use the captured group (without quotes)
            if (type === "placeholder" && match.length > 1) {
              tokens.push({ type, value: match[1] });
            } else {
              tokens.push({ type, value: match[0] });
            }
          }
          remainingInput = remainingInput.slice(match[0].length);
          matched = true;
          break;
        }
      }
  
      if (!matched) {
        throw new Error(`Unexpected token at: ${remainingInput}`);
      }
    }
  
    return tokens;
  }
  
  export { tokenize };
  