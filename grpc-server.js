const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const PROTO_PATH = "./user.proto";

const packageDefinition =
    protoLoader.loadSync(PROTO_PATH);

const userProto =
    grpc.loadPackageDefinition(packageDefinition).user;


function getUsers(call, callback) {

    const count = call.request.count || 100;
    const city = call.request.city || "Ahmedabad";
    const namePrefix = call.request.namePrefix || "User";

    const users = [];

    for (let i = 1; i <= count; i++) {

        users.push({
            id: i,
            name: `${namePrefix} ${i}`,
            email: `user${i}@example.com`,
            age: 20 + (i % 40),
            city: city,
            country: "India",
            phone: `987654${String(i).padStart(4, "0")}`,
            company: "Example Technologies",
            role: "Software Developer",
            department: "Engineering"
        });
    }

    callback(null, { users });
}


const server = new grpc.Server();

server.addService(
    userProto.UserService.service,
    {
        GetUsers: getUsers
    }
);

server.bindAsync(
    "0.0.0.0:50051",
    grpc.ServerCredentials.createInsecure(),
    (error, port) => {

        if (error) {
            console.error(error);
            return;
        }

        console.log(`gRPC server running on port ${port}`);

        server.start();
    }
);
