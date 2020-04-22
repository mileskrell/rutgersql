const axios = require('axios'); 
const log = console.log;
const agis = {
    buildingsForCampus:    (args) => {
        return fetchCampus(args);
    },
};


const fetchCampus = async args => {
    let xMin = null;
    let yMin = null;
    let xMax = null;
    let yMax = null;
    switch(args['campus']){
        case 'Camden':
            xMin = "-75.072413"
            yMin = "39.907169"
            xMax = "-75.137343"
            yMax = "39.974029"
            break;
        case 'Newark':
            xMin = "-74.110503"
            yMin = "40.695347"
            xMax = "-74.242425"
            yMax = "40.777032"
            break;
        case 'New Brunswick':
            xMin = "-75.314648"
            yMin = "39.844001"
            xMax = "-73.963602"
            yMax = "40.837580"
            break;

    }


    let url = "https://services1.arcgis.com/ze0XBzU1FXj94DJq/arcgis/rest/services/Rutgers_University_Buildings/FeatureServer/0/query?geometry=%7B%22xmin%22%3A" + xMin + "%2C+%22ymin%22%3A" + yMin +"%2C+%22xmax%22%3A" + xMax + "%2C+%22ymax%22%3A" + yMax + "%7D&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&resultType=none&distance=0.0&units=esriSRUnit_Meter&returnGeodetic=false&outFields=BldgName%2C+BldgNum%2C+Latitude%2C+Longitude&returnGeometry=true&returnCentroid=false&featureEncoding=esriDefault&multipatchOption=xyFootprint&outSR=4326&applyVCSProjection=false&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnExtentOnly=false&returnQueryGeometry=false&returnDistinctValues=true&cacheHint=false&returnZ=false&returnM=false&returnExceededLimitFeatures=true&sqlFormat=none&f=geojson"
    let response = await axios.get(url);
    return response['data']['features'].map((bldg) => ({
        buildingNumber: bldg['properties']['BldgNum'],
        buildingName: bldg['properties']['BldgName'],
        buildingCenter: {
            lat: bldg['properties']['Latitude'],
            lng: bldg['properties']['Longitude'],
        },
        buildingPolygons: bldg['geometry']['coordinates'].map((polygon) => {
          return polygon.map((coordinatePair) => ({
             lat: coordinatePair[0],
             lng: coordinatePair[1]
         }))
     })
    }));
};

module.exports = {
    agisBase: agis,
    fetchCampus
};