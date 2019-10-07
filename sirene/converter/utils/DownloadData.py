from tqdm import tqdm
import os
import requests
import zipfile

# Download file from URL and save it to a specific path
# Makes sure that the file doesn't exist yet
def get(url, outPath):
  if os.path.isfile(outPath):
    print(f'{outPath} already exists')
    return
  print(f'Downloading {url} to {outPath}')
  response = requests.get(url, stream=True)
  with open(outPath, 'wb') as handle:
    for data in tqdm(response.iter_content(chunk_size=8192)):
      handle.write(data)

# Download zip file and extract its content to a specific path
# Makes sure that the file doesn't exist yet
def download_zip(url, outPath):
  if os.path.isfile(outPath):
    print(f'{outPath} already exists')
    return
  get(url, outPath)
  with zipfile.ZipFile(outPath, 'r') as zip_ref:
    zip_ref.extractall('data')

def run():
  # Create data directory if needed
  if not os.path.exists('data'):
    os.makedirs('data')

  # Wikidata siren dump
  get('https://query.wikidata.org/#SELECT%20%3Fsiren%20%3Fitem%20WHERE%20%7B%20%3Fitem%20wdt%3AP1616%20%3Fsiren%20.%20%7D',
    'data/wikidataSiren.csv')

  # Wikidata siret dump
  get('https://query.wikidata.org/#SELECT%20%3Fsiret%20%3Fitem%20WHERE%20%7B%20%3Fitem%20wdt%3AP3215%20%3Fsiret%20.%20%7D',
    'data/wikidataSiret.csv')

  # Sirene: StockUniteLegale
  if not os.path.isfile('data/StockUniteLegale_utf8.csv'):
    download_zip('https://www.data.gouv.fr/en/datasets/r/cbb2b9bd-c05a-4f21-99e8-054df84e4b2b',
      'data/StockUniteLegale_utf8.zip')

  # Sirene: StockEtablissement
  if not os.path.isfile('data/StockEtablissement_utf8.csv'):
    download_zip('https://www.data.gouv.fr/en/datasets/r/b5eab96b-aa9a-4ece-9b38-0574807d9346',
      'data/StockEtablissement_utf8.zip')

  # Sirene: StockEtablissementLiensSuccession
  if not os.path.isfile('data/StockEtablissementLiensSuccession_utf8.csv'):
    download_zip(
      'https://www.data.gouv.fr/en/datasets/r/da2d16a6-0a7b-4386-a466-2b2fc83fd9d9',
      'data/StockEtablissementLiensSuccession_utf8.zip')
