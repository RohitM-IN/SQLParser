# SQLParser

SQLParser is a JavaScript library that converts SQL `WHERE` clauses into a structured **Abstract Syntax Tree (AST)** and transforms them into DevExpress filter format. It removes inline parameters while preserving them as dynamic variables for flexible query processing.

## Features

- **AST-Based Query Processing**: Parses `WHERE` clauses and generates a structured AST.
- **Supports Dynamic Parameters**: Identifies and extracts placeholders (`{param}`) for dynamic resolution.
- **Parameter Cleanup**: Removes inline parameters while maintaining their structure.
- **DevExpress-Compatible Output**: Converts parsed SQL conditions into the DevExpress filter format.
- **Short-Circuit Optimization**: By default, eliminates `value = value` expressions for DevExpress compatibility (can be disabled for performance optimization).
- **Separation of Concerns**: Generate AST once, then use it for multiple state updates.

## Installation

```sh
npm install sqlparser-devexpress
```

## Example Workflow

### **Step 1: Input SQL**

```sql
WHERE OrderID = {CustomerOrders.OrderID} AND Status IN (1, 3)
```

### **Step 2: Generate AST**

```javascript
import { convertSQLToAst } from "sqlparser-devexpress";

const sqlQuery = "OrderID = {CustomerOrders.OrderID} AND Status IN (1, 3)";
const { ast, variables } = convertSQLToAst(sqlQuery, true); // Enable logs
```

#### **AST Output**

```json
{
  "type": "logical",
  "operator": "AND",
  "left": {
    "type": "comparison",
    "field": "OrderID",
    "operator": "=",
    "value": {
      "type": "placeholder",
      "value": "CustomerOrders.OrderID"
    }
  },
  "right": {
    "type": "comparison",
    "field": "Status",
    "operator": "in",
    "value": {
      "type": "value",
      "value": [1, 3]
    }
  }
}
```

#### Extracted Variables  

The parser identifies placeholders within the SQL query and extracts them for dynamic value resolution.  

#### **Example Output:**  
```json
[
  "CustomerOrders.OrderID"
]
```  

These extracted variables can be used to fetch the corresponding state values in the application. You can store them in a `Record<string, any>`, where the key is the placeholder name, and the value is the resolved data from the application's state.

### **Step 3: Convert AST to DevExpress Format**

```javascript
import { convertAstToDevextreme } from "sqlparser-devexpress";

const sampleState = {
    "CustomerOrders.OrderID": 76548
};

const devexpressFilter = convertAstToDevextreme(ast, sampleState, true); // Short-circuit enabled (default)

console.log("DevExpress Filter:", JSON.stringify(devexpressFilter, null, 2));
```

#### **DevExpress Filter Output**

```json
[
  ["OrderID", "=", 76548],
  "and",
  [
    ["Status", "=", 1],
    "or",
    ["Status", "=", 3]
  ]
]
```

## API Reference

### `convertSQLToAst(filterString, enableConsoleLogs = false)`

- **Input:** SQL `WHERE` clause as a string.
- **Output:** An object `{ ast }` where:
  - `ast`: The parsed Abstract Syntax Tree.
- **Example:**
  ```javascript
  const { ast } = convertSQLToAst("OrderID = {CustomerOrders.OrderID} AND Status IN (1, 3)");
  ```

### `convertAstToDevextreme(ast, state, shortCircuit = true)`

- **Input:**
  - `ast`: The AST generated from `convertSQLToAst()`.
  - `state`: An object containing values for placeholders.
  - `shortCircuit`: (Optional, default `true`) Enables short-circuiting of `value = value` expressions for DevExpress compatibility.
- **Output:** DevExpress filter array.
- **Example:**
  ```javascript
  const devexpressFilter = convertAstToDevextreme(ast, sampleState, false); // Disables short-circuiting
  ```

### **DevExtreme with React Example**

To see an example of how to use `sqlparser-devexpress` with DevExtreme DataGrid in React, check out the live example on CodeSandbox:

[DevExtreme DataGrid with SQL Filter Example](https://codesandbox.io/p/sandbox/with-data-grid-with-sql-as-filter-string-my64v2)

In this example, SQL `WHERE` clauses are parsed into an Abstract Syntax Tree (AST) and then transformed into a DevExpress-compatible filter format that is used directly in the DataGrid component for filtering data. 

## Roadmap

- Support for additional SQL operators and functions.
- Improved error handling and validation.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

MIT

