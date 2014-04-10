var entities = require("./entities");
var mailer = require("./mailer");
var security = require("./security");
var fileSystem = require('fs');
var Busboy = require('busboy');
var path = require('path');
var os = require('os');

var persist = require("persist");

var setting = entities.setting;
var comment = entities.comment;
var game = entities.game;
var schedule = entities.schedule;
var history = entities.history;
var playerData = entities.player;

var connection;

persist.connect(function(err, conn) {
    connection = conn;
    loadAPIKeys();
});

var blankImage = {};

var blankImagePath = path.join(__dirname, 'no_image.gif');
var blankImageStat = fileSystem.statSync(blankImagePath);
fileSystem.readFile(blankImagePath, function(error, content) {
    blankImage.content = content;
    blankImage.size = blankImageStat.size;
    blankImage.type = 'image/gif';
});

function loadAPIKeys() {
    entities.apikey.all(connection, function(err, result) {
        if (err) {
            console.log("Erreur: " + err);
        }
        else {
            security.initApiKeys(result);
        }
    });
}

function assignGame(idgame, masterschedule, players, callback) {
    var updateStatement = 'UPDATE schedule SET game = ? WHERE id IN ( ?';
    var params = [idgame, masterschedule];
    for (name in players) {
        updateStatement = updateStatement + ', ?';
        params.push(players[name].id);
    }
    updateStatement = updateStatement + ')';
    connection.runSql(updateStatement, params, callback);
}

function storelog(logdata) {
    
    var logclone = JSON.parse( JSON.stringify(logdata) );
    if (logclone.data) delete logclone.data.password;
    new history(logclone).save(connection, function(err) {
        if (err)
            console.log("Error: " + err);
    });
//    console.log("Logdata: %j", logdata);
/*
    setTimeout(function() {
        mailer.notify(logdata, function(msgData) {
            console.log("Message envoyé à " + msgData.recipient.name + ' (' + msgData.recipient.address + ')');
        }, function(err) {
            console.log(err);
        });
    }, 0);
*/
}

function createBaseLogData(req, source) {
    var result = {
        action : req.query['log_action'],
        address : req.connection.remoteAddress,
        apikey : req.apikey,
        admin : req.spoof,
        tstamp : new Date(),
        player : req.user
    };
    if ( typeof source != "undefined") {
        result.dayid = source.dayid;
        result.timeframe = source.timeframe;
        result.setting = source.setting;
    }
    return result;
}

function fetchCompleteScheduleById(id, callback) {
    var basequery = "SELECT s.id AS id, s.dayid AS dayid, s.timeframe AS timeframe, s.setting AS setting, s.game AS game, s.player AS player, s.role AS role, c.id AS idcomment,  c.message AS comment FROM schedule s LEFT OUTER JOIN comment c USING (dayid, timeframe, setting, player) WHERE s.id = ?";
    connection.runSqlAll(basequery, [id], function(err, result) {
        if (err)
            callback(err, undefined);
        else
            callback(err, result[0]);
    });
}

function fetchCompleteSchedulesByGame(id, callback) {
    var basequery = "SELECT s.id AS id, s.dayid AS dayid, s.timeframe AS timeframe, s.setting AS setting, s.game AS game, s.player AS player, s.role AS role, c.id AS idcomment,  c.message AS comment FROM schedule s LEFT OUTER JOIN comment c USING (dayid, timeframe, setting, player) WHERE s.game = ?";
    connection.runSqlAll(basequery, [id], callback);
}

function genericFetchInterval(req, res, entity) {
    var basequery = '1=1';
    var params = Array();
    if (req.query.player)
        params.push(req.query.player);
    if (req.query.minday)
        params.push(req.query.minday);
    if (req.query.maxday)
        params.push(req.query.maxday);

    var paramindex = 1;
    if (req.query.player) {
        basequery = basequery + ' and player = $' + paramindex;
        paramindex++;
    }
    if (req.query.setting) {
        basequery = basequery + ' and setting = $' + paramindex;
        paramindex++;
    }
    if (req.query.minday) {
        if (req.query.maxday) {
            basequery = basequery + ' and dayid >= $' + paramindex + ' and dayid <= $' + (paramindex + 1);
            paramindex += 2;
        } else {
            basequery = basequery + ' and dayid >= $' + paramindex;
            paramindex++;
        }
    } else if (req.query.maxday) {
        basequery = basequery + ' and dayid <= $' + paramindex;
        paramindex++;
    }
    entity.where(basequery, params).all(connection, function(err, result) {
        if (err)
            console.log("Erreur: " + err);
        res.send(result);
    });
}

function genericSendJson(res, data) {
    res.send(data);
}

function genericCreate(req, res, entity) {
    entity.save(connection, function(err) {
        if (err)
            res.send("Error: " + err);
        else
            genericSendJson(res, entity);
    });
}

function genericUpdate(req, res, entityManager) {
    var item = req.body;
    var itemid = item.id;
    delete item.id;
    entityManager.update(connection, itemid, item, function(err) {
        if (err)
            res.send("Error: " + err);
        else
            res.send("Update OK");
    });
}

function genericDelete(req, res, entity) {
    entity.delete (connection,
    function(err) {
        res.send("Delete OK");
    });
}

exports.init = function(conn) {
    connection = conn;
};

exports.fetchHistory = function(req, res) {
    history.include("setting").where({
        dayid : req.query.dayid,
        timeframe : req.query.timeframe,
        setting : req.query.setting
    }).orderBy('tstamp', persist.Descending).all(connection, function(err, result) {
        genericSendJson(res, result);
    });
};

exports.fetchUserHistory = function(req, res) {
    history.include("setting").where({
        player : req.params.user
    }).orderBy('tstamp', persist.Descending).all(connection, function(err, result) {
        if (err)
            res.send("Erreur: " + err);
        else {
            genericSendJson(res, result);
        }
    });
};

exports.fetchSettingHistory = function(req, res) {
    history.include("setting").where({
        setting : req.params.setting
    }).orderBy('tstamp', persist.Descending).all(connection, function(err, result) {
        if (err) {
            res.send("Erreur: " + err);
        }
        else {
            genericSendJson(res, result);
        }
    });
};

exports.fetchAllSettings = function(req, res) {
    setting.orderBy('name', persist.Ascending).all(connection, function(err, settings) {
        if (err) {
            res.send("Erreur: " + err);
        }
        else {
            res.send(settings);
        }
    });
};

exports.fetchAllUsers = function(req, res) {
    playerData.orderBy('name', persist.Ascending).all(connection, function(err, users) {
        if (err) {
            res.send("Erreur: " + err);
        }
        else {
            res.send(users);
        }
    });
};
/*
exports.findSettingByCode = function(req, res) {
    var result = new Array();
    setting.using(connection).where({
        code : req.params.code
    }).each(function(err, setting) {
        result.push(setting);
    }, function() {
        genericSendJson(res, result);
    });
};
*/
exports.createSchedule = function(req, res) {
    // Verification que le joueur est bien disponible
    var newSchedule = req.body;
    var conflict = false;
    var querySchedule = {
        dayid : newSchedule.dayid,
        timeframe : newSchedule.timeframe,
        player : req.user
    };
    schedule.using(connection).where(querySchedule).each(function(err, sameschedule) {
        if (sameschedule._game != null)
            conflict = true;
    }, function(err) {
        if (conflict) {
            console.log("Conflit détecté !");
        } else {
            var newschedule = new schedule(req.body);
            newschedule.player = req.user;
            genericCreate(req, res, newschedule);
            var logdata = createBaseLogData(req, req.body);
            logdata.data = {
                role : req.body.role
            };
            storelog(logdata);
        }
    });
};

exports.login = function(req, res) {
    playerData.where({ name : req.body.username}).first(connection, function(err, result) {
        if (err) {
            res.send(500, err);
            return;
        }
        if (result == null) {
            res.send(403, req.body.username + '? Connais pas!');
            return;
        }

        var passSum = security.hashPassword(req.body.password);
        if (result.password != passSum) {
            res.send(403, 'Enlève tes moufles et retape ton mot de passe');
            return;
        }

        var apikey = security.createApiKey(req.body.username);
        var secToken;
        var adminname;
        var guitype;
        if (result.isadmin) {
            secToken = security.createToken(req.body.username, apikey, true);
            adminname = req.body.username;
            guitype = 'admin';
        }
        else {
            secToken = security.createToken(req.body.username, apikey, false);
            adminname = null;
            guitype = 'regular';
        }
        var keyEntity;
        if (typeof req.apikey != "undefined") {
            entities.apikey.where('key = ? and username = ?', [req.apikey, req.body.username]).updateAll(connection, { key : apikey}, function(err) {
                if (err) {
                    res.send(500, err);
                    return;
                }
                security.clearApiKey(req.apikey);
                res.send({ id : 0, token : secToken, gui : guitype});
                return;
            });
        }
        else {
            var newkey = new entities.apikey({ username : req.body.username, key : apikey, admin : adminname}).save(connection, function(err) {
                if (err) {
                    res.send(500, err);
                    return;
                }
                res.send({ id : 0, token : secToken, gui : guitype});
                return;
            });
        }
    });
};

exports.spoofLogin = function(req, res) {
    
    var apikey = security.createApiKey(req.params.user);
    var secToken = security.createToken(req.params.user, apikey, false, req.user);
    new entities.apikey({ username : req.params.user, key : apikey, admin : req.user}).save(connection, function(err) {
        if (err) {
            res.send(500, err);
            return;
        }
        entities.apikey.where({ username : req.user, key : req.apikey}).deleteAll(connection, function(err) {
            if (err) {
                res.send(500, err);
                return;
            }
            security.clearApiKey(req.user, req.apikey);
            res.send({ token : secToken, gui : 'regular'});
        });        
    });
};


exports.relogin = function(req, res) {
    
    var apikey = security.createApiKey(req.user);
    entities.apikey.where({ username : req.user, key : req.apikey}).updateAll(connection, { key: apikey }, function(err) {
        if (err) {
            res.send(500, err);
            return;
        }
        var guitype;
        if (req.admin) {
            guitype = 'admin';
        }
        else {
            guitype = 'regular';
        }
        security.clearApiKey(req.apikey);
        res.send({ username : req.user, token : security.createToken(req.user, apikey, req.admin, req.spoof), gui : guitype});
    });
};

exports.getStatus = function(req, res) {
    res.send({ admin : req.admin });
};

exports.expireToken = function(req, res) {
    
    entities.apikey.where({ username : req.user, key : req.apikey}).deleteAll(connection, function(err) {
        if (err) {
            res.send(500, err);
            return;
        }
        security.clearApiKey(req.apikey);
        res.send("OK");
    });
};

exports.expireAllTokens = function(req, res) {
    var targetuser = req.user;
    if (req.admin && req.params.user) targetuser = req.params.user;
    entities.apikey.where({ username : targetuser}).deleteAll(connection, function(err) {
        if (err) {
            res.send(500, err);
            return;
        }
        security.clearAllApiKeys(targetuser);
        res.send("OK");
    });
};

exports.deleteSchedule = function(req, res) {
    fetchCompleteScheduleById(req.params.idschedule, function(err, targetschedule) {
        if (err) {
            res.send(500, err);
            return;
        }
        else if (req.user != targetschedule.player) {
            res.send(403, "Erreur: Pas touche !");
            return;
        }
        else {
            var logdata = createBaseLogData(req, targetschedule);
            logdata.data = {
                role : targetschedule.role
            };
            if (targetschedule.game > 0) {
                fetchCompleteSchedulesByGame(targetschedule.game, function(err, players) {
                    if (err)
                        res.send("Erreur: " + err);
                    else {
                        logdata.data.players = players;
                        new schedule({
                            id : req.params.idschedule
                        }).delete (connection,
                        function(err) {
                            if (err)
                                res.send("Erreur: " + err);
                            else {
                                storelog(logdata);
                                res.send("OK");
                            }
                        });
                    }
                });
            } else {
                new schedule({
                    id : req.params.idschedule
                }).delete (connection,
                function(err) {
                    if (err)
                        res.send("Erreur: " + err);
                    else {
                        storelog(logdata);
                        res.send("OK");
                    }
                });
            }
        }
    });
};

exports.fetchSchedule = function(req, res) {
    genericFetchInterval(req, res, schedule);
};

exports.fetchComment = function(req, res) {
    genericFetchInterval(req, res, comment);
};

exports.setComment = function(req, res) {
    var comm;
    var logdata = createBaseLogData(req, req.body);
    logdata.data = {
        message : req.body.message
    };
    if ((req.body.id != null) && (req.body.id > 0)) {
        comm = new comment({
            id : req.body.id,
            message : req.body.message
        });
        if ((comm.message == null) || (comm.message == '')) {
            storelog(logdata);
            genericDelete(req, res, comm);
        } else {
            storelog(logdata);
            genericUpdate(req, res, comment);
        }
    } else {
        comm = new comment(req.body);
        if ((comm.message != null) && (comm.message != '')) {
            storelog(logdata);
            genericCreate(req, res, new comment(req.body));
        }
    }
};

exports.fetchGame = function(req, res) {
    genericFetchInterval(req, res, game);
};

exports.fetchPlanning = function(req, res) {
    var basequery = "SELECT s.id AS idschedule, COALESCE(s.dayid, c.dayid) AS dayid, COALESCE(s.timeframe, c.timeframe) AS timeframe, COALESCE(s.setting, c.setting) AS setting, s.game , COALESCE(s.player, c.player) AS player, s.role, c.id AS idcomment,  c.message FROM schedule s FULL OUTER JOIN comment c USING (dayid, timeframe, setting, player) WHERE ((s.dayid >= $1) OR (c.dayid >= $1)) AND ((s.dayid <= $2) OR (c.dayid <= $2))";

    var minday = req.query.minday;
    if ( typeof minday == "undefined")
        minday = 0;
    var maxday = req.query.maxday;
    if ( typeof maxday == "undefined")
        maxday = 99999999;
    //	var basequery = 'dayid >= $1 and dayid <= $2';
    var params = [minday, maxday];

    var paramindex = 3;
    if (req.query.timeframe) {
        basequery = basequery + ' AND ((s.timeframe = $' + paramindex + ') OR ( c.timeframe = $' + paramindex + '))';
        paramindex++;
        params.push(req.query.timeframe);
    }

    if (req.query.setting) {
        basequery = basequery + ' AND ((s.setting = $' + paramindex + ') OR ( c.setting = $' + paramindex + '))';
        paramindex++;
        params.push(req.query.setting);
    }

    if (req.query.player) {
        basequery = basequery + ' AND ((s.player = $' + paramindex + ') OR ( c.player = $' + paramindex + '))';
        paramindex++;
        params.push(req.query.player);
    }

    connection.runSqlAll(basequery, params, function(err, results) {
        if (err)
            console.log("Erreur: " + err);
        res.send(results);
    });
};

exports.createGame = function(req, res) {
    fetchCompleteScheduleById(req.body.masterschedule, function(err, masterschedule) {
        if (err)
            res.send("Erreur: " + err);
        else if (req.user != masterschedule.player) {
            res.send("Erreur: Pas touche !");
        }
        else {
            var newgame = new game({
                masterschedule : req.body.masterschedule
            });
            newgame.save(connection, function(err) {
                if (err)
                    res.send("Error: " + err);
                else {
                    var nametab = Object.keys(req.body.players);
                    assignGame(newgame.id, newgame.masterschedule, req.body.players, function(err) {
                        if (err)
                            res.send("Erreur: " + err);
                        else {
                            var logdata = createBaseLogData(req, masterschedule);
                            logdata.data = {
                                gm : masterschedule,
                                players : req.body.players
                            };
                            res.send("OK");
                            storelog(logdata);
                        }
                    });
                }
            });
        }
    });
};

exports.reformGame = function(req, res) {
    fetchCompleteSchedulesByGame(req.params.idgame, function(err, oldplayers) {
        if (err)
            res.send("Erreur: " + err);
        else {
            var dumpedplayers = {};
            var keptplayers = {};
            var newplayers = {};
            var masterschedule;
            for (var i = 0; i < oldplayers.length; i++) {
                if (oldplayers[i].role == 'GM') {
                    masterschedule = oldplayers.splice(i, 1)[0];
        		    if (req.user != masterschedule.player) {
        		        res.send(403, "Erreur: Pas touche !");
                        return;
        		    }
                }
            }
            var playercopy;
            for (var i = 0; i < oldplayers.length; i++) {
                playercopy = {
                    player : oldplayers[i].player,
                    id : oldplayers[i].id
                };
                if ( typeof req.body.players[oldplayers[i].player] == "undefined")
                    dumpedplayers[oldplayers[i].player] = playercopy;
                else
                    keptplayers[oldplayers[i].player] = playercopy;
            }

            for (name in req.body.players) {
                if ( typeof keptplayers[name] == "undefined")
                    newplayers[name] = req.body.players[name];
            }

            var nametab = Object.keys(req.body.players);
            assignGame(null, -1, dumpedplayers, function(err) {
                if (err)
                    res.send("Erreur: " + err);
                else {
                    assignGame(req.params.idgame, -1, newplayers, function(err) {
                        if (err)
                            res.send("Erreur: " + err);
                        else {
                            var logdata = createBaseLogData(req, masterschedule);
                            logdata.data = {
                                gm : masterschedule,
                                dumped : dumpedplayers,
                                kept : keptplayers,
                                added : newplayers
                            };
                            res.send("OK");
                            storelog(logdata);
                        }
                    });
                }
            });
        }
    });
};

exports.fetchUpdates = function(req, res) {
    var basequery = "SELECT dayid, timeframe, setting, EXTRACT(EPOCH FROM MAX(tstamp)) AS update FROM history h  WHERE (h.dayid >= $1) AND (h.dayid <= $2)";

    var minday = req.query.minday;
    if ( typeof minday == "undefined")
        minday = 0;
    var maxday = req.query.maxday;
    if ( typeof maxday == "undefined")
        maxday = 99999999;
    var params = [minday, maxday];

    var paramindex = 3;
    if (req.query.timeframe) {
        basequery = basequery + ' AND (h.timeframe = $' + paramindex + ')';
        paramindex++;
        params.push(req.query.timeframe);
    }

    if (req.query.setting) {
        basequery = basequery + ' AND (h.setting = $' + paramindex + ')';
        paramindex++;
        params.push(req.query.setting);
    }

    if (req.query.user) {
        basequery = basequery + ' AND (h.player != $' + paramindex + ')';
        paramindex++;
        params.push(req.query.user);
    }

    basequery = basequery + ' GROUP BY dayid, timeframe, setting';

    connection.runSqlAll(basequery, params, function(err, results) {
        if (err)
            console.log("Erreur: " + err);
        res.send(results);
    });
};

exports.deleteSetting = function(req, res) {
    var pm_setting = new setting({
            id : req.params.id
        }).delete(connection,  function(err) {
        if (err) {
            res.send(500, err);
            return;
        }
        var logdata = createBaseLogData(req);
        logdata.data = { id : req.params.id, name : req.query.name };
        logdata.action = "DEL_SETTING";
        storelog(logdata);            
        res.send("Delete OK");
    });
};

exports.deleteUser = function(req, res) {
    playerData.getById(connection, req.params.id, function(err, user) {
        if (err) {
            res.send(500, err);
            return;
        }
        if (user == null) {
            res.send(500, 'Utilisateur inconnu');
            return;
        }
        security.clearAllApiKeys(user.name);
        connection.chain([
                history.where({ player : user.name}).deleteAll,
                comment.where({ player : user.name}).deleteAll,
                schedule.where({ player : user.name}).deleteAll,
                playerData.where({ name : user.name}).deleteAll,
            ], function(err, results) {
                if (err)
                    res.send("Error: " + err);
                else {
                    var logdata = createBaseLogData(req);
                    logdata.action = "DEL_PLAYER";
                    logdata.data = req.params.name;
                    storelog(logdata);            
                    res.send("Delete OK");
                }
            });
    });  
};

exports.createSetting = function(req, res) {
    var newsetting = req.body.setting;
    var savedSetting = new setting(req.body.setting);
    savedSetting.save(connection, function(err) {
        if (err) {
            res.send(500, err);
            return;
        }
        var logdata = createBaseLogData(req);
        logdata.data = req.body.setting;
        logdata.setting = savedSetting.id;
        logdata.action = 'ADMIN_CREATE_SETTING';
        storelog(logdata);            
        res.send(savedSetting);
    });        
};

exports.updateSetting = function(req, res) {
    var newsetting = req.body.setting;
    var setting_id = req.params.settingid;
    setting.update(connection, setting_id, newsetting, function(err) {
        if (err) {
            res.send(500, err);
            return;
        }
        var logdata = createBaseLogData(req);
        logdata.data = req.body.setting;
        logdata.setting = setting_id;
        logdata.action = 'ADMIN_EDIT_SETTING';
        storelog(logdata);            
        newsetting.id = setting_id;
        res.send(newsetting);
    });
};

exports.createUser = function(req, res) {
    var newuser = req.body.user;
    playerData.where({ name : newuser.name}).first(connection, function(err, result) {
        if (err) {
            res.send(500, err);
            return;
        }

        if (result != null) {
            res.send(500, 'L\'utilisateur ' + newuser.name + ' existe déjà');
            return;
        }

        var savedPlayer = new playerData(newuser);
        if (!newuser.password) {
            var newpass = security.genPassword();            
            savedPlayer.password = security.hashPassword(newpass);
        }
        else {
            savedPlayer.password = security.hashPassword(newuser.password);
            delete newuser.password;
        }
        savedPlayer.save(connection, function(err) {
            if (err) {
                res.send(500, err);
                return;
            }
            newuser.id = savedPlayer.id;
            var logdata = createBaseLogData(req);
            logdata.data = newuser;
            logdata.action = 'ADMIN_CREATE_USER';
            storelog(logdata);            

            logdata = createBaseLogData(req);
            logdata.action = 'RES_PW';
            logdata.data = { player : savedPlayer.name, password : newpass };
            storelog(logdata);            

            res.send(newuser);
        });
    });               
};

exports.updateUser = function(req, res) {
    var newuser = req.body.user;
    var user_id = req.params.id;
    playerData.where({ id : user_id}).first(connection, function(err, result) {
        if (err) {
            res.send(500, err);
            return;
        }

        if (result == null) {
            res.send(500, 'Utilisateur ' + user_id + ' introuvable');
            return;
        }

        var oldname = result.name;
        playerData.update(connection, user_id, newuser, function(err) {
            if (err) {
                res.send(500, err);
                return;
            }
            var logdata = createBaseLogData(req);
            logdata.action = 'ADMIN_EDIT_USER';
            logdata.data = req.body.user;
            if (oldname != newuser.name) {
                security.clearAllApiKeys(oldname);
                var replaceParams = [ newuser.name, oldname];
                connection.chain([
                    persist.runSql("UPDATE apikey SET username = $1 where username = $2", replaceParams),
                    persist.runSql("UPDATE comment SET player = $1 where player = $2", replaceParams),
                    persist.runSql("UPDATE schedule SET player = $1 where player = $2", replaceParams)
                ], function(err, results) {
                    if (err) {
                        res.send(500, err);
                        return;
                    }
                    storelog(logdata);   
                    res.send(newuser);
                });
            }
            else {
                storelog(logdata);   
                res.send(newuser);
            }
        });
    });    
};

function resetUserPassword(req, res, targetuser) {
    var newpass = security.genPassword();
    var hashpass = security.hashPassword(newpass);
    
    playerData.where({ name : targetuser}).first(connection, function(err, result) {
            if (err) {
                res.send(500, err);
                return;
            }

            if (result == null) {
                res.send(500, 'Utilisateur introuvable');
                return;
            }

            playerData.update(connection, result.id, { password : hashpass }, function(err) {
                if (err) {
                    res.send(500, err);
                    return;
                }
                
                security.clearAllApiKeys(targetuser);
                var logdata = createBaseLogData(req);
                logdata.action = 'RES_PW';
                logdata.data = { player : targetuser, password : newpass };
                storelog(logdata);            
                res.send("Reset PW OK");
            });
    });        
};

exports.resetPassword = function(req, res) {
    return resetUserPassword(req, res, req.user);
};

exports.adminResetPassword = function(req, res) {
    return resetUserPassword(req, res, req.params.user);
};

exports.fetchPlayerData = function(players, callback) {
    var basequery = "SELECT * FROM player WHERE name IN ('" + players.join("','") + "')";
    connection.runSqlAll(basequery, [], callback);
};

exports.getSettingPicture = function(req, res) {
    connection.runSqlAll("SELECT * FROM settingpics WHERE id = ?", [ req.params.settingid], function(err, pics) {
        if (err) {
            res.send(500, err);
            return;
        }
        if ((pics == null) || (pics.length == 0)) {

            res.type(blankImage.type);
            res.send(blankImage.content);
            return;
        }
        if (pics.length > 1) {
            res.send(500, 'Plusieurs images, les données sont en vrac !');
            return;
        }
        var pic = pics[0];
        var lastViewedHeader = req.header('If-Modified-Since');
        if (typeof lastViewedHeader != "undefined") {
            // Added 999 because milliseconds are stripped from the timestamp
            // sent as a header
            var lastViewed = new Date(lastViewedHeader).getTime() + 999; 
            var lastUpdate = pic.tstamp.getTime();
            if (lastViewed >= lastUpdate) {
                res.send(304, 'Non modifée');
                return;
            }
        }
        
        res.set({
          'Content-Type': pic.mimetype,
          'Last-Modified': pic.tstamp,
          'Expires': -1,
          'Cache-Control': 'must-revalidate, private'
        });
        
        res.send(pic.image);
    });
};

exports.storeSettingPicture = function(req, res) {
      var busboy = new Busboy({ headers: req.headers , files : 1, fileSize: 1024000});
      var error = 'Aucune image transmise';
      busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
          if (mimetype.indexOf('image') != 0) {
              error = 'Avec une image c\'est mieux!';
          }
          else if (file.truncated) {
              error = 'Le fichier est trop gros ! (1 Mo max)';
          }
          else {
              console.log("Fichier valide");
              error = '';
              var saveTo = path.join(os.tmpDir(), path.basename(fieldname));
              var tmpStream = fileSystem.createWriteStream(saveTo);
              tmpStream.on('finish', function() {
                  console.log("Fichier sauvegardé");
                  fileSystem.readFile(saveTo, 'hex', function(err, imgData) {
                      console.log("Fichier parsé");
                    fileSystem.unlinkSync(saveTo);
                    if (err) {
                        res.send(500, err);
                        return;
                    }
                    imgData = '\\x' + imgData;
                    connection.runSql("DELETE FROM settingpics WHERE id = ?", [ req.params.settingid], function(err, result) {
                        if (err) {
                            res.send(500, err);
                            return;
                        }
                        connection.runSql("INSERT INTO settingpics (id, mimetype, image) values (?, ?, ?)",
                                           [req.params.settingid, mimetype,  imgData],
                                           function(err, writeResult) {
                            if (err) {
                                res.send(500, err);
                                return;
                            }
                          res.send("Store Setting Picture ok");
                        });
                    });
                  });
                  
              });
              file.pipe(tmpStream);
          }        
      });
      busboy.on('filesLimit', function() {
          console.log('Tentative d\'upload de plusieurs fichiers !');
      });
      busboy.on('finish', function() {
          if (error != '') {
              res.set('Connection', 'close');
              res.send(500, error);
          }
      });
      req.pipe(busboy);
};

exports.deleteSettingPicture = function(req, res) {
    connection.runSql("DELETE FROM settingpics WHERE id = ?", [ req.params.settingid], function(err, result) {
        if (err) {
            res.send(500, err);
            return;
        }
        res.send("Delete Setting Picture ok");
    });
};

