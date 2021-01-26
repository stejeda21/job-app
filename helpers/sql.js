const { BadRequestError } = require("../expressError");

// Takes in an obj with data to be updated, and another object with values matching the keys corresponding SQL column name
// returns an error if obj is invalid or empty
// else, returns an object containing setCols - a string of SQL column assignments and values - an array of values that correspond to the SQL assignment statements

function sqlForPartialUpdate(dataToUpdate, jsToSql = {}) {
    const keys = Object.keys(dataToUpdate);
    if (keys.length === 0) throw new BadRequestError("No data");

    // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
    const cols = keys.map((colName, idx) =>
        `"${jsToSql[colName] || colName}"=$${idx + 1}`,
    );

    return {
        setCols: cols.join(", "),
        values: Object.values(dataToUpdate),
    };
}

module.exports = { sqlForPartialUpdate };