"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
    u1Token,
    uAdminToken
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */


describe("POST /jobs", function() {
    const newJob = {
        title: "post job",
        salary: 60000,
        equity: 0,
        company_handle: "c1"
    };

    test("fails for users", async function() {
        const resp = await request(app)
            .post("/jobs")
            .send(newJob)
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(401);
    });

    test("works for admins", async function() {
        const resp = await request(app)
            .post("/jobs")
            .send(newJob)
            .set("authorization", `Bearer ${uAdminToken}`);
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            newJob: {
                ...newJob,
                equity: "0",
                id: expect.any(Number)
            }
        });
    });

    test("bad request with missing data", async function() {
        const resp = await request(app)
            .post("/jobs")
            .send({
                handle: "new",
                numEmployees: 10,
            })
            .set("authorization", `Bearer ${uAdminToken}`);
        expect(resp.statusCode).toEqual(400);
    });

    test("bad request with invalid data", async function() {
        const resp = await request(app)
            .post("/jobs")
            .send({
                ...newJob,
                id: -9001
            })
            .set("authorization", `Bearer ${uAdminToken}`);
        expect(resp.statusCode).toEqual(400);
    });
});

/************************************** GET /jobs */

describe("GET /jobs", function() {
    test("ok for anon", async function() {
        const resp = await request(app).get("/jobs");
        expect(resp.body).toEqual({
            jobs: [{
                company_handle: "c1",
                equity: "0",
                id: expect.any(Number),
                salary: 60000,
                title: "test job"
            }]
        });
    });

    test("ok w/valid filters", async function() {
        const resp = await request(app).get("/jobs?title=test&minSalary=60000&hasEquity=false");
        expect(resp.body).toEqual({
            jobs: [{
                company_handle: "c1",
                equity: "0",
                id: expect.any(Number),
                salary: 60000,
                title: "test job"
            }]
        });
    });

    test("ok w/invalid filters", async function() {
        const resp = await request(app).get("/jobs?nam=blah&employeecount=5&employeestatus=true");
        expect(resp.body).toEqual({
            jobs: [{
                company_handle: "c1",
                equity: "0",
                id: expect.any(Number),
                salary: 60000,
                title: "test job"
            }]
        });
    });

    test("fails: test next() handler", async function() {
        // there's no normal failure event which will cause this route to fail ---
        // thus making it hard to test that the error-handler works with it. This
        // should cause an error, all right :)
        await db.query("DROP TABLE jobs CASCADE");
        const resp = await request(app)
            .get("/jobs")
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(500);
    });
});

/************************************** GET /jobs/:handle */

describe("GET /jobs/:handle", function() {
    test("works for anon", async function() {
        let testJob = await db.query(`
      SELECT id
      FROM jobs
    `);
        const testId = testJob.rows[0].id
        const resp = await request(app).get(`/jobs/${testId}`);
        expect(resp.body).toEqual({
            id: expect.any(Number),
            title: "test job",
            salary: 60000,
            equity: "0",
            company_handle: "c1"
        });
    });

    test("not found for no such job", async function() {
        const resp = await request(app).get(`/jobs/nope`);
        expect(resp.statusCode).toEqual(404);
    });
});

/************************************** PATCH /jobs/:handle */

describe("PATCH /jobs/:handle", function() {
    test("fails for users", async function() {
        let testJob = await db.query(`
      SELECT id
      FROM jobs
    `);
        const testId = testJob.rows[0].id
        const resp = await request(app)
            .patch(`/jobs/${testId}`)
            .send({
                title: "tested-job",
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toBe(401)
    });

    test("works for admins", async function() {
        let testJob = await db.query(`
    SELECT id
    FROM jobs
  `);
        const testId = testJob.rows[0].id
        const resp = await request(app)
            .patch(`/jobs/${testId}`)
            .send({
                title: "tested-job",
            })
            .set("authorization", `Bearer ${uAdminToken}`);
        expect(resp.body).toEqual({
            job: {
                id: expect.any(Number),
                title: "tested-job",
                salary: 60000,
                equity: "0",
                company_handle: "c1"
            }
        });
    });

    test("unauth for anon", async function() {
        let testJob = await db.query(`
    SELECT id
    FROM jobs
  `);
        const testId = testJob.rows[0].id
        const resp = await request(app)
            .patch(`/jobs/${testId}`)
            .send({
                title: "new",
            });
        expect(resp.statusCode).toEqual(401);
    });

    test("not found on no such company", async function() {
        const resp = await request(app)
            .patch(`/jobs/nope`)
            .send({
                title: "new nope",
            })
            .set("authorization", `Bearer ${uAdminToken}`);
        expect(resp.statusCode).toEqual(404);
    });

    test("bad request on id change attempt", async function() {
        let testJob = await db.query(`
    SELECT id
    FROM jobs
  `);
        const testId = testJob.rows[0].id
        const resp = await request(app)
            .patch(`/jobs/${testId}`)
            .send({
                id: "1337",
            })
            .set("authorization", `Bearer ${uAdminToken}`);
        expect(resp.statusCode).toEqual(400);
    });

    test("bad request on invalid data", async function() {
        let testJob = await db.query(`
    SELECT id
    FROM jobs
  `);
        const testId = testJob.rows[0].id
        const resp = await request(app)
            .patch(`/jobs/${testId}`)
            .send({
                title: 123, // Not a string
            })
            .set("authorization", `Bearer ${uAdminToken}`);
        expect(resp.statusCode).toEqual(400);
    });
});

/************************************** DELETE /jobs/:handle */

describe("DELETE /jobs/:handle", function() {
    test("fails for users", async function() {
        const resp = await request(app)
            .delete(`/jobs/1`)
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toBe(401);
    });

    test("works for admins", async function() {
        let testJob = await db.query(`
    SELECT id
    FROM jobs
  `);
        const testId = testJob.rows[0].id
        const resp = await request(app)
            .delete(`/jobs/${testId}`)
            .set("authorization", `Bearer ${uAdminToken}`);
        expect(resp.body).toEqual({ deleted: testId.toString() });
    });

    test("unauth for anon", async function() {
        const resp = await request(app)
            .delete(`/jobs/1`);
        expect(resp.statusCode).toEqual(401);
    });

    test("not found for no such company", async function() {
        const resp = await request(app)
            .delete(`/jobs/nope`)
            .set("authorization", `Bearer ${uAdminToken}`);
        expect(resp.statusCode).toEqual(404);
    });
});