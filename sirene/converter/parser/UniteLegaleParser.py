import csv
from collections import namedtuple
from rdflib import Graph, URIRef, Literal, Namespace
from rdflib.namespace import RDF, FOAF, DC, SKOS

ADMS = Namespace('http://www.w3.org/ns/adms#')
EBG = Namespace('http://data.businessgraph.io/ontology#')
ORG = Namespace('http://www.w3.org/ns/org#')
ROV = Namespace('http://www.w3.org/ns/regorg#')
SCHEMA = Namespace('http://www.schema.org/')
SIRENE = Namespace('http://sirene.eurecom.fr/ontology#')

baseURI = 'http://sirene.eurecom.fr/'
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

def run():
  with open('data/StockUniteLegale_utf8.csv') as csv_file:
    csv_reader = csv.reader(csv_file, delimiter=',')
    UniteLegale = namedtuple('UniteLegale', next(csv_reader))
    g = createGraph()
    i = 0
    fileIndex = 1
    for row in map(UniteLegale._make, csv_reader):
      subj = URIRef(f'{baseURI}siren/{row.siren}')

      # RDF type
      g.add( (subj, RDF.type, ROV.FormalOrganization) )
      g.add( (subj, RDF.type, SIRENE.UniteJuridique) )

      # Properties related to both natural and legal persons
      if row.activitePrincipaleUniteLegale:
        g.add( (subj, ROV.orgActivity, Literal(row.activitePrincipaleUniteLegale)) )
      if row.categorieJuridiqueUniteLegale:
        g.add( (subj, ROV.orgType, URIRef(f'{baseURI}categorie-juridique/{row.categorieJuridiqueUniteLegale}')) )
      if row.dateCreationUniteLegale:
        g.add( (subj, SCHEMA.foundingDate, Literal(row.dateCreationUniteLegale)) )
      if row.dateDebut:
        g.add( (subj, DC.issued, Literal(row.dateDebut)) )
      if row.dateDernierTraitementUniteLegale:
        g.add( (subj, DC.updated, Literal(row.dateDernierTraitementUniteLegale)) )
      if row.etatAdministratifUniteLegale:
        g.add( (subj, ROV.orgStatus, Literal(row.etatAdministratifUniteLegale)) )
      if row.nomenclatureActivitePrincipaleUniteLegale:
        g.add( (subj, EBG.orgActivityText, Literal(row.nomenclatureActivitePrincipaleUniteLegale)) )
      if row.siren:
        g.add( (subj, ROV.registration, Literal(row.siren)) )
      if row.trancheEffectifsUniteLegale:
        g.add( (subj, SCHEMA.numberOfEmployees, Literal(row.trancheEffectifsUniteLegale)) )

      # Properties related to legal persons
      if row.denominationUniteLegale:
        g.add( (subj, ROV.legalName, Literal(row.denominationUniteLegale)) )
      if row.denominationUsuelle1UniteLegale:
        g.add( (subj, ROV.legalName, Literal(row.denominationUsuelle1UniteLegale)) )
      if row.denominationUsuelle2UniteLegale:
        g.add( (subj, ROV.legalName, Literal(row.denominationUsuelle2UniteLegale)) )
      if row.denominationUsuelle3UniteLegale:
        g.add( (subj, ROV.legalName, Literal(row.denominationUsuelle3UniteLegale)) )
      if row.sigleUniteLegale:
        g.add( (subj, SKOS.altLabel, Literal(row.sigleUniteLegale)) )

      # Properties related to natural persons
      if row.nomUniteLegale:
        g.add( (subj, FOAF.lastName, Literal(row.nomUniteLegale)) )
      if row.nomUsageUniteLegale:
        g.add( (subj, FOAF.givenName, Literal(row.nomUsageUniteLegale)) )
      if row.prenom1UniteLegale:
        g.add( (subj, FOAF.firstName, Literal(row.prenom1UniteLegale)) )
      if row.prenom2UniteLegale:
        g.add( (subj, FOAF.firstName, Literal(row.prenom2UniteLegale)) )
      if row.prenom3UniteLegale:
        g.add( (subj, FOAF.firstName, Literal(row.prenom3UniteLegale)) )
      if row.prenom4UniteLegale:
        g.add( (subj, FOAF.firstName, Literal(row.prenom4UniteLegale)) )
      if row.prenomUsuelUniteLegale:
        g.add( (subj, FOAF.givenName, Literal(row.prenomUsuelUniteLegale)) )
      if row.pseudonymeUniteLegale:
        g.add( (subj, FOAF.nick, Literal(row.pseudonymeUniteLegale)) )
      if row.sexeUniteLegale:
        g.add( (subj, FOAF.gender, Literal(row.sexeUniteLegale)) )

      # 'sirene' properties
      for p in [
        'identifiantAssociationUniteLegale',
        'nicSiegeUniteLegale',
        'nombrePeriodesUniteLegale',
        'economieSocialeSolidaireUniteLegale',
        'categorieEntreprise',
        'caractereEmployeurUniteLegale',
        'anneeEffectifsUniteLegale',
        'anneeCategorieEntreprise',
        'statutDiffusionUniteLegale',
        'unitePurgeeUniteLegale'
      ]:
        value = getattr(row, p)
        if value:
          g.add( (subj, SIRENE[p], Literal(value)) )

      i += 1
      if i % entitiesPerFile == 0:
       g.serialize(destination=f'data/StockUniteLegale-{fileIndex}.ttl', format='turtle')
       fileIndex += 1
       g = createGraph()


    # Write remaining triples to graph
    if len(g) > 0:
      g.serialize(destination=f'data/StockUniteLegale-{fileIndex}.ttl', format='turtle')

if __name__ == '__main__':
  run()
