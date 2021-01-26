"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
    /** Create a company (from data), update db, return new company data.
     *
     * data should be { handle, name, description, numEmployees, logoUrl }
     *
     * Returns { handle, name, description, numEmployees, logoUrl }
     *
     * Throws BadRequestError if company already in database.
     * */

    static async create({ handle, name, description, numEmployees, logoUrl }) {
        const duplicateCheck = await db.query(
            `SELECT handle
           FROM companies
           WHERE handle = $1`, [handle]);

        if (duplicateCheck.rows[0])
            throw new BadRequestError(`Duplicate company: ${handle}`);

        const result = await db.query(
            `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`, [
                handle,
                name,
                description,
                numEmployees,
                logoUrl,
            ],
        );
        const company = result.rows[0];

        return company;
    }

    /** Find all companies. Optional filter parameters using query strings
     *  filter paramters include: name, minEmployees, maxEmployees
     *
     * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
     * */

    static async findAll(queryFilters = {}) {
        const { sqlString, sqlValues } = handleFiltering(queryFilters);

        const companiesRes = await db.query(
            `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
            ${sqlString}
           ORDER BY name`,
            sqlValues
        );
        return companiesRes.rows;
    }

    /** Given a company handle, return data about company.
     *
     * Returns { handle, name, description, numEmployees, logoUrl, jobs }
     *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
     *
     * Throws NotFoundError if not found.
     **/

    static async get(handle) {
        const companyRes = await db.query(
            `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,

            [handle]);

        // SELECT name, json_agg(hobby) AS hobbies
        // FROM users AS u
        //   JOIN hobbies AS h ON (u.name = h.user_name)
        // GROUP BY name;

        const company = companyRes.rows[0];

        if (!company) throw new NotFoundError(`No company: ${handle}`);

        return company;
    }

    /** Update company data with `data`.
     *
     * This is a "partial update" --- it's fine if data doesn't contain all the
     * fields; this only changes provided ones.
     *
     * Data can include: {name, description, numEmployees, logoUrl}
     *
     * Returns {handle, name, description, numEmployees, logoUrl}
     *
     * Throws NotFoundError if not found.
     */

    static async update(handle, data) {
        const { setCols, values } = sqlForPartialUpdate(
            data, {
                numEmployees: "num_employees",
                logoUrl: "logo_url",
            });
        const handleVarIdx = "$" + (values.length + 1);

        const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
        const result = await db.query(querySql, [...values, handle]);
        const company = result.rows[0];

        if (!company) throw new NotFoundError(`No company: ${handle}`);

        return company;
    }

    /** Delete given company from database; returns undefined.
     *
     * Throws NotFoundError if company not found.
     **/

    static async remove(handle) {
        const result = await db.query(
            `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`, [handle]);
        const company = result.rows[0];

        if (!company) throw new NotFoundError(`No company: ${handle}`);
    }
}

// Construct a string to include in the SQL query based on given query strings
function handleFiltering(queryFilters) {
    let idxCounter = 0;
    const sqlStatements = []
    const sqlValues = []
    if (queryFilters.name) {
        idxCounter++;
        sqlStatements.push(`LOWER(name) LIKE LOWER($${idxCounter})`);
        sqlValues.push(`%${queryFilters.name}%`);
    }
    if (queryFilters.minEmployees) {
        idxCounter++;
        sqlStatements.push(`num_employees >= $${idxCounter}`);
        sqlValues.push(queryFilters.minEmployees);
    }
    if (queryFilters.maxEmployees) {
        idxCounter++;
        sqlStatements.push(`num_employees <= $${idxCounter}`);
        sqlValues.push(queryFilters.maxEmployees);
    }

    if (queryFilters.minEmployees > queryFilters.maxEmployees) {
        throw new BadRequestError(`Invalid parameters: minEmployees cannot be greater than maxEmployees`);
    }

    let sqlString = sqlStatements.length > 0 ? "WHERE " + sqlStatements.join(" AND ") : ""
    return { sqlString, sqlValues }
}


module.exports = Company;