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
server.use(bodyparser());
server.use(compression());
server.use(responsetime());

server.use(express.static('gui'));

server.use(security.authParser);

// Methodes en acces libre
server.post('/api/login', serv.login);
server.get('/api/status', serv.getStatus);
server.get('/api/expireToken', serv.expireToken);
server.get('/api/setting/pic/:settingid', serv.getSettingPicture);

// Methodes necessitant un compte standard

server.get('/api/relogin', security.requireLoggedIn, serv.relogin);
server.get('/api/resetPassword', security.requireLoggedIn, serv.resetPassword);

server.get('/api/setting', security.requireLoggedIn, serv.fetchAllSettings);
server.post('/api/setting', security.requireLoggedIn, serv.createSetting);
server.put('/api/setting/pic/:settingid', security.requireLoggedIn, serv.storeSettingPicture);

server.put('/api/schedule', security.requireLoggedIn, serv.createSchedule);
server.del('/api/schedule/:idschedule', security.requireLoggedIn, serv.deleteSchedule);

server.post('/api/comment', security.requireLoggedIn, serv.setComment);

server.put('/api/game', security.requireLoggedIn, serv.createGame);


server.post('/api/game/:idgame', security.requireLoggedIn, serv.reformGame);

server.get('/api/planning', security.requireLoggedIn, serv.fetchPlanning);

server.get('/api/updates', security.requireLoggedIn, serv.fetchUpdates);

server.get('/api/history', security.requireLoggedIn, serv.fetchHistory);
server.get('/api/history/user/:user', security.requireLoggedIn, serv.fetchUserHistory);
server.get('/api/history/setting/:setting', security.requireLoggedIn, serv.fetchSettingHistory);

// Methodes necessitant un compte admin


server.del('/api/setting/:id', security.requireAdmin, serv.deleteSetting);

server.get('/api/user', security.requireAdmin, serv.fetchAllUsers);
server.post('/api/user', security.requireAdmin, serv.createUser);
server.put('/api/user/:id', security.requireAdmin, serv.updateUser);
server.del('/api/user/:id', security.requireAdmin, serv.deleteUser);
server.get('/api/resetPassword/:user', security.requireAdmin, serv.adminResetPassword);

server.put('/api/setting/:settingid', security.requireAdmin, serv.updateSetting);

server.get('/api/spoof/:user', security.requireAdmin, serv.spoofLogin);

server.del('/api/setting/pic/:settingid', security.requireAdmin, serv.deleteSettingPicture);

server.listen(5000, function() {
    console.log('Démarrage de l\'écoute');
});
