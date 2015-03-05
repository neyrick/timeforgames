var path = require('path'), templatesDir = path.join(__dirname, '..', 'templates'), emailTemplates = require('email-templates'), services = require("./services"), nodemailer = require('nodemailer'), config = require("../config.json"), partsPath = path.join(templatesDir, 'parts');

var ejs = require('ejs');
ejs.open = '{{';
ejs.close = '}}';

var timeframeNames = {
    AFTERNOON : "après-midi",
    EVENING : "soir"
};

var appFrom = 'Rêves et Légendes <blabla@prout.com>';

var transport = nodemailer.createTransport("SMTP", config.smtp);

function parseDayId(dayid) {
    var strdayid = '' + dayid;
    return strdayid.substr(6, 2) + '/' + strdayid.substr(4, 2) + '/' + strdayid.substr(0, 4);
}

var templateFactory;

emailTemplates(templatesDir, {
    open : '{{',
    close : '}}'
}, function(err, template) {
    if (err)
        console.log(err);
    else
        templateFactory = template;
});

function buildGenericMailData(templatename, dest, mailsubject, settingname, dayid, tf, gmschedule, playersArray, actorname, game) {
    return {
        template : templatename,
        recipient : {
            name : dest
        },
        subject : mailsubject,
        setting : settingname,
        date : parseDayId(dayid),
        timeframe : timeframeNames[tf],
        gm : gmschedule,
        players : playersArray,
        actor : actorname,
        game : game
    };
}

var msgBuilders = {
    "REPORT" : function(eventData) {
        return [{
            template : 'report',
            recipient : {
                name : eventData.player
            },
            subject : 'Rapport du planificateur de parties',
            settings : eventData.settings
        }];
    },
    "RES_PW" : function(eventData) {
        return [{
            template : 'res_pw',
            recipient : {
                name : eventData.data.player
            },
            subject : 'Initialisation du mot de passe',
            password : eventData.data.password
        }];
    },
    "SET_PW" : function(eventData) {
        return [{
            template : 'set_pw',
            recipient : {
                name : eventData.data.player
            },
            subject : 'Modification du mot de passe'
        }];
    },
    "RES_PW_SEC" : function(eventData) {
        return [{
            template : 'res_pw_sec',
            recipient : {
                name : eventData.username
            },
            subject : "Demande d'initialisation du mot de passe",
            action : eventData
        }];
    },
    "ADD_GAME" : function(eventData) {
        var player, results = [], playersTab = [];
        for (playername in eventData.data.players) {
            player = eventData.data.players[playername];
            playersTab.push(player);
            results.push(buildGenericMailData('add_game', player.player, 'Validation d\'une partie de ' + eventData.setting.name, eventData.setting.name, eventData.dayid, eventData.timeframe, eventData.data.gm, playersTab, eventData.player, eventData.data.game));
        }
        results.push(buildGenericMailData('add_game', eventData.player, 'Validation d\'une partie de ' + eventData.setting.name, eventData.setting.name, eventData.dayid, eventData.timeframe, eventData.data.gm, playersTab, eventData.player, eventData.data.game));
        return results;
    },
    "RFM_GAME" : function(eventData) {
        var player, results = [], players = {
            dumped : [],
            kept : [],
            added : []
        };
        for (playername in eventData.data.dumped) {
            players.dumped.push(eventData.data.dumped[playername]);
            results.push(buildGenericMailData('rfm_game', eventData.data.dumped[playername].player, 'Modification de la composition d\'une partie de ' + eventData.setting.name, eventData.setting.name, eventData.dayid, eventData.timeframe, eventData.data.gm, players, eventData.player, eventData.data.game));
        }
        for (playername in eventData.data.kept) {
            players.kept.push(eventData.data.kept[playername]);
            results.push(buildGenericMailData('rfm_game', eventData.data.kept[playername].player, 'Modification de la composition d\'une partie de ' + eventData.setting.name, eventData.setting.name, eventData.dayid, eventData.timeframe, eventData.data.gm, players, eventData.player, eventData.data.game));
        }
        for (playername in eventData.data.added) {
            players.added.push(eventData.data.added[playername]);
            results.push(buildGenericMailData('rfm_game', eventData.data.added[playername].player, 'Modification de la composition d\'une partie de ' + eventData.setting.name, eventData.setting.name, eventData.dayid, eventData.timeframe, eventData.data.gm, players, eventData.player, eventData.data.game));
        }
        results.push(buildGenericMailData('rfm_game', eventData.data.gm.player, 'Modification de la composition d\'une partie de ' + eventData.setting.name, eventData.setting.name, eventData.dayid, eventData.timeframe, eventData.data.gm, players, eventData.player, eventData.data.game));
        return results;
    },
    "DRP_GAME" : function(eventData) {
        var gm, results = [], playersTab = [];
        eventData.data.players.some(function(player) {
            if (player.role == 'GM') {
                gm = player;
            } else {
                playersTab.push(player);
            }
        });
        eventData.data.players.forEach(function(player) {
            results.push(buildGenericMailData('drp_game', player.player, 'Un joueur s\'est retiré d\'une partie de ' + eventData.setting.name, eventData.setting.name, eventData.dayid, eventData.timeframe, gm, playersTab, eventData.player));
        });
        return results;
    },
    "DEL_GAME" : function(eventData) {
        var gm, results = [], playersTab = [];
        eventData.data.players.some(function(player) {
            if (player.role == 'GM') {
                gm = player;
            } else {
                playersTab.push(player);
            }
        });
        eventData.data.players.forEach(function(player) {
            results.push(buildGenericMailData('del_game', player.player, 'Annulation d\'une partie de ' + eventData.setting.name, eventData.setting.name, eventData.dayid, eventData.timeframe, gm, playersTab, eventData.player));
        });
        return results;
    }
    /*,
     "SET_COMMENT": function(eventData) {
     return [{
     template: 'set_comment',
     recipient: { name : '', address : '' },
     subject: '',
     }];
     },
     */
};

function processRichMessages(builder, eventData, msgHandler) {

    var msgDataArray = builder(eventData);
    var recipients = [];
    msgDataArray.forEach(function(msgData) {
        recipients.push(msgData.recipient.name);
    });

    services.fetchPlayerData(recipients, function(err, players) {
        if (err) {
            console.log("Impossible de trouver les infos sur " + recipients);
            return;
        }
        var emails = {};
        players.forEach(function(player) {
            emails[player.name] = player.email;
        });

        msgDataArray.forEach(function(msgData) {
            msgData.recipient.address = emails[msgData.recipient.name];
            msgHandler(msgData);
        });

    });
}

function processMessages(builder, eventData, msgHandler) {

    var idsetting = eventData.setting;

    if (idsetting) {
        services.retrieveSettingById(idsetting, function(setting) {
            eventData.setting = setting;
            processRichMessages(builder, eventData, msgHandler);
        }, function(error) {
            console.log("Impossible d'identifier la chronique " + eventData.setting);
            return;
        });
    } else {
        processRichMessages(builder, eventData, msgHandler);
    }

}

exports.notify = function(eventData, successCallback, errorCallback) {

    var builder, action = eventData['action'];
    if ( typeof action == "undefined") {
        errorCallback("Action non définie");
        return;
    }
    builder = msgBuilders[action];

    // Pas de message pour cette action
    if ( typeof builder == "undefined")
        return;

    processMessages(builder, eventData, function(msgData) {

        templateFactory(msgData.template, msgData, function(err, html, text) {
            if (err) {
                errorCallback(err);
            } else {
                if (( typeof msgData.recipient.address == "undefined") || (msgData.recipient.address == null)) {
                    return;
                }
                transport.sendMail({
                    from : appFrom,
                    to : msgData.recipient.address,
                    subject : msgData.subject,
                    html : html,
                    text : text,
                    attachments : [{
                        filePath : partsPath + '/rel-header.png',
                        cid : 'logo@reves-et-legendes.fr'
                    }]
                }, function(err, response) {
                    if (err) {
                        errorCallback(err.message);
                    } else {
                        successCallback(msgData);
                    }
                });
            }
        });
    }, errorCallback);
};

exports.notifyBatch = function(action, batchData, successCallback, errorCallback) {

    var builder;
    if ( typeof action == "undefined") {
        errorCallback("Action non définie");
        return;
    }
    builder = msgBuilders[action];

    // Pas de message pour cette action
    if ( typeof builder == "undefined")
        return;

    var Render = function(msgData) {
      this.msgData = msgData;
      this.send = function(err, html, text) {
        if (err) {
          console.log("Erreur d'envoi: " + err);
        } else {
          if (( typeof msgData.recipient.address == "undefined") || (msgData.recipient.address == null)) {
              return;
          }
          transport.sendMail({
            from : appFrom,
            to : msgData.recipient.address,
            subject : msgData.subject,
            html : html,
            text : text,
            attachments : [{
                filePath : partsPath + '/rel-header.png',
                cid : 'logo@reves-et-legendes.fr'
            }]
          }, function(err, responseStatus) {
            if (err) {
              console.log(err);
            } else {
              console.log(responseStatus.message);
            }
          });
        }
      };

      this.batch = function(batch) {
           batch(this.msgData, templatesDir, this.send);
        
      };

    };

    services.fetchUsersHash(function(users) {

        services.fetchSettingsHash(function(settings) {

            templateFactory(action.toLowerCase(), true, function(err, batch) {

                batchData.forEach(function(eventData) {
                    var idsetting = batchData.setting;
  
                    if (idsetting) {
                        eventData.setting = settings[idsetting];
                    }
                    var msgDataArray = builder(eventData);

                    msgDataArray.forEach(function(msgData) {
                        msgData.recipient.address = users[msgData.recipient.name].email;
                        var render = new Render(msgData);
                        render.batch(batch);
                    });

                });
            });
        }, errorCallback); 

    }, errorCallback);

};
