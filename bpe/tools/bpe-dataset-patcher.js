/* eslint-disable no-underscore-dangle */
const debug = require("debug")("patcher:index");
const fs = require("fs");
const path = require("path");
const proj4 = require("proj4");
const mkdirp = require("mkdirp");
const stream = require("stream");

const utils = require("./utils");

proj4.defs(
  "EPSG:2154",
  "+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"
);

function processTurtleFile(inputFile, outputDir) {
  debug("Processing", inputFile);

  return new Promise(resolve => {
    const outputFile = path.join(outputDir, path.basename(inputFile));
    if (fs.existsSync(outputFile)) {
      debug(`Skipping ${inputFile} because it already exists in output dir`);
      resolve();
      return;
    }

    // Create output directory if it doesn't exist
    mkdirp(outputDir);

    const readStream = fs.createReadStream(inputFile);
    const writeStream = fs.createWriteStream(outputFile);

    const xtream = new stream.Transform({ objectMode: true });

    xtream._transform = function _transform(chunk, encoding, done) {
      let strData = chunk.toString(encoding);
      if (this._invalidLine) {
        strData = this._invalidLine + strData;
      }
      const objLines = strData.split("\n");
      // eslint-disable-next-line prefer-destructuring
      this._invalidLine = objLines.splice(objLines.length - 1, 1)[0];
      this.push(objLines);
      done();
    };

    xtream._flush = function _flush(done) {
      if (this._invalidLine) {
        this.push([this._invalidLine]);
      }
      this._invalidLine = null;
      done();
    };
    readStream.pipe(xtream);
    xtream.on("readable", () => {
      let lines;
      // eslint-disable-next-line no-cond-assign
      while ((lines = xtream.read())) {
        lines.forEach(async line => {
          let newLine = line;
          if (newLine.includes("geo:asWKT")) {
            const wkt = newLine.match(/Point\(([0-9.]+) ([0-9.]+)\)/);
            if (wkt) {
              const proj = proj4("EPSG:2154", "WGS84", [
                parseFloat(wkt[1]),
                parseFloat(wkt[2])
              ]);
              newLine = `        geo:asWKT  "Point(${proj[0]} ${
                proj[1]
              })"^^geo:wktLiteral .`;
            }
          }
          await writeStream.write(`${newLine}\n`);
        });
      }
    });
    xtream.on("finish", () => {
      resolve();
    });
  });
}

const inputPath = process.argv[2];
const outputPath = process.argv[3] || path.dirname(inputPath);

if (!inputPath) {
  throw new Error("Required parameter: input dir/file");
}

if (!outputPath) {
  throw new Error("Required parameter: output dir");
}

const files = utils
  .walkSync(path.resolve(inputPath))
  .filter(f => f.endsWith(".ttl"));

files
  .reduce(
    (pAcc, file) =>
      pAcc.then(() => processTurtleFile(file, path.resolve(outputPath))),
    Promise.resolve()
  )
  .then(err => {
    if (err) throw err;
  });
