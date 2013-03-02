var requirejs = require("requirejs");
var _ = require("underscore");

requirejs.config({
    // Underscore needs to be shimmed into the require system.
    shim: {
        'underscore': {exports: '_'}
    },
    //Use node's special variable __dirname to
    //get the directory containing this file.
    //Useful if building a library that will
    //be used in node but does not require the
    //use of node outside
    baseUrl: __dirname + "/static/js",

    //Pass the top-level main.js/index.js require
    //function to requirejs so that node modules
    //are loaded relative to the top-level JS file.
    nodeRequire: require
});

module.exports.withRules = function(rules, f) {
    requirejs(['board', 'rules/' + rules], f);
}
