import { spawnSync } from "node:child_process";

function run(label, command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`${label} failed with code ${result.status}`);
  }
}

run("tests", process.execPath, ["--test", "tests/*.test.js"]);
run("build", process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"]);

console.log("\nPAMOJA evaluation complete: tests passed and Next build succeeded.\n");
