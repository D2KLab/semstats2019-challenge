const fs = require("fs");
const path = require("path");
const mkdirp = require("mkdirp");

const utils = require("./utils");

const MAX_SCORE = 0.8;

const inputPath = process.argv[2] || "output/scores";
const outputPath = process.argv[3] || "output/best-scores";

mkdirp(outputPath);

const files = utils
  .walkSync(path.resolve(inputPath))
  .filter(f => f.endsWith(".json"));
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const output = {};

  console.log("Parsing", file);

  Object.keys(data).forEach(uri => {
    const results = data[uri];
    if (!results) return;

    // Normalize score
    const allScores = results.map(result => result[2]);
    const maxScore = Math.max(...allScores);
    const minScore = Math.min(...allScores);
    const resultsLen = results.length;
    for (let i = 0; i < resultsLen; i += 1) {
      results[i][2] =
        1 - (results[i][2] - minScore) / (maxScore - minScore || 1);
    }

    const bestResults = results.filter(result => result[2] >= MAX_SCORE);
    bestResults.forEach(result => {
      const cityURI = result[0];
      const score = result[2];

      if (!output[uri]) {
        output[uri] = [];
      }
      output[uri].push({
        uri: cityURI,
        score
      });
    });
  });

  fs.writeFileSync(
    path.join(outputPath, `${path.basename(file, path.extname(file))}.json`),
    JSON.stringify(output),
    "utf8"
  );
}
