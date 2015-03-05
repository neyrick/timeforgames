var services = require("./services");
var mailer = require("./mailer");

function parseDayId(dayid) {
    var strdayid = '' + dayid;
    return strdayid.substr(6, 2) + '/' + strdayid.substr(4, 2) + '/' + strdayid.substr(0, 4);
}

var timeframeNames = {
    AFTERNOON : "après-midi",
    EVENING : "soir"
};

function filterNotifications(player, notifications) {
    var result = [];
    notifications.forEach(function(notification) {
        if (notification.player != player) result.push(notification);
    });
    return result;
}

exports.notifyNewSchedules = function() {
    services.fetchSettingsHash(function(settings) {
        services.fetchNewStuff(function(newstuff) {
            var notifications = {};
            var newgames;
            var newlog;
            var newnotif;
            for (settingid in settings) {
                notifications[settingid] = { games: [], log : [] };
            }
            for (settingid in newstuff) {
                if (typeof settings[settingid] == "undefined") {
                    continue;
                }
                newstuff[settingid].games.forEach(function(row) {
                    notifications[settingid].games.push({ player : row.player, date : parseDayId(row.dayid), timeframe : timeframeNames[row.timeframe] });
                });
                newstuff[settingid].all.forEach(function(row) {
                    notifications[settingid].log.push({ player : row.player, date : parseDayId(row.dayid), timeframe : timeframeNames[row.timeframe], action : row.action, data : row.data });
                });
            }
            services.fetchWatches(function(watchlist) {
                var maildata;
                var notifslist;
                var hasNewStuff;
                var emails = [];
//var debugobj = {};
                watchlist.forEach(function (player) {
                    maildata = { action : "REPORT", settings : [] };
                    maildata.player = player.name;
                    hasNewStuff = false;
                    player.watches.forEach(function(watchitem) {                      
                        if (typeof settings[watchitem.setting] == "undefined") return;
                        if (watchitem.level == 1) {
                            notifslist = filterNotifications(player.name, notifications[watchitem.setting].games);
                        }
                        else if (watchitem.level == 2) {
                            notifslist = filterNotifications(player.name, notifications[watchitem.setting].log);
                        }
                        if (notifslist.length > 0) {
                            hasNewStuff = true;
                            maildata.settings.push({ level : watchitem.level, name : settings[watchitem.setting].name, updates: notifslist});
                        }
                    });
                    
//                    debugobj[player.name] = maildata;
                  if (hasNewStuff) {
                        emails.push(maildata);
                    }
                });

                mailer.notifyBatch("REPORT", emails, function(err) {
                    console.log("Erreur du batch de notifications: " + err);
                });
                
//                console.log(JSON.stringify(debugobj));
            }, function(error) {
                    console.log("Erreur lors de l'obtention des watches: " + error);
            });
        }, function(error) {
                console.log("Erreur lors de l'obtention des updates: " + error);
        });
    }, function(error) {
            console.log("Erreur lors de l'obtention des settings: " + error);
    });
};
