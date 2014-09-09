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

function sendMail(maildata) {
    setTimeout(function() {
        mailer.notify(maildata, function(msgData) {
            console.log("Message envoyé à " + msgData.recipient.name + ' (' + msgData.recipient.address + ')');
        }, function(err) {
            console.log(err);
        });
    }, 0);
}

function filterNotifications(player, notifications) {
    var result = [];
    notifications.forEach(function(notification) {
        if (notification.player != player) result.push(notification);
    });
    return result;
}

exports.notifyNewSchedules = function(req, res) {
    services.fetchSettingsHash(function(settings) {
        services.fetchNewStuff(function(newstuff) {
            var notifications = {};
            var newgames;
            var newlog;
            var newnotif;            
            for (settingid in newstuff) {
                if (typeof settings[settingid] == "undefined") continue;
                newgames = [];
                newlog = [];
                newstuff[settingid].games.forEach(function(row) {
                    newgames.push({ player : row.player, date : parseDayId(row.dayid), timeframe : timeframeNames[row.timeframe] });
                });
                newstuff[settingid].all.forEach(function(row) {
                    newlog.push({ player : row.player, date : parseDayId(row.dayid), timeframe : timeframeNames[row.timeframe], action : row.action, data : row.data });
                });
                newnotif = {games: newgames, log : newlog };
                notifications[settingid] = newnotif;
            }
            services.fetchWatches(function(watchlist) {
                var maildata;
                var notifslist;
                var hasNewStuff;
var debugobj = {};
                watchlist.forEach(function (player) {
                    maildata = { settings : [] };
                    maildata.player = player.name;
                    hasNewStuff = false;
                    player.watches.forEach(function(watchitem) {                      
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
                    
                    debugobj[player.name] = maildata;
//                  if (hasNewStuff) {
//                        sendMail(maildata);
//                    }
                });
                res.send(debugobj);
            }, function(error) {
                    res.send(500, "Error: " + err);
            });
        }, function(error) {
                res.send(500, "Error: " + err);
        });
    }, function(error) {
            res.send(500, "Error: " + err);
    });
};
