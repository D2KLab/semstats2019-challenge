import csv
import math
import os
from rdflib import Graph, URIRef, Literal
from rdflib.namespace import RDF, SKOS

baseURL = 'http://sirene.eurecom.fr/categorie-juridique/'

# Parse CSV files and add triples to a graph
# Returns the graph
def parseCategories(csv_file):
  g = Graph()
  csv_reader = csv.DictReader(csv_file, delimiter=',')

  for row in list(csv_reader):
    subj = URIRef(f'{baseURL}{row["Code"]}')

    g.add( (subj, RDF.type, SKOS.Concept) )
    g.add( (subj, SKOS.inScheme, URIRef(baseURL)) )
    g.add( (subj, SKOS.prefLabel, Literal(row['Libellé'], 'fr')) )

    level = math.floor(len(row['Code']) / 2)
    if level > 0:
      g.add( (subj, SKOS.broader, URIRef(f'{baseURL}{row["Code"][:level]}')) )

  return g

def run():
  g = Graph()
  g.bind("rdf", RDF)
  g.bind("skos", SKOS)

  files = [
    'data/CategoriesJuridiques-Niveau1.csv',
    'data/CategoriesJuridiques-Niveau2.csv',
    'data/CategoriesJuridiques-Niveau3.csv'
  ]

  # Process CSV files
  for f in files:
    with open(f) as csv_file:
      g += parseCategories(csv_file)

  # Write results to file
  if not os.path.exists('output'):
    os.makedirs('output')
  g.serialize(destination='output/CategoriesJuridiques.ttl', format='turtle')

if __name__ == '__main__':
  run()
