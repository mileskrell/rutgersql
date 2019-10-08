/**
 cache API data from Transloc
 cache a map of stop_id's to names
 cache a map of route_id to route_names
 cache all active vehicles?
 cache all active routes?
 update cache every x seconds
 **/

const NodeCache = require( "node-cache" );

const log = console.log;

class Cache {

    static STOP_ID_KEY  = "stop_id_stop_name";
    static ROUTE_ID_KEY = "route_id_route_name";

    constructor(checkperiod,deleteOnExpire,errorOnMissing,useClones = false) {
        this.myCache = new NodeCache({checkperiod,deleteOnExpire,errorOnMissing});
    }

    set(key,obj) {
            this.myCache.set(key, obj, (err, success) => {
                if (!err && success) {
                    log(success);
                } else {
                    log("error setting key");
                }
            });
        };

    // update cache every x minutes
    dispatchUpdate(){

    }

    // get item from cache
    get(key){
        this.myCache.get(key, (err, value) => {
            if(!err) {
                if (value == undefined) {
                    log("value not found");
                } else {
                    log(value);
                    return value;
                }
            }
        });
    };

    onSet(action) {
        let result = null;
        this.myCache.on(action, (key, value) => {
           try{
               log(JSON.parse(value));
               result = JSON.parse(value);
           } catch (JSONParseException){
              console.error(JSONParseException);
           }
        });
    }

    // clear out cache
    flush  (){
        this.myCache.flushAll();
        this.myCache.close();
    }
}

class BusCache extends Cache {
    constructor(args) {
        super(args);
    }

    getStopIDtoName(){

    }

    getRouteIdtoName(){

    }
}


class RutgersCache extends Cache {
    constructor(args){
        super(args);
    }

    getPlaces(){

    }
}

// Cache object that is used by every other module.
const globalCache = new Cache(1000,false,true);
module.exports = globalCache;