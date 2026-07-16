#!/usr/bin/env node
import { runEvaluation } from "./evaluator.js";

const benchmarkOnly = process.argv.includes("--benchmark");
const iterationsArgument = process.argv.find((argument) => argument.startsWith("--iterations="));
const iterations = iterationsArgument ? Number(iterationsArgument.split("=", 2)[1]) : 30;

if (!Number.isInteger(iterations) || iterations < 1 || iterations > 10_000) {
  console.error("--iterations must be an integer between 1 and 10000.");
  process.exitCode = 2;
} else {
  runEvaluation(iterations).then((report) => {
    console.log(JSON.stringify(benchmarkOnly ? report.performance : report, null, 2));
    if (!benchmarkOnly && !report.passed) process.exitCode = 1;
  }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
}
