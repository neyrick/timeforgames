'use strict';

/* Services */

function genericError(error) {
    window.alert("Ouille... ça part en sucette: " + JSON.stringify(error, null, 4));
}

timeForGamesApp.factory('logger', [
function() {

    return {
        log : function() {
        }
    };
}]);

timeForGamesApp.factory('config', ['$window',
function($window) {

    return {
        urlbase : $window.location.protocol.concat("//").concat($window.location.hostname).concat(":5000/tfg"),
        FIRST_DAY_OF_WEEK : 1
    };
}]);

timeForGamesApp.factory('userService', ['$http', 'config',
function($http, config) {

    return {

        checkUsername : function(username, callback) {
            $http.get(config.urlbase + '/usercheck/' + username).success(function(data, status) {
                callback(data);
            }).error(function(data, status) {
                window.alert("Impossible de vérifier l'utilisateur: " + data);
            });
        }
    };
}]);

timeForGamesApp.factory('historyService', ['$http', 'config',
function($http, config) {

    return {

        getHistory : function(dayid, timeframe, settingid, callback) {
            $http.get(config.urlbase + '/history?dayid=' + dayid + '&timeframe=' + timeframe + '&setting=' + settingid).success(function(data, status) {
                callback(data);
            }).error(function(data, status) {
                window.alert("Impossible de récupérer l'historique: " + data);
            });
        }
    };
}]);

timeForGamesApp.factory('settingsService', ['$http', 'config',
function($http, config) {

    var settings = {
        ready : false
    }, updateSettings = function(callback, callback2) {
        $http.get(config.urlbase + '/setting').success(callback).error(callback2);
    };

    return {

        getSettings : function(callback) {
            if (!settings.ready) {
                updateSettings(function(result) {
                    settings = result;
                    settings.ready = true;
                    callback(settings);
                }, function(error) {
                    window.alert("Impossible de récupérer les chroniques: " + error);
                });
            } else
                callback(settings);
        },

        createSetting : function(setting, callback) {
            $http.put(config.urlbase + '/setting', setting).success(function(data, status) {
                callback(data);
            }).error(function(data, status) {
                window.alert("Impossible de créer la chronique: " + data);
            });
        }
    };
}]);

timeForGamesApp.factory('planningBuilderService', ['config',
function(config) {

    var timeframeIndex = {
        'AFTERNOON' : 0,
        'EVENING' : 1
    };

    var mergeSetting = function(allSettings, timeframe, settingid) {
        var i, found = -1, currentArray = timeframe.settings;
        for ( i = 0; i < currentArray.length; i++) {
            if (currentArray[i].settingid == settingid)
                return currentArray[i];
        }
        for ( i = 0; i < timeframe.possibleNewSettings.length; i++) {
            if (timeframe.possibleNewSettings[i].id == settingid) {
                found = i;
                break;
            }
        }
        if (found >= 0) {
            timeframe.possibleNewSettings.splice(found, 1);
        };
        for ( i = 0; i < allSettings.length; i++) {
            if (allSettings[i].id == settingid) {
                var settingref = allSettings[i];
                var newsetting = {
                    settingid : settingref.id,
                    code : settingref.code,
                    name : settingref.name,
                    mode : settingref.mode,
                    status : settingref.status,
                    games : [],
                    availableplayers : [],
                    availablegms : [],
                    unavailable : [],
                    mystatus : new tfSettingStatus(),
                    hasgame : false
                };
                currentArray.push(newsetting);
                return newsetting;
            }
        }
        return undefined;
    };

    var addSchedule = function(rawschedule, timeframe, allSettings, me) {
        var g, game;
        var tfSetting = mergeSetting(allSettings, timeframe, rawschedule.setting);
        var newschedule = {
            player : rawschedule.player,
            id : rawschedule.idschedule,
            game : rawschedule.game,
            idcomment : rawschedule.idcomment,
            comment : rawschedule.message
        };
        if (rawschedule.game != null) {
            tfSetting.hasgame = true;
            game = null;
            for ( g = 0; g < tfSetting.games.length; g++) {
                if (tfSetting.games[g].id == rawschedule.game)
                    game = tfSetting.games[g];
            }
            if (game == null) {
                game = {
                    id : rawschedule.game,
                    players : []
                };
                tfSetting.games.push(game);
            }
            if (rawschedule.role == 'GM')
                game.gm = newschedule;
            else if (rawschedule.role == 'PLAYER')
                game.players.push(newschedule);
            timeframe.gaming[rawschedule.player] = rawschedule.setting;
            if (rawschedule.player == me)
                timeframe.mygame = game;
        } else {
            if (rawschedule.role == 'GM')
                tfSetting.availablegms.push(newschedule);
            else if (rawschedule.role == 'PLAYER')
                tfSetting.availableplayers.push(newschedule);
            else
                tfSetting.unavailable.push(newschedule);
        }
        if (rawschedule.player == me) {
            if (rawschedule.role == 'GM') {
                tfSetting.mystatus.dispoMJ = true;
                if (rawschedule.game != null) {
                    tfSetting.mystatus.mj = true;
                    timeframe.busy = true;
                }
            } else if (rawschedule.role == 'PLAYER') {
                tfSetting.mystatus.dispoPJ = true;
                if (rawschedule.game != null) {
                    tfSetting.mystatus.pj = true;
                    timeframe.busy = true;
                }
            }
            if (rawschedule.idcomment != null)
                tfSetting.idcomment = rawschedule.idcomment;
            if (rawschedule.message != null)
                tfSetting.message = rawschedule.message;
        }
    };

    return {
        MS_IN_DAY : 1000 * 60 * 60 * 24,

        dispatchUpdatesFlags : function(updatesHash, weeks, lastVisit) {
            var w, d, t, s, week, day, timeframe, setting, lastUpdate;
            for ( w = 0; w < weeks.length; w++) {
                week = weeks[w];
                for ( d = 0; d < week.days.length; d++) {
                    day = week.days[d];
                    for ( t = 0; t < day.timeframes.length; t++) {
                        timeframe = day.timeframes[t];
                        for ( s = 0; s < timeframe.settings.length; s++) {
                            setting = timeframe.settings[s];
                            lastUpdate = updatesHash[day.id + '-' + timeframe.code + '-' + setting.settingid];
                            if (( typeof lastUpdate != "undefined") && (lastUpdate > lastVisit))
                                setting.newStuff = true;
                        }
                    }
                }
            }
        },

        getDayId : function(daytime) {
            var date = new Date(daytime);
            return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
        },

        initDay : function(daytime, settings) {
            var day = new Date(daytime);
            var result = new Object();
            result.id = this.getDayId(day);
            result.dow = day.getDay();
            result.dom = day.getDate();
            result.month = day.getMonth() + 1;
            result.year = day.getFullYear();
            result.date = day;
            result.timeframes = [{
                code : 'AFTERNOON',
                settings : [],
                busy : false,
                gaming : {},
                possibleNewSettings : []
            }, {
                code : 'EVENING',
                settings : [],
                busy : false,
                gaming : {},
                possibleNewSettings : []
            }];
            settings.forEach(function(setting) {
                if (setting.status == 0) {
                    result.timeframes.forEach(function(timeframe) {
                        timeframe.possibleNewSettings.push(setting);
                    });
                }
            });
            return result;
        },

        getDefaultMinDay : function() {

            var today = new Date();
            var currtime = today.getTime();
            var dow = today.getDay();

            // premier jour de debut anterieur
            var diff = config.FIRST_DAY_OF_WEEK - dow;
            if (dow < config.FIRST_DAY_OF_WEEK)
                diff -= 7;
            currtime += diff * this.MS_IN_DAY;

            return currtime;
        },

        refreshTimeframeInWeeksPlanning : function(settings, schedules, timeframe, me) {
            var i;

            timeframe.busy = false;
            timeframe.gaming = {};
            timeframe.settings.length = 0;
            timeframe.possibleNewSettings.length = 0;
            settings.forEach(function(setting) {
                if (setting.status == 0) {
                    timeframe.possibleNewSettings.push(setting);
                }
            });            
            delete timeframe.mygame;
            for ( i = 0; i < schedules.length; i++) {
                addSchedule(schedules[i], timeframe, settings, me);
            }
            timeframe.settings.sort(function(settinga, settingb) {
                return settinga.name.localeCompare(settingb.name);
            });
        },

        buildWeeksPlanning : function(mindaytime, daycount, settings, schedules, me) {

            // Initialisation des semaines
            var weeks = Array();
            var currtime;
            var maxtime = mindaytime + this.MS_IN_DAY * daycount;
            var currdow = 6;
            var currweek;
            var currday;
            var dayMap = new Object();
            for ( currtime = mindaytime; currtime < maxtime; currtime += this.MS_IN_DAY) {
                currdow++;
                if (currdow > 6) {
                    currdow = 0;
                    currweek = {
                        days : []
                    };
                    weeks.push(currweek);
                }
                currday = this.initDay(currtime, settings);
                currweek.days.push(currday);
                dayMap[currday.id] = currday;
            }

            // ajouter les schedule dans availablepj / available mj

            var i, timeframe, rawschedule;
            var tfSetting;
            for ( i = 0; i < schedules.length; i++) {
                rawschedule = schedules[i];
                timeframe = dayMap[rawschedule.dayid].timeframes[timeframeIndex[rawschedule.timeframe]];
                addSchedule(rawschedule, timeframe, settings, me);
            }
            for (currday in dayMap) {
                dayMap[currday].timeframes.forEach(function(item) {
                    item.settings.sort(function(settinga, settingb) {
                        return settinga.name.localeCompare(settingb.name);
                    });
                });
            }
            // parcourir les comment et les ajouter
            return weeks;
        }
    };
}]);

timeForGamesApp.factory('plannerService', ['$http', 'config', 'planningBuilderService',
function($http, config, planningBuilderService) {

    return {

        getUpdates : function(mindaytime, daycount, user, callback) {
            var minday = planningBuilderService.getDayId(new Date(mindaytime));
            var maxdaytime = mindaytime + daycount * planningBuilderService.MS_IN_DAY;
            var maxday = planningBuilderService.getDayId(new Date(maxdaytime));
            $http.get(config.urlbase + '/updates?minday=' + minday + '&maxday=' + maxday + '&user=' + user).success(function(result) {
                var datesHash = {};
                var updateData;
                for (var i = 0; i < result.length; i++) {
                    updateData = result[i];
                    datesHash[updateData.dayid + '-' + updateData.timeframe + '-' + updateData.setting] = 1000 * updateData.update;
                }
                callback(datesHash);
            }).error(genericError);
        },

        setDispo : function(pm_player, pm_dayid, pm_timeframe, pm_setting, pm_role, callback) {
            var schedule = {
                dayid : pm_dayid,
                timeframe : pm_timeframe,
                player : pm_player,
                role : pm_role,
                setting : pm_setting
            };
            $http.put(config.urlbase + '/schedule?log_action=ADD_DISPO', schedule).success(callback).error(genericError);
        },

        clearDispo : function(idschedule, callback) {
            $http.delete(config.urlbase + '/schedule/' + idschedule + '?log_action=DEL_DISPO').success(callback).error(genericError);
        },

        getTimeframePlanning : function(dayid, timeframecode, callback) {
            $http.get(config.urlbase + '/planning?minday=' + dayid + '&maxday=' + dayid + '&timeframe=' + timeframecode).success(callback).error(genericError);
        },

        getPlanning : function(mindaytime, daycount, callback) {
            var minday = planningBuilderService.getDayId(new Date(mindaytime));
            var maxdaytime = mindaytime + daycount * planningBuilderService.MS_IN_DAY;
            var maxday = planningBuilderService.getDayId(new Date(maxdaytime));
            $http.get(config.urlbase + '/planning?minday=' + minday + '&maxday=' + maxday).success(callback).error(genericError);
        },

        reformGame : function(pm_idgame, pm_newplayers, callback) {
            $http.post(config.urlbase + '/game/' + pm_idgame + '?log_action=RFM_GAME', {
                players : pm_newplayers
            }).success(callback).error(genericError);
        },

        dropGame : function(idschedule, callback) {
            $http.delete(config.urlbase + '/schedule/' + idschedule + '?log_action=DRP_GAME').success(callback).error(genericError);
        },

        disbandGame : function(idschedule, callback) {
            $http.delete(config.urlbase + '/schedule/' + idschedule + '?log_action=DEL_GAME').success(callback).error(genericError);
        },

        validateGame : function(schedule_id, players, callback) {
            var game = {
                masterschedule : schedule_id,
                players : players
            };
            $http.put(config.urlbase + '/game?log_action=ADD_GAME', game).success(callback).error(genericError);
        },

        setComment : function(pm_player, pm_dayid, pm_timeframe, pm_setting, pm_idcomment, pm_message, callback) {
            var comment;
            var action;

            if (( typeof pm_message == "undefined") || (pm_message == '')) {
                action = 'DEL_COMMENT';
            } else {
                action = 'SET_COMMENT';
            }
            if (pm_idcomment != null)
                comment = {
                    id : pm_idcomment,
                    player : pm_player,
                    dayid : pm_dayid,
                    timeframe : pm_timeframe,
                    setting : pm_setting,
                    message : pm_message
                };
            else
                comment = {
                    player : pm_player,
                    dayid : pm_dayid,
                    timeframe : pm_timeframe,
                    setting : pm_setting,
                    message : pm_message
                };
            $http.post(config.urlbase + '/comment?log_action=' + action, comment).success(callback).error(genericError);
        }
    };
}]);

