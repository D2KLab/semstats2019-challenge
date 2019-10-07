import csv
import os
from collections import namedtuple
from rdflib import Graph, Literal, Namespace
from rdflib.namespace import RDF, FOAF, DC, SKOS

ADMS = Namespace('http://www.w3.org/ns/adms#')
EBG = Namespace('http://data.businessgraph.io/ontology#')
ORG = Namespace('http://www.w3.org/ns/org#')
PROV = Namespace('http://www.w3.org/ns/prov#')
ROV = Namespace('http://www.w3.org/ns/regorg#')
SCHEMA = Namespace('http://www.schema.org/')
SIRENE = Namespace('http://sirene.eurecom.fr/ontology#')

entitiesPerFile = 1e5 # 100k

def createGraph():
  g = Graph()
  g.bind('rdf', RDF)
  g.bind('foaf', FOAF)
  g.bind('dc', DC)
  g.bind('skos', SKOS)
  g.bind('adms', ADMS)
  g.bind('ebg', EBG)
  g.bind('org', ORG)
  g.bind('rov', ROV)
  g.bind('schema', SCHEMA)
  g.bind('sirene', SIRENE)
  return g

def writeGraph(g, outputBaseName, fileIndex):
  outputPath = f'data/StockEtablissementLiensSuccession-{fileIndex}.ttl'
  g.serialize(destination=outputPath, format='turtle')
  print(f'Wrote {len(g)} triples to {outputPath}')

def processFile(inputPath):
  outputBaseName = os.path.splitext(os.path.basename(inputPath))[0]

  with open(inputPath) as csv_file:
    csv_reader = csv.reader(csv_file, delimiter=',')
    LienSuccession = namedtuple('LienSuccession', next(csv_reader))
    g = createGraph()
    i = 0
    fileIndex = 1
    for row in map(LienSuccession._make, csv_reader):
      subj = SIRENE[f'event/{row.siretEtablissementPredecesseur}-{row.siretEtablissementSuccesseur}']

      # RDF type
      g.add( (subj, RDF.type, ORG.ChangeEvent) )

      g.add( (subj, ORG.originalOrganization, Literal(row.siretEtablissementPredecesseur)) )
      g.add( (subj, ORG.resultingOrganization, Literal(row.siretEtablissementSuccesseur)) )
      g.add( (subj, PROV.startedAtTime, Literal(row.dateLienSuccession)) )
      g.add( (subj, PROV.endedAtTime, Literal(row.dateDernierTraitementLienSuccession)) )

      # 'sirene' properties
      for p in [
        'transfertSiege',
        'continuiteEconomique'
      ]:
        value = getattr(row, p)
        if value:
          g.add( (subj, SIRENE[p], Literal(value)) )

      i += 1
      if i % entitiesPerFile == 0:
        writeGraph(g, outputBaseName, fileIndex)
        fileIndex += 1
        g = createGraph()

    # Write remaining triples to graph
    if len(g) > 0:
      writeGraph(g, outputBaseName, fileIndex)

def run():
  processFile('data/StockEtablissementLiensSuccession_utf8.csv')

if __name__ == '__main__':
  processFile('data/StockEtablissementLiensSuccession_utf8-extract.csv')
