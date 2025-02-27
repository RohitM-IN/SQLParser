function sanitizeQuery(sql) {
    // First check if the SQL has the pipe format for placeholders
    if (sql.includes("|")) {
        const [mainQuery, ...placeholderSections] = sql.split("|").map(s => s.trim());
        const variables = [];

        // Extract placeholders from | [arg1] | [arg2] sections
        placeholderSections.forEach(section => {
            if (section.startsWith("[") && section.endsWith("]")) {
                const placeholders = section
                    .slice(1, -1) // Remove [ and ]
                    .split(",")
                    .map(s => s.trim());
                variables.push(...placeholders);
            }
        });

        // Replace {0}, {1}, etc., with variable names
        const sanitizedSQL = mainQuery.replace(/\{(\d+)\}/g, (_, index) => {
            return variables[index] ? `{${variables[index]}}` : `{placeholder${index}}`;
        });

        return { sanitizedSQL, variables };
    } 
    // Handle SQL with directly embedded placeholders like {WorkOrderLine.ApplicableUoms}
    else {
        const variables = [];
        const placeholderRegex = /\{([^}]+)\}/g;
        let match;
        
        // Extract all placeholders
        while ((match = placeholderRegex.exec(sql)) !== null) {
            const placeholder = match[1];
            if (!variables.includes(placeholder)) {
                variables.push(placeholder);
            }
        }
        
        return { sanitizedSQL: sql, variables };
    }
}

export { sanitizeQuery };