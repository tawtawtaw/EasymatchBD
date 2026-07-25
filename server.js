const path = require("node:path");
const startHostingerStandalone = require("./scripts/hostinger-entry.cjs");

startHostingerStandalone(path.join(__dirname));
