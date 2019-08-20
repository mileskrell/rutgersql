const axios = require('axios');
const config = require('./config');
const chalk = require('chalk');
const moment = require('moment');

const log = console.log;
console.log(process.env.API_KY);
/**
 * resolver functions for transloc graphql api.
 * These are basically the endpoints.
 */
const resolvers = {

    // normal base queries. Single API call.
    routes:    (args,context) => {
        return getRoutes(args);
    },
    arrivals:  (args,context) => {
        return getArrivals(args);
    },
    segments:  (args,context) => {
        return getSegments(args);
    },
    vehicles:  (args,context) => {
        return getVehicles(args);
    },
    stops:     (args,context) => {
        return getStops(args);
    },
    // special queries. Multiple API calls to get data.
    vehiclesByName : (args,context) => {
        return getVehiclesByName(args);
    },
    segmentsByName : (args,context) => {
        return getSegmentsByName(args);
    },
    routesByName: (args,context) => {
        return getRoutesByName(args);
    },
    stopsWithRoutes : (args,context) => {
        return getStopsWithRoutes();
    },
};

// base API query. All API requests go through here.
function queryAPI(URL, args, unnest = false){
    let my_params = {
        'agencies': '1323',
        'geo_area': config.geo_area,
    };

    // put args into my_params object
    if(args != undefined || args != null){
        Object.keys(args).forEach((key,value) => {
            my_params[key] = args[key];
        });
    }

    return axios.get(URL, {
        headers : config.HEADERS,
        params : my_params,
    })
        .then((result) => {
            log(chalk.green('Success'));
            // Transloc sometimes returns "data : { 1323 : {actual data here }}" so we have to unwrap 1323 to get real data.
            if(unnest){
                let res = result['data'];
                let data = (res['data'])['1323'];
                res['data'] = data;
                // log(res);
                return res;
            }
            // log(result['data']);
            return result['data'];
        })
        .catch((error) => {
            // https://gist.github.com/fgilio/230ccd514e9381fafa51608fcf137253
            const pf = chalk.bgRed.black;
            if (error.response) {
                log(error.response.data);
                log(error.response.status);
                log(error.response.headers);
            } else if (error.request) {
                log(error.request);
            } else {
                log('Error', error.message);
            }
            log(error.config);
        });
}

function getArrivals(args){
    const URL = config.API_URL + '/arrival-estimates.json';
    const my_params = {
        routes : Object.is(args['routes'], undefined) ? null : args['routes'].join(','),
        stops : Object.is(args['stops'], undefined) ? null : args['stops'].join(','),
    };
    return queryAPI(URL,my_params).then((res) => {return res});
}

// takes the route name like 'A' or 'LX' and gets the respective segments.
function getSegmentsByName(args){
    // get route_name from args
    const route_name = args['name'];
    log(route_name);
    const result = getRoutes(null)
        .then((response) => {
            log(JSON.stringify(response));
            const res = response['data'];
            log(res);
            const map = {};
            res.forEach((it) => {map[it.long_name] = it.route_id});
            const args = {routeName : map[route_name]};
            return getSegments(map[route_name]);
        });

    return result.then((vehicles_list) => {return vehicles_list});
}

function getSegments(args){
    const URL = config.API_URL + '/segments.json';
    const route = args['route'];
    return queryAPI(URL,args).then((res) => {
        let segments = [];
        let segment_obj = res['data'];
        Object.keys(segment_obj).forEach((key) => {
            segments.push(segment_obj[key]);
        });
        res['data'] = segments;
        return res;
    });
}

// takes the route name like 'A' or 'LX' and gets all the associated vehicles.
function getVehiclesByName(args){
    // get route_name from args
    const route_name = args['name'];
    const result = getRoutes(null)
        .then((response) => {
            // get all the routes and map the route id with its name. For example : ( "4040102" : "Route A )
            const res = response['data'];
            const map = {};
            res.forEach((it) => {map[it.route_id] = it.long_name});
            // get all the vehicles and filter the ones where the route_id in map returns the route name that we want.
            return getVehicles(config.route_id_test)
                .then((response) => {
                    const res = response['data'];
                    return res.filter((it) => map[it.route_id] === route_name);
                });
        });

    return result.then(vehicles_list => {return vehicles_list});
}

function getRoutesByName(args){
    const route_result = getRoutes(null)
    // get routes, then get vehicles then sort vehicles by shortest arrival time then combine both into one object.
        .then((response) => {
            const res = response['data'];
            const route_obj = res.filter((it) => (it.long_name == args['name']));
            return vehicle_result = getVehiclesByName(args)
                .then((vehicles) => {
                    // sort the arrivals of each vehicle
                    vehicles.forEach((vehicle) => {
                        const arrival_est = vehicle['arrival_estimates'];
                        arrival_est.sort((a,b) => {
                            return a['arrival_at'] < b['arrival_at'];
                        });
                    });
                    // sort the buses based on arrival times of the first arrival_estimate cuz those are sorted already.
                    vehicles.sort((a,b) => { return (a['arrival_estimates'])[0] < (b['arrival_estimates'])[0] });
                    // combine route_obj and response
                    const result = {...route_obj, vehicles};
                    return result;
                });
        })
        // give each stop_id its stop name.
        .then((response) => {
            return getStops(null)
                .then((stops_response) => {
                    const stop_id_2_name = {};
                    // map each stop_id from stops to its name
                    const stops = stops_response['data'];
                    stops.forEach((stop) => { stop_id_2_name[stop['stop_id']] = stop['name']});
                    response['vehicles'].forEach((vehicle) => {
                        vehicle['arrival_estimates'].forEach((est) => {
                            est['name'] = stop_id_2_name[est['stop_id']];
                        });
                    });
                    return response;
                });

        })
        .then(final_result => {
            // combine the route object and the vehicles object
            // segments is useless in this case
            delete (final_result['0'])['segments'];
            let vehicles = final_result['vehicles'];
            return { ...final_result['0'],vehicles};
        });
    return route_result.then(res => {return res});

}
// all the routes that stop at that stop.
// from all of those routes, get all the vehicles and sort by the arrival time to that stop.
function getStopsWithRoutes(){
    const stopsWithRoutes = getVehicles([config.route_id_test, config.route_id_test_2])
        .then(vehicles_res => {
            const vehicles = vehicles_res['data'];
            vehicles.sort((a,b) => { return (a['arrival_estimates'])[0] < (b['arrival_estimates'])[0] });
            return vehicles
        })
        .then(vehicles_sorted => {
            return getStops(null)
                .then(stop_res => {
                    const stops = stop_res['data'];
                    const stop_id_to_name = {};
                    const stop_id_to_vehicle = {};

                    stops.forEach(s => {stop_id_to_name[s['stop_id']] = s['name']});

                    vehicles_sorted.forEach(v => {
                        const arrivals = v['arrival_estimates'];
                        arrivals.forEach(a => {
                            const vcpy = Object.assign({},v);
                            vcpy['stop_arrival_time'] = a['arrival_at'];
                            vcpy['stop_name'] = stop_id_to_name[a['stop_id']];
                            stop_id_to_vehicle[a['stop_id']] = vcpy;
                        });
                    });
                    return {stop_id_to_vehicle, stops };
                });
        })
        .then(stop_id_to_vehicle_and_all_stops=> {
            const {stop_id_to_vehicle, stops} = stop_id_to_vehicle_and_all_stops;
            log(stop_id_to_vehicle);
            stops.forEach(stop => {
                stop['vehicle'] = [];
                Object.keys(stop_id_to_vehicle).forEach((key,value) => {
                    if(key === stop['stop_id']){
                        stop['vehicle'].push(stop_id_to_vehicle[key]);
                    }
                });
                stop['vehicle'].sort((a,b) => {
                    return a['stop_arrival_time'] < b['stop_arrival_time'];
                })
            });
            return stops;
        })
        .then(final_stops => {
            // any final processing can be done
            return final_stops;
        });
    return stopsWithRoutes.then(res => {return res});
}

//  needs to be unnested
function getVehicles(args){
    log(chalk.green("getting vehicles"));
    const URL = config.API_URL + '/vehicles.json';
    const my_params  = {
        // if routes is undefined set key as null otherwise join it ( changes it from routes : [a,b,c] to routes : "a,b,c". ( Array -> Single String basically)
        routes : Object.is(args['routes'], undefined) ? null : args['routes'].join(',')
    };
    return queryAPI(URL,my_params,true).then(res => {return res});
}

function getStops(args){
    log(chalk.cyan("getting stops"));
    const URL = config.API_URL + '/stops.json';
    return queryAPI(URL,args).then(res => {return res});
}

// Needs to be unnested.
function getRoutes(args){
    log(chalk.magenta("getting routes"));
    const URL = config.API_URL + '/routes.json';
    return queryAPI(URL,args,true).then(res => { return res});
}

module.exports = resolvers;
