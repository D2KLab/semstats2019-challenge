const fs = require("fs");
const path = require("path");
const request = require("request");
const zlib = require("zlib");

function downloadBPE(dataType) {
  const filePath = path.join("data", `bpe2018-${dataType}.zip`);
  if (fs.existsSync(filePath)) {
    console.log(`Skipping ${filePath} since it already exists.`);
    return Promise.resolve();
  }

  return new Promise(resolve => {
    const url = `http://www.linked-open-statistics.org/semstats2019/data/bpe2018-${dataType}.zip`;
    console.log(`Downloading ${url} to ${filePath}...`);

    const baseName = path.basename(filePath, path.extname(filePath));
    const writeStream = fs.createWriteStream(
      path.join(path.dirname(filePath), `${baseName}.zip`)
    );
    const unzip = zlib.createGunzip();

    request({
      url,
      method: "GET"
    })
      .pipe(unzip)
      .pipe(writeStream);

    writeStream.on("finish", resolve);
  });
}

function downloadPlaces() {
  const filePath = path.join("data", "citymoove-places.csv");
  if (fs.existsSync(filePath)) {
    console.log(`Skipping ${filePath} since it already exists.`);
    return Promise.resolve();
  }

  console.log(`Downloading ${filePath}...`);

  return new Promise(resolve => {
    const writeStream = fs.createWriteStream(filePath);

    const query = `
      PREFIX geogis: <http://www.opengis.net/ont/geosparql#>
      PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
      PREFIX dul: <http://ontologydesignpatterns.org/ont/dul/DUL.owl#>
      PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>
      PREFIX locn: <http://www.w3.org/ns/locn#>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX locationOnt: <http://data.linkedevents.org/def/location#>
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      SELECT DISTINCT ?s ?label ?geo ?businessType
      WHERE {
          GRAPH <http://3cixty.com/cotedazur/places> { ?s a dul:Place . }

          ?s geo:location ?location .
          ?location locn:geometry ?geo .
          ?s rdfs:label ?label .

          OPTIONAL {
              ?s locationOnt:businessType ?businessType .
              ?businessType skos:inScheme <http://data.linkedevents.org/kos/3cixtyScheme>
          }
          FILTER(BOUND(?businessType))

          FILTER (geof:sfWithin(?geo, '''
              <http://www.opengis.net/def/crs/OGC/1.3/CRS84>
              Polygon ((
                6.079861 42.982015,
            6.079861 44.361051,
            7.716938 44.361051,
            7.716938 42.982015,
            6.079861 42.982015
              ))
              '''^^geogis:wktLiteral))
      }
    `;

    request({
      uri: "https://kb.city-moove.fr/sparql",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Accept: "text/csv"
      },
      form: {
        query
      }
    }).pipe(writeStream);

    writeStream.on("finish", resolve);
  });
}

Promise.all([
  downloadPlaces(),
  downloadBPE("codelists"),
  downloadBPE("facilities"),
  downloadBPE("geo-quality")
]);
