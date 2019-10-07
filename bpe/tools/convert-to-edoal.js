const fs = require("fs");
const path = require("path");
const N3 = require("n3");

const utils = require("./utils");

const { DataFactory } = N3;
const { namedNode, literal } = DataFactory;

if (!process.argv[2]) {
  throw new Error("Required parameter: input dir/file path");
}

const inputPath = process.argv[2];
const outputPath = process.argv[3] || "output/alignments.ttl";

const outputStream = fs.createWriteStream(outputPath);
const writer = new N3.Writer(outputStream, {
  prefixes: {
    align: "http://knowledgeweb.semanticweb.org/heterogeneity/alignment#",
    xsd: "http://www.w3.org/2001/XMLSchema#",
    rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  },
  format: "Turtle"
});

let alignmentIndex = 1;
const files = utils
  .walkSync(path.resolve(inputPath))
  .filter(f => f.endsWith(".json"));
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));

  Object.keys(data).forEach(uri => {
    data[uri].forEach(entity => {
      const subject = namedNode(
        `http://bpe.semstats2019.eurecom.fr/alignment/${alignmentIndex}`
      );

      writer.addQuad(
        subject,
        namedNode("rdf:type"),
        namedNode("align:Alignment")
      );
      writer.addQuad(
        subject,
        namedNode("align:map"),
        writer.blank([
          {
            predicate: namedNode("rdf:type"),
            object: namedNode("align:Cell")
          },
          {
            predicate: namedNode("align:entity1"),
            object: namedNode(uri)
          },
          {
            predicate: namedNode("align:entity2"),
            object: namedNode(entity.uri)
          },
          {
            predicate: namedNode("align:measure"),
            object: literal(entity.score, namedNode("xsd:float"))
          },
          {
            predicate: namedNode("align:relation"),
            object: literal("=")
          }
        ])
      );

      alignmentIndex += 1;
    });

    alignmentIndex += 1;
  });
}

writer.end();
