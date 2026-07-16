var npmPackage = require('./package');

var productName = "mochart-demo";
var productVersion = npmPackage.version;

var versionString = '' + productVersion;
var webPath = `/static/${productName}/`;

var sentryBaseURL = 'https://sentry.jharris4.com/api/0';
var sentryOrganization = 'arts-management-systems';
var sentryProject = 'mochart-demo';
var sentryKey = 'https://a89286b67da24f6b8e74041f53d21ede@sentry.jharris4.com/7';
var sentryAuthToken = '57ed515cde7c4f4ab606a5fedbcc4da88d1cc55ec4ab41b0b3d25be9984fc607';
var sentryIncludeRegex = /\.js$|\.js.map$/;
var sentryFilenameTransform = filename => `~${webPath}${filename}`;

var bundleName = `${productName}-${productVersion}-[name]`;
var entryName = 'main';
var entrySrcPaths = './main/index.js';
var vendorName = 'vendors';
var vendorMinChunks = 1;
var vendorResourceRegexp = /node_modules/;
var outputPath = `dist/${productName}`;
var publicPath = webPath;
var deployPackageAssetMap = npmPackage.publicize;
var globalPackageMap = npmPackage.globalize;
var defineMap = {
  VERSION: JSON.stringify(versionString),
  SENTRY_KEY: JSON.stringify(sentryKey)
};
var srcPaths = ['main', 'src', 'demos'];
var cssPaths = srcPaths;
var sassPaths = false;
var localResolveMap = false;
var indexFilename = '../index.html';
var templatePath = 'templates/index-template.html';
var reactPerf = true;
var reactHot = true;
var sentryUpload = false;
var sentryOptions = {
  baseSentryURL: sentryBaseURL,
  organization: sentryOrganization,
  project: sentryProject,
  apiKey: sentryAuthToken,
  release: versionString,
  include: sentryIncludeRegex,
  filenameTransform: sentryFilenameTransform
};
var reportFilename = '../../bundle-analyzer/report.html';
var concatenateModules = false;
var transformInputsMap = npmPackage.transformize;
var disableBabelPolyfill = false;
var disableBaseBabelPresets = false;
var disableBaseBabelPlugins = false;
var extraBabelPresets = false;
var extraBabelPlugins = false;
var extraBabelDevPresets = false;
var extraBabelDevPlugins = false;
var extraBabelProdPresets = false;
var extraBabelProdPlugins = false;

var port = 8080;
var host = 'http://localhost' + ':' + port;
var keyPath = false;
var certPath = false;
var openBrowser = false;
var templateObject = {
  config: {
    routerBasePath: '/'
  }
};
var localConfigFile = 'local-config.js';

module.exports = {
  localConfigFile,
  build: {
    // REQUIRED
    bundleName, entryName, entrySrcPaths, outputPath, publicPath, srcPaths,
    // OPTIONAL
    vendorName, vendorMinChunks, vendorResourceRegexp,
    deployPackageAssetMap, globalPackageMap, defineMap, cssPaths, sassPaths, localResolveMap, indexFilename,
    templatePath, reactPerf, reactHot, sentryUpload, sentryOptions, reportFilename, concatenateModules, transformInputsMap,
    disableBabelPolyfill, disableBaseBabelPresets, disableBaseBabelPlugins, extraBabelPresets, extraBabelPlugins,
    extraBabelDevPresets, extraBabelDevPlugins, extraBabelProdPresets, extraBabelProdPlugins
  },
  server: {
    // REQUIRED
    productName, host, port,
    // OPTIONAL
    keyPath, certPath, templateObject, openBrowser
  }
};
