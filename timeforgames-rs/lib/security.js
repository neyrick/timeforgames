var jwt = require('jwt-simple');
var entities = require("./entities");
var config = require("../config.json");
var crypto = require("crypto");

var apikeys = {};

var publicResources = ['/tfg/login', '/tfg/expireToken', '/tfg/viewSettingPic', '/tfg/status'];

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

exports.crossDomainHeaders = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', config.http.allowedOrigins);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Authorization,Content-Type');

    next();
};

exports.authParser = function(req, res, next) {
    if (req.method == 'OPTIONS') return next();
    if (req.headers && req.headers.authorization) {
        var tokenMatch = req.headers.authorization.match(/^Bearer (.*)$/);
        if (tokenMatch) {
            try {
                authdata = jwt.decode(tokenMatch[1], config.jwt.secret);
                req.user = authdata.username;
                req.apikey = authdata.apikey;
                req.admin = authdata.admin;
                req.spoof = authdata.spoof;

                if (!isKeyValid(req.user, req.apikey)) {
                    console.log("Clé invalide: " + JSON.stringify(authdata));
                    res.send(403, 'Token expiré');
                    return;
                }
                if (isAdminRestricted(req.url) && (!authdata.admin)) {
                    console.log("Restriction admin pour authdata: " + JSON.stringify(authdata));
                    res.send(403, 'Fonction réservée aux administrateurs');
                    return;
                }
            } catch (error) {
                console.log("Erreur JWT:" + error);
                if (isRestricted(req.url)) {
                    res.send(403, 'Format de token invalide');
                    return;
                }
            }
            return next();
        } else {
            console.log("Token invalide");
            if (isRestricted(req.url)) {
                res.send(403, 'Format de token invalide');
                return;
            }
            else return next();
        }
    } else {
        if (isRestricted(req.url)) {
            res.send(403, 'Token absent');
            return;
        }
        else return next();
    }
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

exports.createToken = function(pm_username, pm_apikey, pm_admin, pm_spoof) {
    return jwt.encode({
        username : pm_username,
        apikey : pm_apikey,
        admin : pm_admin,
        spoof : pm_spoof
    }, config.jwt.secret);
};

exports.initApiKeys = function(rawkeys) {
    apikeys = {};
    rawkeys.forEach(function(rawkey) {
        apikeys[rawkey.key] = rawkey.username;
    });
};
