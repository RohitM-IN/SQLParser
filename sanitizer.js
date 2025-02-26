function sanitizeQuery(sql) {
    const [mainQuery, ...placeholderSections] = sql.split("|").map(s => s.trim());
    const variables = [];

    // Extract placeholders from | [arg1] | [arg2] sections
    placeholderSections.forEach(section => {
        const placeholders = section
            .slice(1, -1) // Remove [ and ]
            .split(",")
            .map(s => s.trim());
        variables.push(...placeholders);
    });

    // Replace {0}, {1}, etc., with variable names
    const sanitizedSQL = mainQuery.replace(/\{(\d+)\}/g, (_, index) => {
        return `{${variables[index]}}`;
    });

    return { sanitizedSQL, variables };
}

export { sanitizeQuery };