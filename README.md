# SQLParser

SQLParser is a JavaScript library that converts SQL-like filter strings into DevExpress format filters. It provides utilities for parsing, sanitizing, and converting SQL-like expressions into a format that can be used with DevExpress components.

## Usage

### Convert SQL to AST

To convert a SQL-like filter string to an Abstract Syntax Tree (AST):

```javascript
const filterString= "(ID <> {Item.ID}) AND (ItemGroupType IN ({Item.AllowedItemGroupType}))";
const parsedResult = convertSQLToAst(filterString);
```

### Convert AST to DevExpress Format

To convert an AST to DevExpress format:

```javascript
const ast = { /* your AST here */ };
const variables = [/* your variables here */];
const state = { /* your state here */ };

const devExpressFilter = convertAstToDevextreme(ast, variables, state);

console.log(devExpressFilter);
```

