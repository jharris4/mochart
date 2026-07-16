/**
 * Sample local-config.js file
 * Copy and rename this file to local-config.js in the root of the project directory to activate it
 *
 * The properties exported by this module will override the properties specified in config.js when building or starting the server
 *
 * build - The build section, whose properties are defined in webpack-express-starter/src/webpack-builder.js
 * server - The server section, whose properties are defined in webpack-express-starter/src/express-server.js
 */

const ip = require('ip');

const vpnIpKey = 'ppp0';
const localIpKey = undefined;

// Use either vpnKey or localIpKey here
const serverIp = ip.address(localIpKey);
const serverPort = 8080;

module.exports = {
  build: {
    localResolveMap: {
      "js": {
        "mochart": "../mochart/src",
        "valide": "../valide/src/validators.js"
      }
    },
    localResolvePackagesPath: "."
  },
  server: {
    templateObject: {
      "config": {
        "routerBasePath": "/"
      }
    },
    host: "http://" + serverIp + ":" + serverPort,
    port: serverPort,
    openBrowser: true
  }
};
