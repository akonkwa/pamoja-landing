const path = require("path");

const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, "data", "pamoja");

module.exports = {
  DATA_DIR,
  ROOT_DIR,
};
