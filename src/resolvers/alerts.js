// get Transloc Alerts
const config = require('../config');
const network = require('../network');
const axios = require('axios');
const xml2js = require('xml2js');


const alerts = {
    alerts: () => {
        return getAlerts().then(res => { return res});
    }
}

async function getAlerts() {
    const data = await axios.get(config.TRANSLOC_ANNOUCEMENTS);
    const parser = xml2js.Parser();
    return new Promise((resolve, reject) => {
        parser.parseString(data['data'].toString(), (err, result) => {
            if (err) {
                reject(err);
            } else {
                // TODO: Confirm that this works properly when we have multiple announcements
                const items = result.rss.channel[0].item.map(item => (
                    {
                        title: item.title[0],
                        guid: item.guid[0],
                        pubDate: item.pubDate[0],
                        description: item.description[0],
                    }
                ));
                resolve(items);
            }
        })
    });
}

module.exports = alerts;
