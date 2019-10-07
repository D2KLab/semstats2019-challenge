
# Sirene Ontology

This repository contains the Sirene ontology which is based on [euBusinessGraph](https://www.eubusinessgraph.eu/eubusinessgraph-ontology-for-company-data/) and [RegOrg](https://www.w3.org/TR/vocab-regorg/) models for describing Sirene data, as well as a tool for converting Sirene data from CSV format into RDF/Turtle.

* The preferred prefix is `sirene`.
* The associated namespace of the ontology is <http://sirene.eurecom.fr/ontology#>.

The ontology is split in two files:
* Classes and properties definition: [SireneOntology.ttl](ontology/SireneOntology.ttl)
* Juridical categories vocabulary: [CategoriesJuridiques.ttl](ontology/CategoriesJuridiques.ttl)

# converter

## Dependencies

* Python 3.x

## Installing

Install requirements with pip:

```bash
pip install -r requirements.txt
```

## Usage

Run the converter:

```bash
python -m converter
```