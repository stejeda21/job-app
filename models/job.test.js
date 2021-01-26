"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job");
const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function() {
    const newJob = {
        title: "jest job",
        salary: 60000,
        equity: 0,
        company_handle: "c1"
    };

    test("works", async function() {
        let job = await Job.create(newJob);
        expect(job).toEqual({
            ...newJob,
            equity: "0",
            id: expect.any(Number)
        });

        const result = await db.query(
            `SELECT title, salary, equity, company_handle
           FROM jobs
           WHERE title = 'jest job'`);
        expect(result.rows).toEqual([{
            title: "jest job",
            salary: 60000,
            equity: "0",
            company_handle: "c1"
        }, ]);
    });

    test("bad request with dupe", async function() {
        try {
            await Job.create(newJob);
            await Job.create(newJob);
            fail();
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
});

/************************************** findAll */

describe("findAll", function() {
    const newJob = {
        title: "jest job",
        salary: 60000,
        equity: 0,
        company_handle: "c1"
    };

    test("works: no filter", async function() {
        await Job.create(newJob);
        let jobs = await Job.findAll();
        expect(jobs).toEqual([{
                title: "jest job",
                salary: 60000,
                equity: "0",
                company_handle: "c1",
                id: expect.any(Number)
            },
            {
                title: "test job",
                salary: 60000,
                equity: "0",
                company_handle: "c1",
                id: expect.any(Number)
            }
        ]);
    });

    test("works: w/all filters", async function() {
        await Job.create(newJob);
        let jobs = await Job.findAll({
            title: "jest job",
            minSalary: 60000,
            hasEquity: false
        });
        expect(jobs).toEqual([{
            title: "jest job",
            salary: 60000,
            equity: "0",
            company_handle: "c1",
            id: expect.any(Number)
        }]);
    });

    test("works: w/only min filter", async function() {
        await Job.create(newJob);
        let jobs = await Job.findAll({
            minSalary: 60000
        });
        expect(jobs).toEqual([{
                title: "jest job",
                salary: 60000,
                equity: "0",
                company_handle: "c1",
                id: expect.any(Number)
            },
            {
                title: "test job",
                salary: 60000,
                equity: "0",
                company_handle: "c1",
                id: expect.any(Number)
            }
        ]);
    });

    test("works: w/only equity filter", async function() {
        await Job.create(newJob);
        let jobs = await Job.findAll({
            hasEquity: false
        });
        expect(jobs).toEqual([{
                title: "jest job",
                salary: 60000,
                equity: "0",
                company_handle: "c1",
                id: expect.any(Number)
            },
            {
                title: "test job",
                salary: 60000,
                equity: "0",
                company_handle: "c1",
                id: expect.any(Number)
            }
        ]);
    });

    test("works: w/equity-min filters", async function() {
        await Job.create(newJob);
        let jobs = await Job.findAll({
            hasEquity: false,
            minSalary: 60000
        });
        expect(jobs).toEqual([{
                title: "jest job",
                salary: 60000,
                equity: "0",
                company_handle: "c1",
                id: expect.any(Number)
            },
            {
                title: "test job",
                salary: 60000,
                equity: "0",
                company_handle: "c1",
                id: expect.any(Number)
            }
        ]);
    });
});

/************************************** get */

describe("get", function() {
    const newJob = {
        title: "jest job",
        salary: 60000,
        equity: 0,
        company_handle: "c1"
    };
    test("works", async function() {
        let newlyCreatedJob = await Job.create(newJob);
        newJob.id = newlyCreatedJob.id;
        let job = await Job.get(newJob.id);
        expect(job).toEqual({
            title: "jest job",
            salary: 60000,
            equity: "0",
            company_handle: "c1",
            id: newJob.id
        });
    });

    test("not found if no such company", async function() {
        try {
            await Job.get(-1);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});

/************************************** update */

describe("update", function() {
    const newJob = {
        title: "jest job",
        salary: 60000,
        equity: 0,
        company_handle: "c1"
    };

    const updateData = {
        "title": "Pro Gamer",
        "salary": 70000,
        "equity": 0,
    };

    test("works", async function() {
        let newlyCreatedJob = await Job.create(newJob);
        newJob.id = newlyCreatedJob.id;
        let job = await Job.update(newJob.id, updateData);
        expect(job).toEqual({
            ...updateData,
            company_handle: "c1",
            equity: "0",
            id: newJob.id
        });

        const result = await db.query(
            `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = $1`, [newJob.id]);
        expect(result.rows).toEqual([{
            id: newJob.id,
            title: "Pro Gamer",
            salary: 70000,
            equity: "0",
            company_handle: "c1"
        }]);
    });

    test("works: null fields", async function() {
        const updateDataSetNulls = {
            "title": "New",
            "salary": null,
            "equity": null,
        };
        let newlyCreatedJob = await Job.create(newJob);
        newJob.id = newlyCreatedJob.id;

        let job = await Job.update(newJob.id, updateDataSetNulls);
        expect(job).toEqual({
            id: newJob.id,
            company_handle: "c1",
            ...updateDataSetNulls
        });

        const result = await db.query(
            `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = $1`, [newJob.id]);
        expect(result.rows).toEqual([{
            "id": newJob.id,
            "title": "New",
            "salary": null,
            "equity": null,
            "company_handle": "c1"
        }]);
    });

    test("not found if no such company", async function() {
        try {
            await Job.update(-1, updateData);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });

    test("bad request with no data", async function() {
        let newlyCreatedJob = await Job.create(newJob);
        newJob.id = newlyCreatedJob.id;

        try {
            await Job.update(newJob.id, {});
            fail();
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
});

/************************************** remove */

describe("remove", function() {
    const newJob = {
        title: "jest job",
        salary: 60000,
        equity: 0,
        company_handle: "c1"
    };

    test("works", async function() {
        let newlyCreatedJob = await Job.create(newJob);
        newJob.id = newlyCreatedJob.id;

        await Job.remove(newJob.id);
        const res = await db.query(
            "SELECT id FROM jobs WHERE id=$1", [newJob.id]);
        expect(res.rows.length).toEqual(0);
    });

    test("not found if no such company", async function() {
        try {
            await Job.remove(-1);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});