const express = require("express");
const http = require("http");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const app = express();


const PORT = process.env.PORT || 4000;

const PROTO_PATH = "./user.proto";


// -----------------------------
// Middleware
// -----------------------------

app.use(express.json());
app.use(express.static("public"));


// -----------------------------
// gRPC client
// -----------------------------

const packageDefinition =
    protoLoader.loadSync(PROTO_PATH);

const userProto =
    grpc.loadPackageDefinition(packageDefinition).user;

const grpcClient =
    new userProto.UserService(
        "127.0.0.1:50051",
        grpc.credentials.createInsecure()
    );

// -----------------------------
// REST request
// -----------------------------
function restRequest(input) {

    return new Promise((resolve, reject) => {

        const path =
            `/users` +
            `?count=${input.userCount}` +
            `&city=${encodeURIComponent(input.city)}` +
            `&namePrefix=${encodeURIComponent(input.namePrefix)}`;

        const options = {
            hostname: "127.0.0.1",
            port: 3000,
            path: path,
            method: "GET",
            timeout: 30000
        };

        const request = http.request(
            options,
            (res) => {

                res.on("data", () => {});

                res.on("end", () => {
                    resolve();
                });

            }
        );

        request.on("timeout", () => {
            request.destroy(
                new Error("REST request timed out")
            );
        });

        request.on("error", reject);

        request.end();
    });
}

// -----------------------------
// gRPC request
// -----------------------------

function grpcRequest(input) {

    return new Promise((resolve, reject) => {

        grpcClient.GetUsers(
            {
                count: input.userCount,
                city: input.city,
                namePrefix: input.namePrefix
            },
            (error, response) => {

                if (error) {
                    reject(error);
                    return;
                }

                resolve(response);
            }
        );
    });
}


// -----------------------------
// Benchmark
// -----------------------------

async function runBenchmark(
    requestFunction,
    input
) {

    const start = process.hrtime.bigint();

    let completed = 0;

    while (completed < input.totalRequests) {

        const batchSize = Math.min(
            input.concurrency,
            input.totalRequests - completed
        );

        const requests = [];

        for (let i = 0; i < batchSize; i++) {

            requests.push(
                requestFunction(input)
            );
        }

        await Promise.all(requests);

        completed += batchSize;
    }

    const end = process.hrtime.bigint();

    const timeMs =
        Number(end - start) / 1_000_000;

    const requestsPerSecond =
        input.totalRequests /
        (timeMs / 1000);

    return {
        timeMs,
        requestsPerSecond
    };
}


// -----------------------------
// Benchmark API
// -----------------------------

app.post("/benchmark", async (req, res) => {

    try {

        const input = {
            userCount: Number(req.body.userCount),
            totalRequests: Number(req.body.totalRequests),
            concurrency: Number(req.body.concurrency),
            city: req.body.city,
            namePrefix: req.body.namePrefix
        };


        // Validate input

        if (
            !input.userCount ||
            !input.totalRequests ||
            !input.concurrency
        ) {

            return res.status(400).json({
                error: "Invalid benchmark input"
            });
        }


        console.log("\nStarting benchmark...");
        console.log(input);


        // REST

        console.log("Testing REST...");

        const rest =
            await runBenchmark(
                restRequest,
                input
            );


        // gRPC

        console.log("Testing gRPC...");

        const grpcResult =
            await runBenchmark(
                grpcRequest,
                input
            );


        // Difference

        const throughputDifference =
            (
                (grpcResult.requestsPerSecond -
                    rest.requestsPerSecond) /
                rest.requestsPerSecond
            ) * 100;


        res.json({

            input,

            rest: {
                timeMs: rest.timeMs,
                requestsPerSecond:
                    rest.requestsPerSecond
            },

            grpc: {
                timeMs: grpcResult.timeMs,
                requestsPerSecond:
                    grpcResult.requestsPerSecond
            },

            grpcImprovement:
                throughputDifference

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: error.message
        });
    }
});


app.listen(PORT, "0.0.0.0", () => {
    console.log(`Benchmark UI running on port ${PORT}`);
});


