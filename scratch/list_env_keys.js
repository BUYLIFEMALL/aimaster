const fs = require("fs");
const path = require("path");

const envText = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
const keys = envText.split("\n").map(line => line.split("=")[0].trim()).filter(Boolean);
console.log("Keys in .env.local:", keys);
