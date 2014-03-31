var entities = require("./entities");
var mailer = require("./mailer");
var security = require("./security");


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
    delete logclone.data.password;
    new history(logclone).save(connection, function(err) {
        if (err)
            console.log("Error: " + err);
    });
//    console.log("Logdata: %j", logdata);
    setTimeout(function() {
        mailer.notify(logdata, function(msgData) {
            console.log("Message envoyé à " + msgData.recipient.name + ' (' + msgData.recipient.address + ')');
        }, function(err) {
            console.log(err);
        });
    }, 0);
}

function createBaseLogData(req, source) {
    var result = {
        action : req.params['log_action'],
        address : req.connection.remoteAddress,
        apikey : req.apikey,
        admin : req.admin
    };
    if ( typeof source != "undefined") {
        result.dayid = source.dayid;
        result.tstamp = new Date();
        result.timeframe = source.timeframe;
        result.setting = source.setting;
        result.player = req.user;
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

function genericFetchInterval(req, res, next, entity) {
    var basequery = '1=1';
    var params = Array();
    if (req.params.player)
        params.push(req.params.player);
    if (req.params.minday)
        params.push(req.params.minday);
    if (req.params.maxday)
        params.push(req.params.maxday);

    var paramindex = 1;
    if (req.params.player) {
        basequery = basequery + ' and player = $' + paramindex;
        paramindex++;
    }
    if (req.params.setting) {
        basequery = basequery + ' and setting = $' + paramindex;
        paramindex++;
    }
    if (req.params.minday) {
        if (req.params.maxday) {
            basequery = basequery + ' and dayid >= $' + paramindex + ' and dayid <= $' + (paramindex + 1);
            paramindex += 2;
        } else {
            basequery = basequery + ' and dayid >= $' + paramindex;
            paramindex++;
        }
    } else if (req.params.maxday) {
        basequery = basequery + ' and dayid <= $' + paramindex;
        paramindex++;
    }
    entity.where(basequery, params).all(connection, function(err, result) {
        if (err)
            console.log("Erreur: " + err);
        res.send(result);
        next();
    });
}

function genericSendJson(res, data) {
    res.charSet('UTF-8');
    res.send(data);
}

function genericCreate(req, res, next, entity) {
    entity.save(connection, function(err) {
        if (err)
            res.send("Error: " + err);
        else
            genericSendJson(res, entity);
        next();
    });
}

function genericUpdate(req, res, next, entityManager) {
    var item = req.body;
    var itemid = item.id;
    delete item.id;
    entityManager.update(connection, itemid, item, function(err) {
        if (err)
            res.send("Error: " + err);
        else
            res.send("Update OK");
        next();
    });
}

function genericDelete(req, res, next, entity) {
    entity.delete (connection,
    function(err) {
        res.send("Delete OK");
        next();
    });
}

exports.init = function(conn) {
    connection = conn;
};

exports.fetchHistory = function(req, res, next) {
    history.where({
        dayid : req.params.dayid,
        timeframe : req.params.timeframe,
        setting : req.params.setting
    }).orderBy('tstamp', persist.Descending).all(connection, function(err, result) {
        genericSendJson(res, result);
        next();
    });
};

exports.fetchAllSettings = function(req, res, next) {
    setting.orderBy('name', persist.Ascending).all(connection, function(err, settings) {
        if (err)
            res.send("Erreur: " + err);
        else {
            res.send(settings);
        }
        next();
    });
};

exports.findSettingByCode = function(req, res, next) {
    var result = new Array();
    setting.using(connection).where({
        code : req.params.code
    }).each(function(err, setting) {
        result.push(setting);
    }, function() {
        genericSendJson(res, result);
        next();
    });
};

exports.createSetting = function(req, res, next) {
    genericCreate(req, res, next, new setting(req.body));
};

exports.createSchedule = function(req, res, next) {
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
            genericCreate(req, res, next, newschedule);
            var logdata = createBaseLogData(req, req.body);
            logdata.data = {
                role : req.body.role
            };
            storelog(logdata);
        }
        next();
    });
};

exports.login = function(req, res, next) {
    playerData.where({ name : req.body.username}).first(connection, function(err, result) {
        if (err) {
            res.send("Erreur: " + err);
            next();
        }
        else {
            if (result == null) {
                res.send({ id : -1, error : req.body.username + '? Connais pas!'});
                next();
            }
            else {
                var passSum = security.hashPassword(req.body.password);
                if (result.password != passSum) {
                    res.send({ id : -1, error : 'Enlève tes moufles et retape ton mot de passe'});
                    next();
                }
                else {
                    var apikey = security.createApiKey();
                    security.updateApiKey(req.body.username, apikey, req.apikey);
                    var keyEntity;
                    if (typeof req.apikey != "undefined") {
                        entities.apikey.where('key = ? and username = ?', [req.apikey, req.body.username]).updateAll(connection, { key : apikey}, function(err) {
                            if (err) {
                                console.log("Error: " + err);
                            }
                            else {
                                res.send({ id : 0, token : security.createToken(req.body.username, apikey)});
                            }
                            next();
                        });
                    }
                    else {
                        var newkey = new entities.apikey({ username : req.body.username, key : apikey}).save(connection, function(err) {
                            if (err) {
                                console.log("Error: " + err);
                            }
                            else {
                                res.send({ id : 0, token : security.createToken(req.body.username, apikey)});
                            }
                            next();
                        });
                    }
                }
            }
        }
    });
};



exports.relogin = function(req, res, next) {
    
    var apikey = security.createApiKey();
    entities.apikey.where({ username : req.user, key : req.apikey}).updateAll(connection, { key: apikey }, function(err) {
        if (err) {
            console.log("Error: " + err);
            res.send("Erreur: " + err);
        }
        else {
            security.updateApiKey(req.user, apikey, req.apikey);
            res.send({ username : req.user, token : security.createToken(req.user, apikey)});
        }
        next();
    });
};

exports.expireToken = function(req, res, next) {
    entities.apikey.where({ username : req.user, key : req.apikey}).deleteAll(connection, function(err) {
        if (err) {
            console.log("Error: " + err);
            res.send("Erreur: " + err);
        }
        else {
            security.clearApiKey(req.user, req.apikey);
            res.send("OK");
        }
        next();
    });
};

exports.expireAllTokens = function(req, res, next) {
    var targetuser = req.user;
    if (req.admin) targetuser = req.params.user;
    entities.apikey.where({ username : targetuser}).deleteAll(connection, function(err) {
        if (err) {
            console.log("Error: " + err);
            res.send("Erreur: " + err);
        }
        else {
            security.clearAllApiKeys(targetuser);
            res.send("OK");
        }
        next();
    });
};

exports.deleteSchedule = function(req, res, next) {
    fetchCompleteScheduleById(req.params.idschedule, function(err, targetschedule) {
        if (err)
            res.send("Erreur: " + err);
        else if (req.user != targetschedule.player) {
            res.send("Erreur: Pas touche !");
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
        next();
    });
};

exports.fetchSchedule = function(req, res, next) {
    genericFetchInterval(req, res, next, schedule);
};

exports.fetchComment = function(req, res, next) {
    genericFetchInterval(req, res, next, comment);
};

exports.setComment = function(req, res, next) {
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
            genericDelete(req, res, next, comm);
        } else {
            storelog(logdata);
            genericUpdate(req, res, next, comment);
        }
    } else {
        comm = new comment(req.body);
        if ((comm.message == null) || (comm.message == '')) {
            next();
        } else {
            storelog(logdata);
            genericCreate(req, res, next, new comment(req.body));
        }
    }
};

exports.fetchGame = function(req, res, next) {
    genericFetchInterval(req, res, next, game);
};

exports.fetchPlanning = function(req, res, next) {
    var basequery = "SELECT s.id AS idschedule, COALESCE(s.dayid, c.dayid) AS dayid, COALESCE(s.timeframe, c.timeframe) AS timeframe, COALESCE(s.setting, c.setting) AS setting, s.game , COALESCE(s.player, c.player) AS player, s.role, c.id AS idcomment,  c.message FROM schedule s FULL OUTER JOIN comment c USING (dayid, timeframe, setting, player) WHERE ((s.dayid >= $1) OR (c.dayid >= $1)) AND ((s.dayid <= $2) OR (c.dayid <= $2))";

    var minday = req.params.minday;
    if ( typeof minday == "undefined")
        minday = 0;
    var maxday = req.params.maxday;
    if ( typeof maxday == "undefined")
        maxday = 99999999;
    //	var basequery = 'dayid >= $1 and dayid <= $2';
    var params = [minday, maxday];

    var paramindex = 3;
    if (req.params.timeframe) {
        basequery = basequery + ' AND ((s.timeframe = $' + paramindex + ') OR ( c.timeframe = $' + paramindex + '))';
        paramindex++;
        params.push(req.params.timeframe);
    }

    if (req.params.setting) {
        basequery = basequery + ' AND ((s.setting = $' + paramindex + ') OR ( c.setting = $' + paramindex + '))';
        paramindex++;
        params.push(req.params.setting);
    }

    if (req.params.player) {
        basequery = basequery + ' AND ((s.player = $' + paramindex + ') OR ( c.player = $' + paramindex + '))';
        paramindex++;
        params.push(req.params.player);
    }

    connection.runSqlAll(basequery, params, function(err, results) {
        if (err)
            console.log("Erreur: " + err);
        res.send(results);
        next();
    });
};

exports.createGame = function(req, res, next) {
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
    next();
};

exports.reformGame = function(req, res, next) {
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
		        res.send("Erreur: Pas touche !");
                        next();
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
    next();
};

exports.fetchUpdates = function(req, res, next) {
    var basequery = "SELECT dayid, timeframe, setting, EXTRACT(EPOCH FROM MAX(tstamp)) AS update FROM history h  WHERE (h.dayid >= $1) AND (h.dayid <= $2)";

    var minday = req.params.minday;
    if ( typeof minday == "undefined")
        minday = 0;
    var maxday = req.params.maxday;
    if ( typeof maxday == "undefined")
        maxday = 99999999;
    var params = [minday, maxday];

    var paramindex = 3;
    if (req.params.timeframe) {
        basequery = basequery + ' AND (h.timeframe = $' + paramindex + ')';
        paramindex++;
        params.push(req.params.timeframe);
    }

    if (req.params.setting) {
        basequery = basequery + ' AND (h.setting = $' + paramindex + ')';
        paramindex++;
        params.push(req.params.setting);
    }

    if (req.params.user) {
        basequery = basequery + ' AND (h.player != $' + paramindex + ')';
        paramindex++;
        params.push(req.params.user);
    }

    basequery = basequery + ' GROUP BY dayid, timeframe, setting';

    connection.runSqlAll(basequery, params, function(err, results) {
        if (err)
            console.log("Erreur: " + err);
        res.send(results);
        next();
    });
};

exports.fetchSettingById = function(id, callback) {
    setting.getById(connection, id, callback);
};

exports.deleteSetting = function(req, res, next) {
    var pm_setting = new setting({
            id : req.params.id
        }).delete(connection,  function(err) {
        if (err)
            res.send("Error: " + err);
        else {
            var logdata = createBaseLogData(req, masterschedule);
            logdata.data = req.params.id;
            logdata.action = "DEL_SETTING";
            storelog(logdata);            
            res.send("Delete OK");
        }
        next();
    });
};

exports.deletePlayer = function(req, res, next) {
    security.clearAllApiKeys(req.params.name);
    connection.chain([
            history.where({ player : req.params.name}).deleteAll,
            comment.where({ player : req.params.name}).deleteAll,
            schedule.where({ player : req.params.name}).deleteAll,
            playerData.where({ name : req.params.name}).deleteAll,
        ], function(err, results) {
            if (err)
                res.send("Error: " + err);
            else {
                var logdata = createBaseLogData(req, masterschedule);
                logdata.action = "DEL_PLAYER";
                logdata.data = req.params.name;
                storelog(logdata);            
                res.send("Delete OK");
            }
            next();
        });
};

exports.editSetting = function(req, res, next) {
    var newsetting = req.body.setting;
    var setting_id = newsetting.id;
    delete newsetting.id;
    setting.update(connection, setting_id, newsetting, function(err) {
        if (err)
            res.send("Error: " + err);
        else {
            var logdata = createBaseLogData(req, masterschedule);
            logdata.data = req.body.setting;
            storelog(logdata);            
            res.send("Edit OK");
        }
        next();
    });
};

exports.editUser = function(req, res, next) {
    var newuser = req.body.user;
    var user_id = newuser.id;
    delete newuser.id;
    playerData.where({ id : user_id}).first(connection, function(err, result) {
            if (err) {
                res.send("Erreur: " + err);
                next();
            }
            else {
                if (result == null) {
                    res.send('Utilisateur introuvable');
                    next();
                }
                else {
                    var oldname = result.name;
                    playerData.update(connection, user_id, newuser, function(err) {
                        if (err) {
                            res.send("Error: " + err);
                            next();
                        }
                        else if (oldname != newuser.name) {
                            security.clearAllApiKeys(oldname);
                            connection.chain([
                                    apikey.where({ player : oldname}).updateAll({ player : newuser.name}),
                                    history.where({ player : oldname}).updateAll({ player : newuser.name}),
                                    comment.where({ player : oldname}).updateAll({ player : newuser.name}),
                                    schedule.where({ player : oldname}).updateAll({ player : newuser.name}),
                                ], function(err, results) {
                                var logdata = createBaseLogData(req);
                                logdata.data = req.body.user;
                                storelog(logdata);            
                                res.send("Edit OK");
                                next();
                            });
                        }
                        else {
                            res.send("Edit OK");
                            next();
                        }
                    });
                }
            }
    });    
};

exports.resetPassword = function(req, res, next) {
    var targetuser = req.user;
    if (req.admin) targetuser = req.params.user;
    var newpass = security.genPassword();
    var hashpass = security.hashPassword(newpass);
    
    playerData.where({ name : req.params.name}).first(connection, function(err, result) {
            if (err) {
                res.send("Erreur: " + err);
                next();
            }
            else {
                if (result == null) {
                    res.send('Utilisateur introuvable');
                    next();
                }
                else {
                    var oldname = result.name;
                    playerData.update(connection, result.id, { password : hashpass }, function(err) {
                        if (err) {
                            res.send("Error: " + err);
                            next();
                        }
                        else {
                            security.clearAllApiKeys(req.params.name);
                            var logdata = createBaseLogData(req);
                            logdata.action = 'RES_PW';
                            logdata.data.player = targetuser;
                            logdata.data.password = newpass;
                            storelog(logdata);            
                            res.send("Reset PW OK");
                            next();
                        }
                    });
                }
            }
    });        
};
/*
exports.fetchPlayerData = function(players, callback) {
    var basequery = "SELECT * FROM player WHERE name IN ('" + players.join("','") + "')";
    connection.runSqlAll(basequery, [], callback);
};
*/
