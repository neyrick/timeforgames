var serv = require("./lib/services");
var security = require("./lib/security");

var express = require('express');
var bodyparser = require('body-parser');
var compression = require('compression');
var responsetime = require('response-time');
var config = require("./config.json");

var server = express();
server.enable('trust proxy');

function indexHandler(req, res, next) {
    if (req.url == "/") {
        res.redirect("/gui/index.html");
    }
    else {
        next();
    }
}

server.use(security.crossDomainHeaders);
server.use(indexHandler);
server.use(bodyparser());
server.use(compression());

server.use('/api', security.authParser);
server.use('/gui', express.static('gui'));


// Methodes en acces libre
server.post('/api/login', serv.login);
server.get('/api/status', serv.getStatus);
server.get('/api/expireToken', serv.expireToken);
server.get('/api/setting/pic/:settingid', serv.getSettingPicture);

// Methodes necessitant un compte standard

server.get('/api/admins', security.requireLoggedIn, serv.fetchAdminList);
server.get('/api/relogin', security.requireLoggedIn, serv.relogin);
server.get('/api/resetPassword', security.requireLoggedIn, serv.resetPassword);

server.get('/api/setting', security.requireLoggedIn, serv.fetchAllSettings);
server.post('/api/setting', security.requireLoggedIn, serv.createSetting);
server.put('/api/setting/pic/:settingid', security.requireLoggedIn, serv.storeSettingPicture);

server.post('/api/schedule', security.requireLoggedIn, serv.createSchedule);
server.del('/api/schedule/:idschedule', security.requireLoggedIn, serv.deleteSchedule);

server.get('/api/comment', security.requireLoggedIn, serv.fetchComments);
server.post('/api/comment', security.requireLoggedIn, serv.createComment);
server.put('/api/comment/:idcomment', security.requireLoggedIn, serv.setComment);

server.post('/api/game', security.requireLoggedIn, serv.createGame);
server.put('/api/game/:idgame', security.requireLoggedIn, serv.reformGame);

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
