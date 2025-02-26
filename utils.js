export function replacePlaceholders(sql, staticValues = {}, dynamicValues = []) {
    // Replace static placeholders (e.g., {0})
    sql = sql.replace(/\{(\w+)\}/g, (_, key) => staticValues[key] ?? `{${key}}`);

    // Replace dynamic placeholders (e.g., | [AccountTaxPaymentDocument.CompanyID])
    sql = sql.replace(/\|\s*\[([^\]]+)\]/g, (_, keys) => {
        const replacements = keys.split(",").map(key => dynamicValues.shift() ?? `{${key.trim()}}`);
        return replacements.join(", ");
    });

    return sql;
}

module.exports = { replacePlaceholders };