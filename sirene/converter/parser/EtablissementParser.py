import csv
import os
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

def parse_address(g, subj, row):
  address = URIRef(f'{baseURI}siret/{row.siret}/address')
  g.add( (subj, ORG.siteAddress, address) )
  g.add( (address, RDF.type, SCHEMA.PostalAddress) )

  # Establishment name
  if row.enseigne1Etablissement:
    g.add( (address, SCHEMA.name, Literal(row.enseigne1Etablissement)) )
  if row.enseigne2Etablissement:
    g.add( (address, SCHEMA.name, Literal(row.enseigne2Etablissement)) )
  if row.enseigne3Etablissement:
    g.add( (address, SCHEMA.name, Literal(row.enseigne3Etablissement)) )

  streetAddress = []
  streetAddress2 = []

  # Street number
  if row.numeroVoieEtablissement:
    streetAddress.append(row.numeroVoieEtablissement)
  if row.numeroVoie2Etablissement:
    streetAddress2.append(row.numeroVoie2Etablissement)

  # Street type
  if row.typeVoieEtablissement:
    streetAddress.append(row.typeVoieEtablissement)
  if row.typeVoie2Etablissement:
    streetAddress2.append(row.typeVoie2Etablissement)

  # Street name
  if row.libelleVoieEtablissement:
    streetAddress.append(row.libelleVoieEtablissement)
  if row.libelleVoie2Etablissement:
    streetAddress2.append(row.libelleVoie2Etablissement)

  if streetAddress:
    fullAddress = ' '.join(streetAddress)
    # Additional address
    if row.complementAdresseEtablissement:
      fullAddress += ', ' + row.complementAdresseEtablissement
    # CEDEX
    if row.libelleCedexEtablissement:
      fullAddress += ', ' + row.libelleCedexEtablissement
    g.add( (address, SCHEMA.streetAddress, Literal(fullAddress)) )

  if streetAddress2:
    fullAddress2 = ' '.join(streetAddress)
    # Additional address
    if row.complementAdresse2Etablissement:
      fullAddress2 += ', ' + row.complementAdresse2Etablissement
    # CEDEX
    if row.libelleCedex2Etablissement:
      fullAddress2 += ', ' + row.libelleCedex2Etablissement
    g.add( (address, SCHEMA.streetAddress, Literal(fullAddress2)) )

  # Zip code
  if row.codePostalEtablissement:
    g.add( (address, SCHEMA.postalCode, Literal(row.codePostalEtablissement)) )
  if row.codePostal2Etablissement:
    g.add( (address, SCHEMA.postalCode, Literal(row.codePostal2Etablissement)) )

  # City
  if row.libelleCommuneEtablissement:
    g.add( (address, SCHEMA.addressLocality, Literal(row.libelleCommuneEtablissement)) )
  if row.libelleCommune2Etablissement:
    g.add( (address, SCHEMA.addressLocality, Literal(row.libelleCommune2Etablissement)) )
  if row.libelleCommuneEtrangerEtablissement:
    g.add( (address, SCHEMA.addressLocality, Literal(row.libelleCommuneEtrangerEtablissement)) )
  if row.libelleCommuneEtranger2Etablissement:
    g.add( (address, SCHEMA.addressLocality, Literal(row.libelleCommuneEtranger2Etablissement)) )

  # Country
  if row.libellePaysEtrangerEtablissement:
    g.add( (address, SCHEMA.addressCountry, Literal(row.libellePaysEtrangerEtablissement)) )
  if row.libellePaysEtranger2Etablissement:
    g.add( (address, SCHEMA.addressCountry, Literal(row.libellePaysEtranger2Etablissement)) )
  if not row.libellePaysEtrangerEtablissement and not row.libellePaysEtranger2Etablissement:
    g.add( (address, SCHEMA.addressCountry, Literal('France')) )

def processFile(inputPath):
  outputBaseName = os.path.splitext(os.path.basename(inputPath))[0]

  with open(inputPath) as csv_file:
    csv_reader = csv.reader(csv_file, delimiter=',')
    Etablissement = namedtuple('Etablissement', next(csv_reader))
    g = createGraph()
    i = 0
    fileIndex = 1
    for row in map(Etablissement._make, csv_reader):
      subj = URIRef(f'{baseURI}siret/{row.siret}')

      # RDF type
      g.add( (subj, RDF.type, ROV.RegisteredOrganization) )
      g.add( (subj, RDF.type, SIRENE.UniteJuridique) )

      if row.dateCreationEtablissement:
        g.add( (subj, SCHEMA.foundingDate, Literal(row.dateCreationEtablissement)) )
      if row.dateDebut:
        g.add( (subj, DC.issued, Literal(row.dateDebut)) )
      if row.dateDernierTraitementEtablissement:
        g.add( (subj, DC.updated, Literal(row.dateDernierTraitementEtablissement)) )
      if row.siret:
        g.add( (subj, ROV.registration, Literal(row.siret)) )
      if row.trancheEffectifsEtablissement:
        g.add( (subj, SCHEMA.numberOfEmployees, Literal(row.trancheEffectifsEtablissement)) )

      # Establishment address
      parse_address(g, subj, row)

      # Link between legal unit and establishment
      g.add( (URIRef(f'{baseURI}siren/{row.siren}'), ORG.hasRegisteredOrganization, subj) )
      g.add( (subj, ORG.siteOf, URIRef(f'{baseURI}siren/{row.siren}')) )

      # 'sirene' properties
      for p in [
        'activitePrincipaleEtablissement',
        'activitePrincipaleRegistreMetiersEtablissement',
        'anneeEffectifsEtablissement',
        'caractereEmployeurEtablissement',
        'codeCedexEtablissement',
        'codeCedex2Etablissement',
        'codeCommuneEtablissement',
        'codeCommune2Etablissement',
        'codePaysEtrangerEtablissement',
        'codePaysEtranger2Etablissement',
        'codePostalEtablissement',
        'codePostal2Etablissement',
        'complementAdresseEtablissement',
        'complementAdresse2Etablissement',
        'denominationUsuelleEtablissement',
        'distributionSpecialeEtablissement',
        'distributionSpeciale2Etablissement',
        'etablissementSiege',
        'etatAdministratifEtablissement',
        'indiceRepetitionEtablissement',
        'indiceRepetition2Etablissement',
        'nic',
        'nombrePeriodesEtablissement',
        'nomenclatureActivitePrincipaleEtablissement',
        'statutDiffusionEtablissement'
      ]:
        value = getattr(row, p)
        if value:
          g.add( (subj, SIRENE[p], Literal(value)) )

      i += 1
      if i % entitiesPerFile == 0:
       g.serialize(destination=os.path.join('data', f'{outputBaseName}_{fileIndex}.ttl'), format='turtle')
       fileIndex += 1
       g = createGraph()

    # Write remaining triples to graph
    if len(g) > 0:
      g.serialize(destination=os.path.join('data', f'{outputBaseName}_{fileIndex}.ttl'), format='turtle')

def run():
  processFile('data/StockEtablissement_utf8.csv')

if __name__ == '__main__':
  processFile('data/StockEtablissement_utf8-extract.csv')
