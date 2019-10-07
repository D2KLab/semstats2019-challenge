const path = require("path");
const fs = require("fs");

const keys = ["s", "geo", "topNotation"];

const geojson = {
  type: "FeatureCollection",
  properties: {},
  features: []
};

if (!process.argv[2]) {
  throw new Error("Required parameter: input dir/file path");
}

if (!process.argv[3]) {
  throw new Error("Required parameter: output file path");
}

const inputPath = process.argv[2];
const outputPath = process.argv[3];

const data = JSON.parse(fs.readFileSync(inputPath));

data.results.bindings.forEach(result => {
  const wkt = result.geo.value.match(/Point\(([0-9.]+) ([0-9.]+)\)/i);
  if (!wkt) return;

  const properties = {};
  for (const key of keys) {
    if (
      {}.hasOwnProperty.call(result, key) &&
      {}.hasOwnProperty.call(result[key], "value")
    ) {
      properties[key] = result[key].value;
    }
  }

  geojson.features.push({
    type: "Feature",
    properties,
    geometry: {
      type: "Point",
      coordinates: [wkt[1], wkt[2]]
    }
  });
});

fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 2), "utf8");

const propsMapping = {};

geojson.features.forEach(feature => {
  keys.forEach((key, index) => {
    const value = feature.properties[key];
    if (!propsMapping[key]) {
      propsMapping[key] = index + 1;
    }
    delete feature.properties[key];
    feature.properties[propsMapping[key]] = value;
  });
});

geojson.properties.mapping = propsMapping;

const outputMinPath = path.join(
  path.dirname(outputPath),
  `${path.basename(outputPath, path.extname(outputPath))}.min${path.extname(
    outputPath
  )}`
);

fs.writeFileSync(outputMinPath, JSON.stringify(geojson), "utf8");
