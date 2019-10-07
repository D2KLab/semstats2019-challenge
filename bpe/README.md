# bpe

# Alignments Generator

## Installation

1. Install the dependencies:
    ```bash
    cd tools
    npm install
    ```

1. Download the required data files:
    ```bash
    node download-data.js
    ```

1. Patch the BPE datasets to use WGS84 projection:
    ```bash
    node bpe-dataset-patcher.js data/bpe2018-facilities
    ```

## Usage

1. Calculate the similarity score for each facilities:
    ```bash
    node compare.js data/bpe2018-facilities data/citymoove-places.csv output/scores
    ```

1. Generate JSON files with best scores only:
    ```bash
    node best-scores.js output/scores output/best-scores
    ```

1. Convert the best scores into RDF alignments (EDOAL format):
    ```bash
    node convert-to-edoal.js output/best-scores output/alignments.ttl
    ```

# Alignments Visualizer

## Installation

1. Load the `alignments.ttl` file (obtained from Alignments Generator) into a triplestore and [run the query](data/alignments-query.rq) to export the data required for the visualizer. The exported data should be in [application/sparql-results+json](https://www.w3.org/TR/2013/REC-sparql11-results-json-20130321/) format.

1. Convert the results obtained in step 1 into a single geojson file, and save it to the visualizer folder.
    ```bash
    cd tools
    node generate-alignments-geojson.js <path to sparql-results file> ../visualizer/alignments.geojson
    ```

The path to the alignments.geojson file is important since it is fetched by the web page. It has to be at the same path as the `index.html` file.

## Usage

Start a simple web server with:

```bash
npx serve
```

## Queries

Sample query to get the label, business type, poster, and street address of the facilities:

```sparql
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX geogis: <http://www.opengis.net/ont/geosparql#>
PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>
PREFIX ibpe: <http://rdf.insee.fr/def/bpe#>
PREFIX align: <http://knowledgeweb.semanticweb.org/heterogeneity/alignment#>
PREFIX schema: <http://schema.org/>
PREFIX lode: <http://linkedevents.org/ontology/>
PREFIX ma-ont: <http://www.w3.org/ns/ma-ont#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX locationOnt: <http://data.linkedevents.org/def/location#>
PREFIX locn: <http://www.w3.org/ns/locn#>
SELECT ?ent1 ?ent2 ?geo ?capacite ?typeNotation ?businessType ?businessTypeLabel ?label ?poster ?streetAddress ?measure WHERE {
    {
        SELECT ?ent1 ?ent2 ?measure WHERE {
            GRAPH <http://semstats.eurecom.fr/bpe/alignments> {
                ?s a align:Alignment .
                ?s align:map ?map .
                ?map align:entity1 ?ent1 .
                ?map align:entity2 ?ent2 .
                ?map align:relation "=" .
                ?map align:measure ?measure .
                FILTER (?measure >= "0.8"^^xsd:float)
            }
        }
    }
    GRAPH <http://semstats.eurecom.fr/bpe/facilities> {
        OPTIONAL { ?ent1 ibpe:capacite ?capacite . }
        ?ent1 dcterms:type ?type .
        GRAPH <http://semstats.eurecom.fr/bpe/codelists> {
            ?type skos:notation ?typeNotation .
        }
    }
    SERVICE <https://kb.city-moove.fr/sparql> {
        ?ent2 rdfs:label ?label .
        ?ent2 geo:location/locn:geometry ?geo .
        ?ent2 locationOnt:businessType ?businessType .
        OPTIONAL { ?businessType skos:prefLabel ?businessTypeLabel . }
        OPTIONAL { ?ent2 lode:poster/ma-ont:locator ?poster . }
        OPTIONAL { ?ent2 schema:location/schema:streetAddress ?streetAddress . }
    }
}
```