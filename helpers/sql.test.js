const { sqlForPartialUpdate } = require("./sql");

describe("sqlForPartialUpdate", function() {
    test("throws error: invalid data", function() {
        expect(() => {
            sqlForPartialUpdate({}, {});
        }).toThrow("No data");
    });


    test("works: valid data", function() {
        const dataToUpdate = {
            firstName: "Bob",
            lastName: "Donner"
        }
        const jsToSql = {
            firstName: "first_name",
            lastName: "last_name"
        }
        const { setCols, values } = sqlForPartialUpdate(dataToUpdate, jsToSql);
        expect(setCols).toEqual(`"${jsToSql.firstName}"=$1, "${jsToSql.lastName}"=$2`);
        expect(values).toEqual([dataToUpdate.firstName, dataToUpdate.lastName]);
    });
});