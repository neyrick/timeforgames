var serv = require("./lib/services");
var security = require("./lib/security");

var restify = require('restify');
var config = require("./config.json");

restify.CORS.ALLOW_HEADERS.push('authorization');

var server = restify.createServer();
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

server.get('/tfg/relogin', serv.relogin);
server.get('/tfg/expireToken', serv.expireToken);
server.get('/tfg/resetPassword', serv.resetPassword);
server.get('/tfg/expireAllTokens/:user', serv.expireToken);
server.post('/tfg/login', serv.login);

server.get('/tfg/setting', serv.fetchAllSettings);
server.get('/tfg/setting/:code', serv.findSettingByCode);
server.put('/tfg/setting', serv.storeSetting);

server.get('/tfg/schedule', serv.fetchSchedule);
server.get('/tfg/schedule/:player', serv.fetchSchedule);
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

server.listen(5000, function() {
    console.log('Démarrage de l\'écoute de', server.name, server.url);
});
