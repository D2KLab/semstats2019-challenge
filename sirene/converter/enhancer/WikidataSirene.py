import csv
import glob
import os
from rdflib import Graph, URIRef, Literal, Namespace
from rdflib.namespace import RDF, OWL

ROV = Namespace('http://www.w3.org/ns/regorg#')

def parse(stockFilesPath, wikidataFilePath):
  finalGraph = Graph()

  for f in glob.glob(stockFilesPath):
    print(f'Parsing {f}')
    outputBaseName = os.path.splitext(os.path.basename(f))[0]

    g = Graph()
    g.parse(f, format='turtle')

    with open(wikidataFilePath) as csv_file:
      csv_reader = csv.reader(csv_file, delimiter=',')
      for row in csv_reader:
        subj = g.value(predicate = ROV.registration, object = Literal(row[0]))
        if subj != None:
          finalGraph.add( (subj, OWL.sameAs, URIRef(row[1])) )

    if len(finalGraph) > 0:
      finalGraph.serialize(destination=os.path.join('data/wikidata', f'wikidata_{outputBaseName}.nt'), format='nt')

def run():
  if not os.path.exists('data/wikidata'):
    os.mkdir('data/wikidata')

  parse('data/StockUniteLegale_*.ttl', 'data/wikidataSiren.csv')
  parse('data/StockEtablissement_*.ttl', 'data/wikidataSiret.csv')

if __name__ == '__main__':
  run()
