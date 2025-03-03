// Define regex patterns for different token types
const tokenPatterns = {
  whitespace: "\\s+", // Matches spaces, tabs, and newlines
  function: "\\b(ISNULL)\\b", // Matches function names like ISNULL (case-insensitive)
  null: "\\bNULL\\b", // Matches NULL as a keyword
  number: "\\d+", // Matches numerical values
  placeholder: "'?\\{[^}]+\\}'?", // Matches placeholders like {variable} or '{variable}'
  string: "'(?:''|[^'])*'", // Matches strings, allowing for escaped single quotes ('')
  operator: "=>|<=|!=|>=|=|<>|>|<|AND|OR|BETWEEN|IN|LIKE|IS", // Matches SQL operators and logical keywords
  identifier: "[\\w.]+", // Matches identifiers, including table.column format
  paren: "[()]", // Matches parentheses
  comma: "," // Matches commas
};

// Create a Map for O(1) token type lookup
const tokenTypeMap = new Map(Object.entries(tokenPatterns));

// Combine all token patterns into a single regular expression using named capture groups
const combinedRegex = new RegExp(
  [...tokenTypeMap.keys()].map(name => `(?<${name}>${tokenPatterns[name]})`).join("|"),
  "iy" // 'i' makes it case-insensitive, 'y' ensures it matches from the current index
);

class Tokenizer {
  constructor(input) {
    this.input = input; // The input SQL-like string to be tokenized
    this.index = 0; // Tracks the current position in the input
  }

  nextToken() {
    if (this.index >= this.input.length) return null; // Stop if we've reached the end

    combinedRegex.lastIndex = this.index; // Ensure regex starts from the current index
    const match = combinedRegex.exec(this.input); // Execute regex to find the next token

    if (match) {
      this.index = combinedRegex.lastIndex; // Move index to the end of the matched token

      // Find the first matched token type in O(1) time using the tokenTypeMap
      const type = [...tokenTypeMap.keys()].find(name => match.groups[name] !== undefined);

      // Skip whitespace tokens
      if (!type || type === "whitespace") return this.nextToken(); 

      let value = match.groups[type];

      // Remove surrounding single quotes from placeholders
      if (type === "placeholder") value = value.replace(/^['"]|['"]$/g, "");

      return { type, value };
    }

    // If no valid token is found, throw an error with the remaining input for debugging
    throw new Error(`Unexpected token at: ${this.input.slice(this.index)}`);
  }
}

export { Tokenizer };
