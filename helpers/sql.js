const { BadRequestError } = require("../expressError");

// THIS NEEDS SOME GREAT DOCUMENTATION.

// accept an object in dataToUpdate and an object with key value pairs of the columns to update

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
    // example of dataToUpdate  = {name, description, numEmployees, logoUrl}
    // makes an array of the keys from the data we want to update which should be a column name
    const keys = Object.keys(dataToUpdate);
    // if the value here is 0 that means there is no columns that are trying to be updated and we throw an error
    if (keys.length === 0) throw new BadRequestError("No data");

    // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
    // make an array of the specific columns that we want to update
    const cols = keys.map((colName, idx) =>
        // checks to see which format the column name is in, accepts the first one to be true which should be in sql underscore format
        `"${jsToSql[colName] || colName}"=$${idx + 1}`,
    );
    // we return the columns after joining them as a string so we can insert them into our sql query in the SET portion
    // we should end up with SET $1,$2,$3 depending on how many fields are being updated

    return {
        setCols: cols.join(", "),
        values: Object.values(dataToUpdate),
    };
}

module.exports = { sqlForPartialUpdate };