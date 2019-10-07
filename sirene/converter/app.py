from converter.parser import UniteLegaleParser, EtablissementParser, EtablissementLiensSuccessionParser, CategoriesJuridiquesParser
from converter.enhancer import WikidataSirene
from converter.utils import DownloadData

def run():
  DownloadData.run()
  CategoriesJuridiquesParser.run()
  UniteLegaleParser.run()
  EtablissementParser.run()
  EtablissementLiensSuccessionParser.run()
  WikidataSirene.run()