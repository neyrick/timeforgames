var services = require("./services");
var config = require("../config.json");
var ldap = require('ldapjs');
var ldapserver = ldap.createServer();

function authorize(req, res, next) {
  if ((typeof req.connection.ldap.bindDN == "undefined") || (req.connection.ldap.bindDN == ""))
    return next(new ldap.InsufficientAccessRightsError());

  return next();
}

ldapserver.bind(config.ldap.basedn, function (req, res, next) {
    var username = req.dn.toString(),
        password = req.credentials;
        username = username.replace(/cn=([^,]+),.*/, "$1");
    console.log("Authentification:'" + username + "' / '" + password + "'");

    services.fastlogin(username, password, function() {
        res.end();
        return next();
    }, function(error) {
        return next(new ldap.InvalidCredentialsError(error));
    });

  });

ldapserver.search("", authorize, function(req, res, next) {
    console.log("RECHERCHE ROOT");
    var rootDSE = {
        dn : "",
        attributes : {
            namingcontexts : config.ldap.basedn,
            supportedldapversion : [ 2, 3 ],
            subschemasubentry : "cn=schema"
        }         
    };
    res.send(rootDSE);
    res.end();
});

ldapserver.search(config.ldap.basedn, authorize, function(req, res, next) {
    var binddn = req.connection.ldap.bindDN.toString();
    var rawuser, curruser;

    services.fetchAllUsersRaw(function (result) {
      for (var i = 0; i < result.length; i++) {
        rawuser = result[i];
        curruser = {
          dn: "cn=" + rawuser.name + ", " + config.ldap.basedn,
          attributes: {
            objectclass: [ "top", "person" ],
            cn: rawuser.name,
            mail: rawuser.email,
          }
        };
        if (req.filter.matches(curruser.attributes))
          res.send(curruser);
      }
      res.end();
    }, function (err) {
        return next(new ldap.UnavailableError(err));
    });
  });
ldapserver.listen(config.ldap.port, function() {
    console.log("Serveur LDAP en ecoute sur %s", ldapserver.url);
});


