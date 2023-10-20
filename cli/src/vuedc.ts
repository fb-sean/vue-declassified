#! /usr/bin/env node
import { VuedcError, VuedcOptions, convertSfc } from "@heatsrc/vue-declassified";
import chalk from "chalk";
import { Command } from "commander";
import figlet from "figlet";
import { readFile, writeFile } from "node:fs/promises";
import Readline from "node:readline/promises";
import pkg from "../package.json";

const highlightFile = (file: string) => chalk.rgb(255, 255, 255).underline(file);
async function main() {
  console.log(figlet.textSync("VueDc", { font: "Rozzo" }));

  const program = new Command();
  program
    .version(pkg.version)
    .description("Convert Vue Class Components to Vue 3 Composition API")
    .option("--ignore-collisions", "Will not stop on collisions")
    .option(
      "-p, --project [tsconfigPath]",
      "Use compiler options from specified tsconfig.json file, if no file path specified with the flag vuedc will attempt to derive it from the input file." +
        "\nWARNING: this option is significantly slower than not using it, only enable if you need external references (e.g., deriving sources of properties from mixins)!",
    )
    .requiredOption("-i, --input <file>", "Input Vue file")
    .option("-o, --output <file>", "Output file, if not specified input file will be overwritten")
    .option("-y, --yes", "Overwrite output file without asking")
    .parse(process.argv);

  const options = program.opts();

  if (!options.input) {
    console.error("Input file is required");
    process.exit(1);
  }

  let output = options.output;

  if (!options.output && !options.yes) {
    const readline = Readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const answer = await readline.question(
      "Output file is not specified, do you want to overwrite input file? (y/n) ",
    );

    if (!answer.match(/^[yY]$/)) {
      console.log("Exiting...");
      process.exit(0);
      return;
    }

    console.log(`Overwriting input file: ${highlightFile(options.input)}`);
    output = options.input;
    return readline.close();
  }

  let tsConfigPath = "";
  if (options.project === true) {
    const basePath = options.input.split("/").slice(0, -1).join("/");
    tsConfigPath = basePath + "/tsconfig.json";
    console.log(`Will look for tsconfig starting at: ${highlightFile(basePath)}`);
  } else if (typeof options.project === "string") {
    tsConfigPath = options.project;
    console.log(`Using tsconfig file: ${highlightFile(tsConfigPath)}`);
  }

  console.log(`Converting: ${highlightFile(options.input)}...`);

  try {
    const content = await readFile(options.input, { encoding: "utf8" });
    const opts: VuedcOptions = { stopOnCollisions: !options.collisions, tsConfigPath };
    const result = await convertSfc(content, opts);

    await writeFile(output, result, { encoding: "utf8" });

    console.log(`Converted file written to: ${highlightFile(output)}`);
  } catch (err) {
    if (err instanceof VuedcError) {
      const warning = chalk.hex("#ff4500");
      console.warn(`\n\n${warning("Ack!")} ${err.message}\n`);
    } else {
      console.error(err);
    }
  }
}

main();
