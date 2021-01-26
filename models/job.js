"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Job {

    // Checks to see if matching job already exists and throws error if so
    static async dupeCheck({ title, salary, equity, company_handle }) {
        const result = await db.query(
            `SELECT title, salary, equity, company_handle
           FROM jobs
           WHERE title = $1 AND salary = $2 AND equity = $3 AND company_handle = $4`, [title, salary, equity, company_handle]
        );
        if (result.rows.length !== 0) throw new BadRequestError(`Duplicate Error, job already exists`);
    }

    /** Create a job (from data), update db, return new company data.
     *
     * data should be { title, salary, equity, company_handle }
     *
     * Returns { id, title, salary, equity, company_handle }
     * */
    static async create({ title, salary, equity, company_handle }) {
        await this.dupeCheck({ title, salary, equity, company_handle });
        const result = await db.query(
            `INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING id, title, salary, equity, company_handle`, [title, salary, equity, company_handle]
        );
        const job = result.rows[0];

        return job;
    }

    /** Find all jobs. Optional filter parameters using query strings
     *  filter paramters include: title, minSalary, hasEquity, company_handle
     *
     * Returns [{ id, title, salary, equity, company_handle }, ...]
     * 
     * */

    static async findAll(queryFilters = {}) {
        const { sqlString, sqlValues } = handleFiltering(queryFilters);
        const jobsRes = await db.query(
            `SELECT id,
                  title,
                  salary,
                  equity,
                  company_handle
           FROM jobs
            ${sqlString}
           ORDER BY title`,
            sqlValues
        );

        return jobsRes.rows;
    }

    /** Given a job title, return data about jobs.
     *
     * Returns { id, title, salary, equity, company_handle }
     *  
     *
     * Throws NotFoundError if not found.
     **/
    static async get(id) {
        try {
            const jobRes = await db.query(
                `SELECT id,
                title,
                salary,
                equity,
                company_handle
              FROM jobs
              WHERE id = $1`, [id]
            );

            const job = jobRes.rows[0];
            if (!job) throw new NotFoundError(`No job with ID: ${id}`);

            return job;
        } catch (err) {
            throw new NotFoundError(`No job with ID: ${id}`);
        }

    }

    /** Update job data with `data`.
     *
     * This is a "partial update" --- it's fine if data doesn't contain all the
     * fields; this only changes provided ones.
     *
     * Data can include: {title, salary, equity, company_handle}
     *
     * Returns {id, title, salary, equity, company_handle}
     *
     * Throws NotFoundError if not found.
     */
    static async update(id, data) {
        const { setCols, values } = sqlForPartialUpdate(data);
        const idVarIdx = "$" + (values.length + 1);

        try {
            const querySql = `UPDATE jobs
                        SET ${setCols} 
                        WHERE id = ${idVarIdx} 
                        RETURNING id, 
                                  title, 
                                  salary, 
                                  equity, 
                                  company_handle`;
            const result = await db.query(querySql, [...values, id]);
            const job = result.rows[0];

            if (!job) throw new NotFoundError(`No job with id: ${id}`);

            return job;
        } catch (err) {
            throw new NotFoundError(`No job with ID: ${id}`);
        }

    }

    /** Delete given company from database; returns undefined.
     *
     * Throws NotFoundError if company not found.
     **/
    static async remove(id) {
        try {
            const result = await db.query(
                `DELETE
            FROM jobs
            WHERE id = $1
            RETURNING id`, [id]
            );
            const job = result.rows[0];

            if (!job) throw new NotFoundError(`No job with id: ${id}`);
        } catch (err) {
            throw new NotFoundError(`No job with id: ${id}`);
        }
    }
}

// Construct a string to include in the SQL query based on given query strings (filters)
// checks for title, minSalary, hasEquity, company_handle
function handleFiltering(queryFilters) {
    let idxCounter = 0;
    const sqlStatements = []
    const sqlValues = []
    if (queryFilters.title) {
        idxCounter++;
        sqlStatements.push(`LOWER(title) LIKE LOWER($${idxCounter})`);
        sqlValues.push(`%${queryFilters.title}%`);
    }
    if (queryFilters.minSalary) {
        idxCounter++;
        sqlStatements.push(`salary >= $${idxCounter}`);
        sqlValues.push(queryFilters.minSalary);
    }
    if (queryFilters.hasEquity === "true") {
        idxCounter++;
        sqlStatements.push(`equity > $${idxCounter}`);
        sqlValues.push(0);
    }
    if (queryFilters.company_handle) {
        idxCounter++;
        sqlStatements.push(`company_handle = $${idxCounter}`);
        sqlValues.push(queryFilters.company_handle);
    }

    if (queryFilters.minEmployees > queryFilters.maxEmployees) {
        throw new BadRequestError(`Invalid parameters: minEmployees cannot be greater than maxEmployees`);
    }

    let sqlString = sqlStatements.length > 0 ? "WHERE " + sqlStatements.join(" AND ") : ""
    return { sqlString, sqlValues }
}


module.exports = Job;