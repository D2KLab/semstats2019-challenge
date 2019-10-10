var colors = {
    "A1": "#e30015",
    "A2": "#3b7fb8",
    "A3": "#4ab250",
    "A4": "#9a4aa2",
    "A5": "#fd7e15",
    "B1": "#fcff48",
    "B2": "#a65426",
    "B3": "#f77fbf",
    "C1": "#9a9a9a",
    "C2": "#004206",
    "C3": "#22ffff",
    "C4": "#13008e",
    "C5": "#5e0023",
    "C6": "#fff5ff",
    "C7": "#4e4d50",
    "D1": "#b899fc",
    "D2": "#6e00f5",
    "D3": "#4d006e",
    "D4": "#06826d",
    "D5": "#72ffa1",
    "D6": "#696d11",
    "D7": "#e0c88f",
    "E1": "#69c3fc",
    "F1": "#d90082",
    "F2": "#593104",
    "F3": "#43beab",
    "G1": "#b29c1d"
};

var map = new mapboxgl.Map({
    container: 'map', // container id
    style: 'mapbox://styles/mapbox/streets-v11', // stylesheet location
    center: [7.2620, 43.7102], // starting position
    zoom: 11 // starting zoom
});

function getProperty(propName) {
    // Properties from the minimized geojson file are mapped to reduce the file size
    return (['typeNotation', 'topNotation', 'capacite'].indexOf(propName) + 1) + '';
}

function getAlignmentsProperty(propName) {
    // Properties from the minimized geojson file are mapped to reduce the file size
    return (['s', 'geo', 'topNotation'].indexOf(propName) + 1) + '';
}

function loadTypesLabels() {
    const body = encodeURIComponent('query') + '=' + encodeURIComponent(`
        PREFIX ibpe: <http://rdf.insee.fr/def/bpe#>
        PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
        SELECT DISTINCT ?notation ?label WHERE {
            GRAPH <http://semstats.eurecom.fr/bpe/codelists> {
                ?s a ibpe:TypeEquipement .
                ?s skos:notation ?notation .
                ?s skos:prefLabel ?label .
            }
        }
        ORDER BY ASC(?notation)
    `);

    return new Promise((resolve, reject) => {
        fetch('//sirene.eurecom.fr/repositories/semstats2019', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Accept': 'application/sparql-results+json,*/*;q=0.9'
            },
            body
        })
        .then(res => res.json())
        .then(function (data) {
            resolve(data);
        })
        .catch(function (error) {
            reject(error);
        });
    });
}

const entitiesCache = {};
function getEntityData(uri) {
    if (entitiesCache[uri]) {
        return Promise.resolve(entitiesCache[uri]);
    }
    return new Promise((resolve, reject) => {
        const body = encodeURIComponent('query') + '=' + encodeURIComponent(`
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            PREFIX geogis: <http://www.opengis.net/ont/geosparql#>
            PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>
            PREFIX ibpe: <http://rdf.insee.fr/def/bpe#>
            PREFIX align: <http://knowledgeweb.semanticweb.org/heterogeneity/alignment#>
            PREFIX schema: <http://schema.org/>
            PREFIX lode: <http://linkedevents.org/ontology/>
            PREFIX ma-ont: <http://www.w3.org/ns/ma-ont#>
            PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
            PREFIX dcterms: <http://purl.org/dc/terms/>
            PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
            PREFIX locationOnt: <http://data.linkedevents.org/def/location#>
            PREFIX locn: <http://www.w3.org/ns/locn#>
            SELECT ?ent1 ?ent2 ?geo ?capacite ?typeNotation ?typeNotationLabel ?businessType ?businessTypeLabel ?label ?poster ?streetAddress ?measure WHERE {
                {
                    SELECT ?ent1 ?ent2 ?measure WHERE {
                        GRAPH <http://semstats.eurecom.fr/bpe/alignments> {
                            <${uri}> a align:Alignment .
                            <${uri}> align:map ?map .
                            ?map align:entity1 ?ent1 .
                            ?map align:entity2 ?ent2 .
                            ?map align:relation "=" .
                            ?map align:measure ?measure .
                            FILTER (?measure >= "0.8"^^xsd:float)
                        }
                    }
                    ORDER BY DESC(?measure)
                    LIMIT 1
                }
                GRAPH <http://semstats.eurecom.fr/bpe/facilities> {
                    OPTIONAL { ?ent1 ibpe:capacite ?capacite . }
                    ?ent1 dcterms:type ?type .
                    GRAPH <http://semstats.eurecom.fr/bpe/codelists> {
                        ?type skos:notation ?typeNotation .
                        ?type skos:prefLabel ?typeNotationLabel .
                    }
                }
                SERVICE <https://kb.city-moove.fr/sparql> {
                    ?ent2 rdfs:label ?label .
                    ?ent2 geo:location/locn:geometry ?geo .
                    ?ent2 locationOnt:businessType ?businessType .
                    OPTIONAL { ?businessType skos:prefLabel ?businessTypeLabel . }
                    OPTIONAL { ?ent2 lode:poster/ma-ont:locator ?poster . }
                    OPTIONAL { ?ent2 schema:location/schema:streetAddress ?streetAddress . }
                }
            }
        `);

        fetch('//sirene.eurecom.fr/repositories/semstats2019', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Accept': 'application/sparql-results+json,*/*;q=0.9'
            },
            body
        })
        .then(res => res.json())
        .then((data) => {
            const result = data.results.bindings[0];
            entitiesCache[uri] = result;
            resolve(result);
        })
        .catch((error) => {
            reject(error);
        });
    });
}

map.once('styledata', function () {
    console.log('map loaded');

    let typesLabels = {};
    loadTypesLabels().then(data => {
        data.results.bindings.forEach(bind => {
            typesLabels[bind.notation.value] = bind.label.value;
        });

        var html = '';
        Object.keys(typesLabels).forEach(notation => {
            console.log(notation, typesLabels[notation]);
            if (notation.length === 2) { // eg. A2
                html += `<span class="legend"><span class="icon" style="background-color: ` + colors[notation] + `"></span> ${typesLabels[notation]}</span>`;
            }
        });
        document.querySelector('#sidebar').innerHTML = html;
    });

    // Create a popup, but don't add it to the map yet.
    const popup = new mapboxgl.Popup({
        closeButton: false
    });

    // Alignments
    map.addSource("alignments", {
        type: "geojson",
        data: 'http://localhost:5000/alignments.min.geojson',
        cluster: true,
        clusterMaxZoom: 12, // Max zoom to cluster points on
        clusterRadius: 50 // Radius of each cluster when clustering points (defaults to 50)
    });
    map.addLayer({
        id: "clusters-alignments",
        type: "circle",
        source: "alignments",
        filter: ["has", "point_count"],
        paint: {
            "circle-color": "#51bbd6",
            "circle-radius": [
                "step",
                ["get", "point_count"],
                20,
                100,
                30,
                750,
                40
            ],
            "circle-opacity": 0.75
        }
    });
    map.addLayer({
        id: "cluster-count-alignments",
        type: "symbol",
        source: "alignments",
        filter: ["has", "point_count"],
        layout: {
            "text-field": "{point_count_abbreviated}",
            "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
            "text-size": 12
        }
    });
    map.addLayer({
        id: "unclustered-point-alignments",
        type: "circle",
        source: "alignments",
        filter: ["!", ["has", "point_count"]],
        paint: {
            "circle-color": [
                "match",
                ["get", getAlignmentsProperty('topNotation')],
                "A1", "#e30015",
                "A2", "#3b7fb8",
                "A3", "#4ab250",
                "A4", "#9a4aa2",
                "A5", "#fd7e15",
                "B1", "#fcff48",
                "B2", "#a65426",
                "B3", "#f77fbf",
                "C1", "#9a9a9a",
                "C2", "#004206",
                "C3", "#22ffff",
                "C4", "#13008e",
                "C5", "#5e0023",
                "C6", "#fff5ff",
                "C7", "#4e4d50",
                "D1", "#b899fc",
                "D2", "#6e00f5",
                "D3", "#4d006e",
                "D4", "#06826d",
                "D5", "#72ffa1",
                "D6", "#696d11",
                "D7", "#e0c88f",
                "E1", "#69c3fc",
                "F1", "#d90082",
                "F2", "#593104",
                "F3", "#43beab",
                "G1", "#b29c1d",
                "#f400fb",
                //"#920000",
                //"#0c4e74",
            ],
            "circle-radius": 8,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#fff"
        }
    });
    map.on('mousemove', 'unclustered-point-alignments', function(e) {
        // Change the cursor style as a UI indicator
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseenter', 'unclustered-point-alignments', function(e) {
        // Populate the popup and set its coordinates based on the feature
        const feature = e.features[0];

        const uri = feature.properties[getAlignmentsProperty('s')];

        popup.setLngLat(feature.geometry.coordinates)
            .setHTML('...')
            .addTo(map);

        getEntityData(uri).then(data => {
            if (!data) {
                popup.setHTML('Could not load data')
            } else {
                const values = {};
                Object.keys(data).forEach(k => {
                    values[k] = data[k].value;
                });

                const { poster, businessTypeLabel, label, streetAddress, capacite, typeNotation, typeNotationLabel, measure } = values;

               popup.setHTML(`
                    ${poster ? `<img src="${poster}" width="50"><br>` : ''}
                    ${typeNotationLabel ? `<small>${typeNotationLabel}${businessTypeLabel ? ` (${businessTypeLabel})` : ''}</small><br>` : ''}
                    ${label ? `<b>${label}</b><br>` : ''}
                    ${streetAddress ? `${streetAddress}<br>` : ''}
                    ${measure ? `<small>(score: ${parseFloat(measure).toFixed(2)})</small>` : ''}
                `);
            }
        });
    });
    map.on('mouseleave', 'unclustered-point-alignments', function() {
        map.getCanvas().style.cursor = '';
        popup.remove();
    });
    map.on('click', 'clusters-alignments', function (e) {
        var features = map.queryRenderedFeatures(e.point, { layers: ['clusters-alignments'] });
        var clusterId = features[0].properties.cluster_id;
        map.getSource('alignments').getClusterExpansionZoom(clusterId, function (err, zoom) {
            if (err) {
                return;
            }

            map.easeTo({
                center: features[0].geometry.coordinates,
                zoom: zoom
            });
        });
    });
    map.on('mouseenter', 'clusters-alignments', function () {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'clusters-alignments', function () {
        map.getCanvas().style.cursor = '';
    });

    // Add geocoder control (search box) to the map
    map.addControl(new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        zoom: 14,
        placeholder: "Enter search e.g. Promenade des Anglais",
        mapboxgl
    }));

    // Add geolocate control to the map
    map.addControl(new mapboxgl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true
        },
        trackUserLocation: true
    }));
});
