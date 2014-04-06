var jwt = require('jwt-simple');
var entities = require("./entities");
var config = require("../config.json");
var crypto = require("crypto");
var restify = require('restify');

var apikeys = {};

var publicResources = ['/tfg/login', '/tfg/expireToken', '/tfg/viewSettingPic'];

function isRestricted(url) {
    return !publicResources.some(function (item) {
        return (url.indexOf(item) == 0);
    });
}

function isAdminRestricted(url) {
    return (url.indexOf('/tfg/admin') == 0);
}

function isKeyValid(username, key) {
    var registered = apikeys[key];
    if ( typeof registered == "undefined")
        return false;
    if (registered !== username)
        return false;
    return true;
}

exports.genPassword = function() {
        return Math.random().toString(36).slice(-8);
};

exports.hashPassword = function (password) {
    return crypto.createHash('sha1').update(password).digest().toString('hex');
};

exports.authParser = function(req, res, next) {
    if (req.headers && req.headers.authorization) {
        var tokenMatch = req.headers.authorization.match(/^Bearer (.*)$/);
        if (tokenMatch) {
            try {
                authdata = jwt.decode(tokenMatch[1], config.jwt.secret);
                req.user = authdata.username;
                req.apikey = authdata.apikey;
                req.admin = authdata.admin;

                if (!isKeyValid(req.user, req.apikey)) {
                    console.log("Clé invalide: " + JSON.stringify(authdata));
                    return next(new restify.NotAuthorizedError('Token expiré'));
                }
                if (isAdminRestricted(req.url) && (typeof authdata.admin == "undefined")) {
                    console.log("Restriction admin pour authdata: " + JSON.stringify(authdata));
                    return next(new restify.NotAuthorizedError('Fonction réservée aux administrateurs'));
                }
            } catch (error) {
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

exports.createApiKey = function(username) {
    var newkey = crypto.randomBytes(20).toString('hex');
    apikeys[newkey] = username;
    return newkey;
};

exports.updateApiKey = function(username, newkey, oldkey) {
    if ( typeof oldkey != "undefined")
        delete apikeys[oldkey];
    apikeys[newkey] = username;
};

exports.clearApiKey = function(key) {
    delete apikeys[key];
};

exports.clearAllApiKeys = function(username) {
    var todelete = [];
    for (key in apikeys) {
        if (apikeys[key] == username) todelete.push(key);
    }
    todelete.forEach(function(key) {
        delete apikeys[key];
    });  
};

exports.createToken = function(pm_username, pm_apikey, pm_admin) {
    console.log('Creation d\'un token avec admin: ' + pm_admin);
    return jwt.encode({
        username : pm_username,
        apikey : pm_apikey,
        admin : pm_admin
    }, config.jwt.secret);
};

exports.initApiKeys = function(rawkeys) {
    apikeys = {};
    rawkeys.forEach(function(rawkey) {
        apikeys[rawkey.key] = rawkey.username;
    });
};
