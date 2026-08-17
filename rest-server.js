const express = require("express");

const app = express();
const PORT = 3000;

app.get("/users", (req, res) => {

    const count = Number(req.query.count) || 100;
    const city = req.query.city || "Ahmedabad";
    const namePrefix = req.query.namePrefix || "User";

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

    res.json(users);
});

app.listen(PORT, () => {
    console.log(`REST server running on http://localhost:${PORT}`);
});
