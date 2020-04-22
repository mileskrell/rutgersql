// combine all of our resolvers so GraphQL can link them to our queries in schema.js (methods must have same name as query)
const {baseResolvers} = require('./resolvers/transloc/transloc_base');
const {complexResolvers} = require('./resolvers/transloc/transloc_complex');
const gmapResolvers = require('./resolvers/directions');
const {agisBase} = require('./resolvers/agis/agis_base');
const alerts = require('./resolvers/alerts');
const resolvers = {...baseResolvers, ...complexResolvers, ...agisBase, ...gmapResolvers, ...alerts};

module.exports = resolvers;

