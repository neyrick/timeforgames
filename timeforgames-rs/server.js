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

server.get('/tfg/status', serv.getStatus);
server.get('/tfg/relogin', serv.relogin);
server.get('/tfg/expireToken', serv.expireToken);
server.get('/tfg/resetPassword', serv.resetPassword);
server.post('/tfg/login', serv.login);

server.get('/tfg/setting', serv.fetchAllSettings);
server.put('/tfg/setting', serv.storeSetting);
server.get('/tfg/viewSettingPic/:settingid', serv.getSettingPicture);
server.put('/tfg/setting/pic/:settingid', serv.storeSettingPicture);

server.put('/tfg/schedule', serv.createSchedule);
server.del('/tfg/schedule/:idschedule', serv.deleteSchedule);

server.post('/tfg/comment', serv.setComment);

server.put('/tfg/game', serv.createGame);


server.post('/tfg/game/:idgame', serv.reformGame);

server.get('/tfg/planning', serv.fetchPlanning);

server.get('/tfg/updates', serv.fetchUpdates);

server.get('/tfg/history', serv.fetchHistory);
server.get('/tfg/history/user/:user', serv.fetchUserHistory);
server.get('/tfg/history/setting/:setting', serv.fetchSettingHistory);

server.del('/tfg/admin/setting/:id', serv.deleteSetting);

server.get('/tfg/admin/user', serv.fetchAllUsers);
server.put('/tfg/admin/user', serv.storeUser);
server.del('/tfg/admin/user/:name', serv.deleteUser);
server.get('/tfg/admin/resetPassword/:user', serv.adminResetPassword);

server.get('/tfg/admin/spoof/:user', serv.spoofLogin);

server.del('/tfg/admin/setting/pic/:settingid', serv.deleteSettingPicture);

server.listen(5000, function() {
    console.log('Démarrage de l\'écoute de', server.name, server.url);
});
