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

function buildGenericMailData(templatename, dest, mailsubject, settingname, dayid, tf, gmschedule, playersArray, actorname) {
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
        actor : actorname
    };
}

var msgBuilders = {
    "RES_PW" : function(eventData) {
        return { template : 'res_pw', recipient : { name : eventData.data.player }, subject : 'Initialisation du mot de passe', password : eventData.data.password };
    },
    "ADD_GAME" : function(eventData) {
        var player, results = [], playersTab = [];
        for (playername in eventData.data.players) {
            player = eventData.data.players[playername];
            playersTab.push(player);
            results.push(buildGenericMailData('add_game', player.player, 'Validation d\'une partie de ' + eventData.setting.name, eventData.setting.name, eventData.dayid, eventData.timeframe, eventData.data.gm, playersTab, eventData.player));
        }
        results.push(buildGenericMailData('add_game', eventData.player, 'Validation d\'une partie de ' + eventData.setting.name, eventData.setting.name, eventData.dayid, eventData.timeframe, eventData.data.gm, playersTab, eventData.player));
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
            results.push(buildGenericMailData('rfm_game', eventData.data.dumped[playername].player, 'Modification de la composition d\'une partie de ' + eventData.setting.name, eventData.setting.name, eventData.dayid, eventData.timeframe, eventData.data.gm, players, eventData.player));
        }
        for (playername in eventData.data.kept) {
            players.kept.push(eventData.data.kept[playername]);
            results.push(buildGenericMailData('rfm_game', eventData.data.kept[playername].player, 'Modification de la composition d\'une partie de ' + eventData.setting.name, eventData.setting.name, eventData.dayid, eventData.timeframe, eventData.data.gm, players, eventData.player));
        }
        for (playername in eventData.data.added) {
            players.added.push(eventData.data.added[playername]);
            results.push(buildGenericMailData('rfm_game', eventData.data.added[playername].player, 'Modification de la composition d\'une partie de ' + eventData.setting.name, eventData.setting.name, eventData.dayid, eventData.timeframe, eventData.data.gm, players, eventData.player));
        }
        results.push(buildGenericMailData('rfm_game', eventData.data.gm.player, 'Modification de la composition d\'une partie de ' + eventData.setting.name, eventData.setting.name, eventData.dayid, eventData.timeframe, eventData.data.gm, players, eventData.player));
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

function processMessages(builder, eventData, msgHandler) {

    var idsetting = eventData.setting;

    services.fetchSettingById(eventData.setting, function(err, setting) {
        if (err) {
            console.log("Impossible d'identifier la chronique " + eventData.setting);
            return;
        }
        eventData.setting = setting;
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
                ;
                msgHandler(msgData);
            });

        });

    });

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
                if ( typeof msgData.recipient.address == "undefined") {
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
