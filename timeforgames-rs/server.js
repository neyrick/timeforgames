var serv = require("./lib/services");
var security = require("./lib/security");

//var restify = require('restify');
var express = require('express');
var bodyparser = require('body-parser');
var compression = require('compression');
var responsetime = require('response-time');
var config = require("./config.json");

/*
restify.CORS.ALLOW_HEADERS.push('authorization');

function formatPicture(req, res, body) {
     console.log('Formatteur pic pour ' + req.url);
     return body;
}


var server = restify.createServer({
    formatters: {
        'image/gif': formatPicture,
        'image/jpeg': formatPicture,
        'image/png': formatPicture,
    }
});
*/
//var server = restify.createServer();
var server = express();
//console.log("Acceptable: " + server.acceptable);
/*
server.use(restify.acceptParser(server.acceptable));
server.use(restify.authorizationParser());
server.use(restify.dateParser());
server.use(restify.queryParser());
server.use(restify.jsonp());
server.use(restify.gzipResponse());
server.use(restify.bodyParser());
server.use(security.authParser);
server.use( restify.CORS( {origins: config.http.allowedOrigins}) );
server.use( restify.fullResponse() );
*/
server.use(security.crossDomainHeaders);
server.use(security.authParser);
server.use(bodyparser());
server.use(compression());
server.use(responsetime());

// Methodes en acces libre
server.post('/tfg/login', serv.login);
server.get('/tfg/status', serv.getStatus);
server.get('/tfg/expireToken', serv.expireToken);
server.get('/tfg/setting/pic/:settingid', serv.getSettingPicture);

// Methodes necessitant un compte standard

server.get('/tfg/relogin', security.requireLoggedIn, serv.relogin);
server.get('/tfg/resetPassword', security.requireLoggedIn, serv.resetPassword);

server.get('/tfg/setting', security.requireLoggedIn, serv.fetchAllSettings);
server.post('/tfg/setting', security.requireLoggedIn, serv.createSetting);
server.put('/tfg/setting/pic/:settingid', security.requireLoggedIn, serv.storeSettingPicture);

server.put('/tfg/schedule', security.requireLoggedIn, serv.createSchedule);
server.del('/tfg/schedule/:idschedule', security.requireLoggedIn, serv.deleteSchedule);

server.post('/tfg/comment', security.requireLoggedIn, serv.setComment);

server.put('/tfg/game', security.requireLoggedIn, serv.createGame);


server.post('/tfg/game/:idgame', security.requireLoggedIn, serv.reformGame);

server.get('/tfg/planning', security.requireLoggedIn, serv.fetchPlanning);

server.get('/tfg/updates', security.requireLoggedIn, serv.fetchUpdates);

server.get('/tfg/history', security.requireLoggedIn, serv.fetchHistory);
server.get('/tfg/history/user/:user', security.requireLoggedIn, serv.fetchUserHistory);
server.get('/tfg/history/setting/:setting', security.requireLoggedIn, serv.fetchSettingHistory);

// Methodes necessitant un compte admin


server.del('/tfg/setting/:id', security.requireAdmin, serv.deleteSetting);

server.get('/tfg/user', security.requireAdmin, serv.fetchAllUsers);
server.post('/tfg/user', security.requireAdmin, serv.createUser);
server.put('/tfg/user/:id', security.requireAdmin, serv.updateUser);
server.del('/tfg/user/:id', security.requireAdmin, serv.deleteUser);
server.get('/tfg/resetPassword/:user', security.requireAdmin, serv.adminResetPassword);

server.put('/tfg/setting/:settingid', security.requireAdmin, serv.updateSetting);

server.get('/tfg/spoof/:user', security.requireAdmin, serv.spoofLogin);

server.del('/tfg/setting/pic/:settingid', security.requireAdmin, serv.deleteSettingPicture);

server.listen(5000, function() {
    console.log('Démarrage de l\'écoute');
});
