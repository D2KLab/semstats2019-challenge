
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

# Sample queries

## Number of establishments in the department of Alpes-Maritimes (06)
```sparql
SELECT (COUNT(?s) AS ?count)
WHERE {
    GRAPH <http://sirene.eurecom.fr/sirene> {
        ?s org:siteAddress/schema:postalCode ?postalCode .
        FILTER (SUBSTR(?postalCode, 0, 3) = "06") .
    }
}
```
[Query link](http://sirene.eurecom.fr/sparql?name=&infer=true&sameAs=true&query=PREFIX+org%3A+%3Chttp%3A%2F%2Fwww.w3.org%2Fns%2Forg%23%3E%0APREFIX+schema%3A+%3Chttp%3A%2F%2Fwww.schema.org%2F%3E%0ASELECT+(COUNT(%3Fs)+AS+%3Fcount)%0AWHERE+%7B+%0A++++GRAPH+%3Chttp%3A%2F%2Fsirene.eurecom.fr%2Fsirene%3E+%7B%0A++++++++%3Fs+org%3AsiteAddress%2Fschema%3ApostalCode+%3FpostalCode+.%0A++++++++FILTER+(SUBSTR(%3FpostalCode%2C+0%2C+3)+%3D+%2206%22)+.%0A++++%7D%0A%7D)

## Number of companies per juridical category
```sparql
SELECT ?orgType ?orgTypeLabel (COUNT(?s) AS ?count)
WHERE {
    GRAPH <http://sirene.eurecom.fr/sirene> {
        ?s rov:orgType ?orgType .
        ?orgType skos:prefLabel ?orgTypeLabel .
    }
}
GROUP BY ?orgType ?orgTypeLabel
ORDER BY DESC(?count)
```
[Query link](http://sirene.eurecom.fr/sparql?name=&infer=true&sameAs=true&query=PREFIX+rov%3A+%3Chttp%3A%2F%2Fwww.w3.org%2Fns%2Fregorg%23%3E%0APREFIX+skos%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2004%2F02%2Fskos%2Fcore%23%3E%0ASELECT+%3ForgType+%3ForgTypeLabel+(COUNT(%3Fs)+AS+%3Fcount)%0AWHERE+%7B+%0A++++GRAPH+%3Chttp%3A%2F%2Fsirene.eurecom.fr%2Fsirene%3E+%7B%0A++++++++%3Fs+rov%3AorgType+%3ForgType+.%0A++++++++%3ForgType+skos%3AprefLabel+%3ForgTypeLabel+.%0A++++%7D%0A%7D%0AGROUP+BY+%3ForgType+%3ForgTypeLabel%0AORDER+BY+DESC(%3Fcount))

## Average age of sports clubs
```sparql
SELECT (AVG(?age) AS ?avgAge)
WHERE {
    GRAPH <http://sirene.eurecom.fr/sirene> {
        ?s sirene:activitePrincipaleEtablissement "93.12Z" .
        ?s schema:foundingDate ?foundingDate .
        BIND(YEAR(STRDT(?foundingDate, xsd:date)) AS ?foundingYear)
        BIND(YEAR(NOW()) - ?foundingYear AS ?age)
    }
}
```
[Query link](http://sirene.eurecom.fr/sparql?name=&infer=true&sameAs=true&query=PREFIX+sirene%3A+%3Chttp%3A%2F%2Fsirene.eurecom.fr%2Fontology%23%3E%0APREFIX+schema%3A+%3Chttp%3A%2F%2Fwww.schema.org%2F%3E%0APREFIX+xsd%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2001%2FXMLSchema%23%3E%0ASELECT+(AVG(%3Fage)+AS+%3FavgAge)%0AWHERE+%7B%0A++++GRAPH+%3Chttp%3A%2F%2Fsirene.eurecom.fr%2Fsirene%3E+%7B%0A++++++++%3Fs+sirene%3AactivitePrincipaleEtablissement+%2293.12Z%22+.%0A++++++++%3Fs+schema%3AfoundingDate+%3FfoundingDate+.%0A++++++++BIND(YEAR(STRDT(%3FfoundingDate%2C+xsd%3Adate))+AS+%3FfoundingYear)%0A++++++++BIND(YEAR(NOW())+-+%3FfoundingYear+AS+%3Fage)%0A++++%7D%0A%7D)

## Largest organizations in France (number of employees)
```sparql
SELECT ?s ?legalName
WHERE {
    GRAPH <http://sirene.eurecom.fr/sirene> {
        ?s schema:numberOfEmployees <http://sirene.eurecom.fr/tranche-effectif/53> .
        ?s rov:legalName ?legalName .
    }
}
```
[Query link](http://sirene.eurecom.fr/sparql?name=&infer=true&sameAs=true&query=PREFIX+schema%3A+%3Chttp%3A%2F%2Fwww.schema.org%2F%3E%0APREFIX+rov%3A+%3Chttp%3A%2F%2Fwww.w3.org%2Fns%2Fregorg%23%3E%0ASELECT+%3Fs+%3FlegalName%0AWHERE+%7B%0A++++GRAPH+%3Chttp%3A%2F%2Fsirene.eurecom.fr%2Fsirene%3E+%7B%0A++++++++%3Fs+schema%3AnumberOfEmployees+%3Chttp%3A%2F%2Fsirene.eurecom.fr%2Ftranche-effectif%2F53%3E+.%0A++++++++%3Fs+rov%3AlegalName+%3FlegalName+.%0A++++%7D%0A%7D)