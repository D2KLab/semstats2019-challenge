const fs = require("fs");
const path = require("path");
const N3 = require("n3");
const parse = require("csv-parse");
// const levenshtein = require('js-levenshtein');
const turf = require("turf");
const mkdirp = require("mkdirp");
const stream = require("stream");

const utils = require("./utils");

// const labelsCache = {};
const categoriesCache = {};
const geoCache = [];

const QUALITIES = {
  "http://beta.id.insee.fr/codes/qualite/BON": 0,
  "http://beta.id.insee.fr/codes/qualite/ACCEPTABLE": 1,
  "http://beta.id.insee.fr/codes/qualite/MAUVAIS": 2
};

const sumArrayValues = values => values.reduce((p, c) => p + c, 0);

const weightedMean = (factorsArray, weightsArray) =>
  sumArrayValues(
    factorsArray.map((factor, index) => factor * weightsArray[index])
  ) / sumArrayValues(weightsArray);

function mem() {
  const used = process.memoryUsage().heapUsed / 1024 / 1024;
  console.log(
    `The script uses approximately ${Math.round(used * 100) / 100} MB`
  );
}

function parsePoint(point) {
  const wkt = point.match(/Point\(([0-9.]+) ([0-9.]+)\)/i);
  if (wkt) {
    return [parseFloat(wkt[1]), parseFloat(wkt[2])];
  }
  return null;
}

function QuadConsumer() {
  const transform = new stream.Transform({ objectMode: true });

  // eslint-disable-next-line no-underscore-dangle
  transform._transform = function _transform(quad, encoding, done) {
    this.push(quad);
    done();
  };

  // eslint-disable-next-line no-underscore-dangle
  transform._flush = function _flush(done) {
    done();
  };

  return transform;
}

function loadGeoQuality(inputFileName) {
  const filePath = path.join("data/bpe2018-geo-quality/", inputFileName);
  if (!fs.existsSync(filePath)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const store = new N3.Store();
    const streamParser = new N3.StreamParser();
    const rdfStream = fs.createReadStream(filePath);

    streamParser.on("error", err => {
      reject(err);
    });

    rdfStream
      .pipe(streamParser)
      .pipe(new QuadConsumer())
      .on("data", quad => {
        store.addQuad(quad);
      })
      .on("end", () => {
        resolve(store);
      });
  });
}

function processFacilities(inputFile, cityStore, relationsStore) {
  console.log("Processing", inputFile);

  return new Promise(async (resolve, reject) => {
    let geoQualityStore = null;
    if (path.basename(inputFile).startsWith("facilities-")) {
      geoQualityStore = await loadGeoQuality(
        `geo-quality-${path.basename(inputFile).substr("facilities-".length)}`
      );
    }

    const store = new N3.Store();
    const streamParser = new N3.StreamParser();
    // const prefixes = {};
    const geoCacheLength = geoCache.length;
    const output = {};

    streamParser.on("error", err => {
      reject(err);
    });

    const rdfStream = fs.createReadStream(inputFile);
    rdfStream
      .pipe(streamParser)
      .pipe(new QuadConsumer())
      .on("data", quad => {
        store.addQuad(quad);
      })
      .on("end", () => {
        const wktCache = {};
        const qualityCache = {};

        const subjects = store.getSubjects(
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
          "http://rdf.insee.fr/def/bpe#Equipement"
        );
        const subjectsLength = subjects.length;

        // Cache wkt points
        subjects.forEach(subject => {
          const geometries = store.getObjects(
            subject,
            "http://www.opengis.net/ont/geosparql#hasGeometry"
          );
          geometries.forEach(geo => {
            if (geoQualityStore) {
              const quality = geoQualityStore
                .getObjects(
                  geo,
                  "http://www.w3.org/ns/dqv#hasQualityAnnotation"
                )
                .pop();
              if (quality) {
                const qualityScore = geoQualityStore
                  .getObjects(quality, "http://www.w3.org/ns/oa#hasBody")
                  .pop();
                if (qualityScore) {
                  qualityCache[subject.id] = QUALITIES[qualityScore.id];
                }
              }
            }

            const wktPoints = store.getObjects(
              geo,
              "http://www.opengis.net/ont/geosparql#asWKT"
            );
            wktPoints.forEach(point => {
              const wkt = parsePoint(point.id); // lon, lat
              if (wkt) {
                wktCache[subject.id] = wkt;
              }
            });
          });
        });

        // Compare each subject
        subjects.forEach((subject, index) => {
          console.log(
            `${index}/${subjectsLength} (${(index / subjectsLength) * 100}%)`
          );

          const scores = {};

          // Geometry score
          const wkt = wktCache[subject.id];
          if (wkt) {
            for (let i = 0; i < geoCacheLength; i += 1) {
              const geo = geoCache[i];
              const cacheWkt = [geo[0], geo[1]];
              const distance = turf.distance(wkt, cacheWkt, "kilometers");

              if (distance <= 1.0) {
                scores[geo[2]] = [distance, 1]; // dist, cat (0=good, 1=bad)
              }
            }
          }

          // Category score
          const types = store.getObjects(
            subject,
            "http://purl.org/dc/terms/type"
          );
          types.forEach(type => {
            const relations = relationsStore.getSubjects(
              "http://www.w3.org/2002/07/owl#sameAs",
              type
            );
            relations.forEach(relation => {
              const uris = categoriesCache[relation.id];
              if (uris) {
                Object.keys(scores).forEach(s => {
                  scores[s][1] = uris.includes(s) ? 0 : 1;
                });
              }
            });
          });

          // Geo Quality score influences the geo weight
          let geoWeight = 1;
          const qualityScore = qualityCache[subject.id];
          if (typeof qualityScore !== "undefined") {
            switch (qualityScore) {
              case 0: // BON
                geoWeight = 1;
                break;

              case 1: // ACCEPTABLE
                geoWeight = 0.8;
                break;

              case 2: // MAUVAIS
                geoWeight = 0.6;
                break;

              default:
                console.warn("Unknown quality score:", qualityScore);
            }
          }

          // Calculate weighted mean score, then add to array for sorting
          const sortableScores = [];
          for (const s in scores) {
            if ({}.hasOwnProperty.call(scores, s)) {
              const weightedScore = weightedMean(scores[s], [geoWeight, 0.8]); // geo weight, cat weight (0.8)
              sortableScores.push([s, scores[s], weightedScore]);
            }
          }

          // Sort final scores
          sortableScores.sort((a, b) => {
            if (a[2] === b[2]) return 0;
            return a[2] > b[2] ? 1 : -1;
          });

          // Limit to 5 results
          sortableScores.splice(5);

          // Append to scores file
          if (sortableScores.length > 0) {
            output[subject.id] = sortableScores;
          }

          mem();
        });

        resolve(output);
      });
  });
}

function loadRelations(inputFile) {
  return new Promise((resolve, reject) => {
    const store = new N3.Store();
    const streamParser = new N3.StreamParser();
    const prefixes = {};

    streamParser.on("error", err => {
      reject(err);
    });
    streamParser.on("prefix", (prefix, iri) => {
      prefixes[prefix] = iri.id;
    });

    const rdfStream = fs.createReadStream(inputFile);
    rdfStream
      .pipe(streamParser)
      .pipe(new QuadConsumer())
      .on("data", quad => {
        store.addQuad(quad);
      })
      .on("end", () => {
        resolve(store);
      });
  });
}

function loadCityStore(inputFile) {
  return new Promise((resolve, reject) => {
    const parser = parse((err, data) => {
      if (err) {
        reject(err);
        return;
      }

      const entities = {};

      data.slice(1).forEach(row => {
        const uri = row[0];
        if (!entities[uri]) {
          entities[uri] = {
            uri: row[0],
            label: row[1],
            geo: row[2],
            categories: [row[3]]
          };
        } else {
          entities[uri].categories.push(row[3]);
        }
      });

      Object.keys(entities).forEach(uri => {
        const entity = entities[uri];
        const { geo, categories } = entity;

        // Category
        categories.forEach(category => {
          if (!categoriesCache[category]) {
            categoriesCache[category] = [];
          }
          categoriesCache[category].push(uri);
        });

        // Geo
        const geoWkt = parsePoint(geo);
        if (geoWkt) {
          geoWkt.push(uri); // lon, lat, uri
          geoCache.push(geoWkt);
        }
      });

      // Sort geo data
      geoCache.sort((a, b) => {
        const A =
          (((a[1] * 1e7) << 16) & 0xffff0000) | ((a[0] * 1e7) & 0x0000ffff);
        const B =
          (((b[1] * 1e7) << 16) & 0xffff0000) | ((b[0] * 1e7) & 0x0000ffff);
        return A - B;
      });

      console.log("Done caching city data");
      resolve();
    });

    fs.createReadStream(inputFile).pipe(parser);
  });
}

if (!process.argv[2]) {
  throw new Error("Required parameter: input dir/file path");
}

if (!process.argv[3]) {
  throw new Error("Required parameter: CityMoove file path");
}

const outputPath = process.argv[4] || "output/scores";

(async () => {
  mkdirp(outputPath);

  const cityStore = await loadCityStore(process.argv[3]);
  console.log("Done loading city store");
  const relations = await loadRelations("data/categories-relations.ttl");
  console.log("Done loading relations");

  const filePath = process.argv[2];
  let files = [];
  if (fs.statSync(filePath).isDirectory()) {
    files = utils
      .walkSync(path.resolve(process.argv[2]))
      .filter(f => f.endsWith(".ttl"));
  } else {
    files.push(filePath);
  }

  for (const file of files) {
    const outFile = path.join(
      outputPath,
      `${path.basename(file, path.extname(file))}.json`
    );
    if (!fs.existsSync(outFile)) {
      const results = await processFacilities(file, cityStore, relations);
      fs.writeFile(outFile, JSON.stringify(results), "utf8", err => {
        if (err) throw err;
      });
    }
  }

  mem();
})();
