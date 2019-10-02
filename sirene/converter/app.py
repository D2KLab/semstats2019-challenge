from converter.parser import UniteLegaleParser, EtablissementParser, EtablissementLiensSuccessionParser, CategoriesJuridiquesParser
from converter.parser import EtablissementParser

def run():
  CategoriesJuridiquesParser.run()
  UniteLegaleParser.run()
  EtablissementParser.run()
  EtablissementLiensSuccessionParser.run()
