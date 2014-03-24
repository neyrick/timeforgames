var jwt = require('jwt-simple');
var entities = require("./entities");
var config = require("../config.json");
var crypto = require("crypto");
var restify = require('restify');

var apikeys = {};

var publicResources = [ '/tfg/login', '/tfg/expireToken'];

function isRestricted(url) {
    return (publicResources.indexOf(url) == -1);
}

function isKeyValid(username, key) {
    var registered = apikeys[key];
    if (typeof registered == "undefined") return false;
    if (registered !== username) return false;
    return true;
}

exports.authParser = function(req, res, next) {
    if (req.headers && req.headers.authorization) {
      var tokenMatch = req.headers.authorization.match(/^Bearer (.*)$/);
      if (tokenMatch) {
         try {
          authdata = jwt.decode(tokenMatch[1], config.jwt.secret);
          req.user = authdata.username;
          req.apikey = authdata.apikey;

          if (!isKeyValid(req.user, req.apikey)) {
            return next(new restify.NotAuthorizedError('Token expiré'));              
          }
         }
         catch (error) {
    	    console.log("Erreur JWT:" + error);
	    if (isRestricted(req.url)) {
	      return next(new restify.NotAuthorizedError('Format de token invalide'));              
	    }
         }

      } else {
          console.log("Token invalide");
          if (isRestricted(req.url)) {
            return next(new restify.NotAuthorizedError('Format de token invalide'));              
          }
      }
    } else {
          if (isRestricted(req.url)) {
              return next(new restify.NotAuthorizedError('Token absent'));
          }
    }
    next();
};

exports.createApiKey = function () {
    return crypto.randomBytes(20).toString('hex');
};

exports.updateApiKey = function (username, newkey, oldkey) {
    if (typeof oldkey != "undefined") delete apikeys[oldkey];
    apikeys[newkey] = username;
};

exports.clearApiKey = function (username, key) {
     delete apikeys[key];
};

exports.createToken = function (pm_username, pm_apikey) {
    return jwt.encode( { username : pm_username, apikey : pm_apikey }, config.jwt.secret);
};

exports.initApiKeys = function(rawkeys) {
    apikeys = {};
    rawkeys.forEach(function(rawkey) {
        apikeys[rawkey.key] = rawkey.username;
    });
};
