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
        urlbase : "/api",
        FIRST_DAY_OF_WEEK : 1
    };
}]);

timeForGamesApp.factory('authInterceptor', ['localStorageService', function (localStorageService) {
  return {
    request: function (config) {
      config.headers = config.headers || {};
      var logintoken = localStorageService.get('tfgLoginToken');
      if (logintoken != null) {
        config.headers.Authorization = 'Bearer ' + logintoken;
      }
      return config;
    },
    response: function (response) {
      if (response.status === 401) {
        // handle the case where the user is not authenticated
      }
      return response || $q.when(response);
    }
  };
}]);

timeForGamesApp.factory('watchService', ['$http', 'config', function($http, config) {

    return {

        getWatches : function(callback, errorcallback) {
            $http.get(config.urlbase + '/watch').success(function(data, status) {
                    callback(data);
            }).error(function(data, status) {
                    errorcallback(data);
            });
        },

        setWatch : function(pm_level, pm_setting, callback, errorcallback) {
            $http.put(config.urlbase + '/watch/' + pm_setting, { level : pm_level }).success(function(data, status) {
                    callback(data);
            }).error(function(data, status) {
                    errorcallback(data);
            });
        },

        clearWatch : function(pm_setting, callback, errorcallback) {
            $http.delete(config.urlbase + '/watch/' + pm_setting).success(function(data, status) {
                    callback(data);
            }).error(function(data, status) {
                    errorcallback(data);
            });
        }
    };
}]);

timeForGamesApp.factory('userService', ['$http', 'config', 'localStorageService', 
function($http, config, localStorageService) {

    return {

        getAdmins : function(callback, errorcallback) {
            $http.get(config.urlbase + '/admins').success(function(data, status) {
                    callback(data);
            }).error(function(data, status) {
                    errorcallback(data);
            });
        },

        checkAdminStatus : function(callback, errorcallback) {
            $http.get(config.urlbase + '/status').success(function(data, status) {
                    callback(data);
            }).error(function(data, status) {
                    errorcallback(data);
            });
        },

        storeUser : function(pm_user, callback, errorcallback) {
            if (pm_user.id) {
                $http.put(config.urlbase + '/user/' + pm_user.id, { user : pm_user}).success(function(data, status) {
                        callback(data);
                    }).error(function(data, status) {
                        errorcallback(data);
                    });
            }
            else {
                $http.post(config.urlbase + '/user', { user : pm_user}).success(function(data, status) {
                        callback(data);
                    }).error(function(data, status) {
                        errorcallback(data);
                    });
                }
        },

        deleteUser : function(user, callback, errorcallback) {
	    $http.delete(config.urlbase + '/user/' + user.id).success(function(data, status) {
                callback(data);
            }).error(function(data, status) {
                errorcallback(data);
            });
        },

        getUsers : function(callback, errorcallback) {
	    $http.get(config.urlbase + '/user').success(function(data, status) {
                callback(data);
            }).error(function(data, status) {
                errorcallback(data);
            });
        },

        login : function(pm_username, pm_password, callback, errorcallback) {
            $http.post(config.urlbase + '/login', {
                username : pm_username,
                password : pm_password
            }).success(function(data, status) {
                callback(data);
            }).error(function(data, status) {
                errorcallback(data);
            });
        },

        spoofLogin : function(pm_username, callback, errorcallback) {
            $http.get(config.urlbase + '/spoof/' + pm_username).success(function(data, status) {
                callback(data);
            }).error(function(data, status) {
                errorcallback(data);
            });
        },

        relogin : function(callback, deniedcallback, errorcallback) {
            $http.get(config.urlbase + '/relogin').success(function(data, status) {
                callback(data);
            }).error(function(data, status) {
                console.log("Status: " + status);
                if (status == 404) {
                    deniedcallback("Token invalide ou expiré");
                }
                else {
                    errorcallback("Erreur d'authentification");
                }
            });
        },
        
        expireToken : function(callback) {
            var token = localStorageService.get('ggLoginToken'); 
            if (token == null) {
                callback();
            }
            else {
                $http.get(config.urlbase + '/expireToken').success(function(data, status) {
                    callback(data);
                }).error(function(data, status) {
                    window.alert("Impossible de vérifier l'utilisateur: " + data);
                });
            }
        },
                
        resetMyPassword : function(username, callback, errorcallback) {
            var pw_request = {
                action : 'RES_PW_SEC',
                username: username,
                params : {}
            };
            $http.post(config.urlbase + '/secureStore', pw_request).success(function(data, status) {
                callback(data);
            }).error(function(data, status) {
                errorcallback(data);
            });
        },

        setPassword : function(pm_oldpass, pm_newpass, callback, errorcallback) {
            $http.put(config.urlbase + '/password', { oldp : pm_oldpass, newp : pm_newpass}).success(function(data, status) {
                callback(data);
            }).error(function(data, status) {
                errorcallback(data);
            });
        },

        adminResetPassword : function(pm_user, callback, errorcallback) {
            $http.get(config.urlbase + '/resetPassword/' + pm_user.name).success(function(data, status) {
                callback(data);
            }).error(function(data, status) {
                errorcallback(data);
            });
        },

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
        },

        getUserHistory : function(username, callback) {
            $http.get(config.urlbase + '/history/user/' + username).success(function(data, status) {
                callback(data);
            }).error(function(data, status) {
                window.alert("Impossible de récupérer l'historique: " + data);
            });
        },

        getSettingHistory : function(settingid, callback) {
            $http.get(config.urlbase + '/history/setting/' + settingid).success(function(data, status) {
                callback(data);
            }).error(function(data, status) {
                window.alert("Impossible de récupérer l'historique: " + data);
            });
        }

    };
}]);

timeForGamesApp.factory('settingsService', ['$http', 'config', '$upload',
function($http, config, $upload) {

    return {

        storePicture : function(pm_settingid, pm_file, progresscallback, callback, errorcallback) {
            $upload.upload({
                url : config.urlbase + '/setting/pic/' + pm_settingid,
                method: 'PUT',
                // headers: {'header-key': 'header-value'},
                // withCredentials: true,
                data : {},
                file : pm_file, // or list of files: $files for html5 only
                /* set the file formData name ('Content-Desposition'). Default is 'file' */
                fileFormDataName: 'imageFile' + (new Date().getTime()), //or a list of names for multiple files (html5).
                /* customize how data is added to formData. See #40#issuecomment-28612000 for sample code */
                //formDataAppender: function(formData, key, val){}
            }).progress(progresscallback).success(callback).error(callback);
        },

        deletePicture : function(pm_settingid, callback, errorcallback) {
            $http.delete(config.urlbase + '/setting/pic/' + pm_settingid).success(function(data, status) {
                    callback(data);
                }).error(function(data, status) {
                    errorcallback(data);
                });
        },

        storeSetting : function(pm_setting, callback, errorcallback) {
            if (pm_setting.id) {
                $http.put(config.urlbase + '/setting/' + pm_setting.id, { setting : pm_setting}).success(function(data, status) {
                        callback(data);
                    }).error(function(data, status) {
                        errorcallback(data);
                    });
            }
            else {
                $http.post(config.urlbase + '/setting', { setting : pm_setting}).success(function(data, status) {
                        callback(data);
                    }).error(function(data, status) {
                        errorcallback(data);
                    });
            }
        },

        deleteSetting : function(setting, callback, errorcallback) {
	    $http.delete(config.urlbase + '/setting/' + setting.id + '?name=' + setting.name).success(function(data, status) {
                callback(data);
            }).error(function(data, status) {
                errorcallback(data);
            });
        },

        getSettings : function(callback, errorcallback) {
	    $http.get(config.urlbase + '/setting').success(function(data, status) {
                callback(data);
            }).error(function(data, status) {
                errorcallback(data);
            });
        },
    };
}]);

timeForGamesApp.factory('planningBuilderService', ['config',
function(config) {

    var timeframeIndex = {
        'AFTERNOON' : 0,
        'EVENING' : 1
    };

    function createTimeframesBlock(timeframes, start, end) {
	    timeframes[start].end = timeframes[end];
            var subList = [];
            for (var i = start; i <= end; i++) subList.push(timeframes[i]); 
            timeframes[start].subs = subList;
	    timeframes.splice(start + 1, end - start); 
    }

    function aggregateTimeframes(timeframes) {
        if (timeframes.length < 2) return timeframes;
        var timeframe;
        var blockStart = -1;
        for (var i = 0; i < timeframes.length; i++) {
            timeframe = timeframes[i];
            if (timeframe.collapsed) {
                if (blockStart == -1) {
                    blockStart = i;
                }
            }
            else {
                if (blockStart > -1) {
                    if (blockStart == i-1) {
		            // un collapsed tout seul, on l'ouvre
		            timeframes[blockStart].collapsed = false;
                    }
                    else {
		            // agreger de blockStart à i-1
                            createTimeframesBlock(timeframes, blockStart, i-1);
		            i = blockStart + 1;
                    }
                    blockStart = -1;
                }
            }
         }
         if (blockStart > -1) {
            if (blockStart == timeframes.length -1) {
	            timeframes[blockStart].collapsed = false;
            }
            else {
                createTimeframesBlock(timeframes, blockStart, i-1);
            }
         }
        return timeframes;
    }

    function isCollapsedByDefault(timeframe) {
        if (timeframe.dow == 0) {
            if (timeframe.code == 'EVENING') return true;
            else return false;
        }
        else if (timeframe.dow < 5) {
            return true;
        }
        else if (timeframe.dow == 5) {
            if (timeframe.code == 'AFTERNOON') return true;
            else return false;
        }
        else return false;
    }

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
                    name : settingref.name,
                    newStuff : false,
                    mode : settingref.mode,
                    status : settingref.status,
                    games : [],
                    availableplayers : [],
                    availablegms : [],
                    unavailable : [],
                    mystatus : new tfSettingStatus(),
                    key : '' + timeframe.dayid + timeframe.code + settingref.id,
                    comments : [],
                    hasgame : false
                };
                currentArray.push(newsetting);
                return newsetting;
            }
        }
        return undefined;
    };

    var addComment = function(comment, timeframe, allSettings, me) {
        var tfSetting = mergeSetting(allSettings, timeframe, comment.setting);
        tfSetting.comments.push(comment);
    };
    
    var addSchedule = function(rawschedule, timeframe, allSettings, me) {
        var g, game;
        var tfSetting = mergeSetting(allSettings, timeframe, rawschedule.setting);
        var newschedule = {
            player : rawschedule.player,
            id : rawschedule.idschedule,
            game : rawschedule.game,
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
                    players : [],
                    storyName : rawschedule.title,
                    gameTime : rawschedule.time
                };
                tfSetting.games.push(game);
            }
            tfSetting.defgame = tfSetting.games[0];
            if (rawschedule.role == 'GM')
                game.gm = newschedule;
            else if (rawschedule.role == 'PLAYER')
                game.players.push(newschedule);
            timeframe.gaming[rawschedule.player] = getSettingName(rawschedule.setting, allSettings);
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
        }
    };

    return {
        MS_IN_DAY : 1000 * 60 * 60 * 24,

        dispatchUpdatesFlags : function(updatesHash, timeframes, lastVisit) {
            var t, s, timeframe, setting, lastUpdate;
            for ( t = 0; t < timeframes.length; t++) {
                timeframe = timeframes[t];
                for ( s = 0; s < timeframe.settings.length; s++) {
                    setting = timeframe.settings[s];
                    lastUpdate = updatesHash[timeframe.dayid + '-' + timeframe.code + '-' + setting.settingid];
                    if (( typeof lastUpdate != "undefined") && (lastUpdate > lastVisit))
                        setting.newStuff = true;
                }
            }
        },

        getDayId : function(daytime) {
            var date = new Date(daytime);
            return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
        },

        initTimeframe : function(code, daydate, settings) {
            var result = new Object();
            result.code = code;
            result.dow = daydate.getDay();
            result.dom = daydate.getDate();
            result.month = daydate.getMonth() + 1;
            result.year = daydate.getFullYear();
            result.dayid = result.year * 10000 + result.month * 100 + result.dom;
            result.date = daydate;
            result.settings = [];
            result.busy = false;
            result.gaming = {};
            result.possibleNewSettings = settings.slice();
            result.collapsed = isCollapsedByDefault(result);
            return result;
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
            today.setHours(12, 0, 0, 0);
            var currtime = today.getTime();
            var dow = today.getDay();

            // premier jour de debut anterieur
            var diff = config.FIRST_DAY_OF_WEEK - dow;
            if (dow < config.FIRST_DAY_OF_WEEK)
                diff -= 7;
            currtime += diff * this.MS_IN_DAY;

            return currtime;
        },

        refreshTimeframePlanning : function(settings, schedules, comments, timeframe, me) {
            var i;

            timeframe.busy = false;
            timeframe.gaming = {};
            timeframe.settings.length = 0;
            timeframe.possibleNewSettings.length = 0;
            timeframe.collapsed = isCollapsedByDefault(timeframe);
            settings.forEach(function(setting) {
                if (setting.status == 0) {
                    timeframe.possibleNewSettings.push(setting);
                }
            });            
            delete timeframe.mygame;
            for ( i = 0; i < schedules.length; i++) {
                addSchedule(schedules[i], timeframe, settings, me);
            }
            for ( i = 0; i < comments.length; i++) {
                addComment(comments[i], timeframe, settings, me);
            }
            timeframe.settings.forEach(function(setting) {
                setting.canplay = setting.availableplayers.some(function(playerschedule) {
                    return ((typeof timeframe.gaming[playerschedule.player] == "undefined") && (playerschedule.player != me));
                });
            });
            timeframe.settings.sort(function(settinga, settingb) {
                return settinga.name.localeCompare(settingb.name);
            });
        },

        buildMonthGamesPlanning : function (month, year, settings, games, me) {

            var maxDayOfMonth = new Date(year, month, 0).getDate();
            var minday = year * 10000 + month * 100 + 1;
            var maxday = minday + maxDayOfMonth - 1; 

            // Initialisation des semaines
            var weeks = Array();
            var currweek;
            var currdow = (new Date(year, month-1, 1).getDay())-1;
            if (currdow != 4) {
              currweek = { days : [] };
              weeks.push(currweek);
              for (var tempdow = currdow; (tempdow != 4) && (tempdow != -3); tempdow--) {
                  currweek.days.push( { outside : true } );
              }
            }
            
            var currdayid;
            var currday;
            var dayMap = new Object();

            var currdom = 1;
            for (currdayid = minday; currdayid <= maxday; currdayid ++) {
                currdow++;
                if (currdow == 7) currdow = 0;
                if (currdow == 5) {
                    currweek = { days : [] };
                    weeks.push(currweek);
                }
                currday = {
                    id : currdayid,
                    dow : currdow,
                    dom : currdom,
                    outside : false,
                    timeframes : [{
                        code : 'AFTERNOON',
                        games : [],
                        busy : false,
                    }, {
                        code : 'EVENING',
                        games : [],
                        busy : false,
                    }]
                };

                currweek.days.push(currday);
                dayMap[currday.id] = currday;
                currdom++;
            }
            for (var tempdow = currdow; (tempdow != 4) && (tempdow != 11); tempdow++) {
                currweek.days.push( { outside : true } );
            }

            var gamesMap = new Object();
            var targetgame;
            games.forEach(function(gameschedule) {
                targetgame = gamesMap[gameschedule.game];
                if (typeof targetgame == "undefined") {
                    targetgame = {
                        id: gameschedule.game,
                        mygame : false,
                        setting: getSettingName(gameschedule.setting, settings),
                        dayid: gameschedule.dayid,
                        timeframe: gameschedule.timeframe,
                        title: gameschedule.title,
                        time : gameschedule.time,
                        players : [],
                        gm : undefined
                    };
                    gamesMap[targetgame.id] = targetgame;
                }
                if (gameschedule.role == 'GM') targetgame.gm = gameschedule.player;
                else targetgame.players.push(gameschedule.player);
                if (gameschedule.player == me) targetgame.mygame = true;             
            });

            var targettimeframe;
            for (var gameid in gamesMap) {
                targetgame = gamesMap[gameid];
                targettimeframe = dayMap[targetgame.dayid].timeframes[timeframeIndex[targetgame.timeframe]];
                targettimeframe.games.push(targetgame);
            }

            return weeks;
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
        },

        buildTimeframesPlanning : function(mindaytime, daycount, settings, schedules, comments, me) {

            // Initialisation
            var activeSettings = Array();
            settings.forEach(function(setting) {
                if (setting.status == 0) {
                    activeSettings.push(setting);
                }
            });

            var timeframes = Array();
            var currtime;
            var currTimeframe;
            var maxtime = mindaytime + this.MS_IN_DAY * daycount;
            var tfMap = new Object();
	    var dayDate;
            for ( currtime = mindaytime; currtime < maxtime; currtime += this.MS_IN_DAY) {
		dayDate = new Date(currtime);
                currTimeframe = this.initTimeframe('AFTERNOON', dayDate, activeSettings);
                timeframes.push(currTimeframe);
                tfMap[currTimeframe.dayid + '-AFTERNOON'] = currTimeframe;
                currTimeframe = this.initTimeframe('EVENING', dayDate, activeSettings);
                timeframes.push(currTimeframe);
                tfMap[currTimeframe.dayid + '-EVENING'] = currTimeframe;
            }

            // ajouter les schedule dans availablepj / available mj

            var i, timeframe, rawschedule, comment;
            var tfSetting;
            for ( i = 0; i < schedules.length; i++) {
                rawschedule = schedules[i];
                timeframe = tfMap[rawschedule.dayid + '-' + rawschedule.timeframe];
                timeframe.collapsed = false;
                addSchedule(rawschedule, timeframe, settings, me);
            }
            for ( i = 0; i < comments.length; i++) {
                comment = comments[i];
                timeframe = tfMap[comment.dayid + '-' + comment.timeframe];
                timeframe.collapsed = false;
                addComment(comment, timeframe, settings, me);
            }
            timeframes.forEach(function(item) {
                item.settings.forEach(function(setting) {
                    setting.canplay = setting.availableplayers.some(function(playerschedule) {
                        return ((typeof item.gaming[playerschedule.player] == "undefined") && (playerschedule.player != me));
                    });
                });
    		    item.settings.sort(function(settinga, settingb) {
    		        return settinga.name.localeCompare(settingb.name);
    		    });
            });

            return aggregateTimeframes(timeframes);
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

        setDispo : function(pm_dayid, pm_timeframe, pm_setting, pm_role, callback) {
            var schedule = {
                dayid : pm_dayid,
                timeframe : pm_timeframe,
                role : pm_role,
                setting : pm_setting
            };
            $http.post(config.urlbase + '/schedule?log_action=ADD_DISPO', schedule).success(callback).error(genericError);
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

        getGames : function(minday, maxday, callback) {
            $http.get(config.urlbase + '/planning?gamesonly=1&minday=' + minday + '&maxday=' + maxday).success(callback).error(genericError);
        },

        reformGame : function(pm_idgame, pm_time, pm_title, pm_newplayers, callback) {
            $http.put(config.urlbase + '/game/' + pm_idgame + '?log_action=RFM_GAME', {
                game : { time : pm_time, title : pm_title },
                players : pm_newplayers
            }).success(callback).error(genericError);
        },

        dropGame : function(idschedule, callback) {
            $http.delete(config.urlbase + '/schedule/' + idschedule + '?log_action=DRP_GAME').success(callback).error(genericError);
        },

        disbandGame : function(idschedule, callback) {
            $http.delete(config.urlbase + '/schedule/' + idschedule + '?log_action=DEL_GAME').success(callback).error(genericError);
        },

        validateGame : function(schedule_id, time, title, players, callback) {
            var game = {
                masterschedule : schedule_id,
                time : time,
                title : title,
                players : players
            };
            $http.post(config.urlbase + '/game?log_action=ADD_GAME', game).success(callback).error(genericError);
        },

        fetchComments : function(mindaytime, daycount, callback) {
            var minday = planningBuilderService.getDayId(new Date(mindaytime));
            var maxdaytime = mindaytime + daycount * planningBuilderService.MS_IN_DAY;
            var maxday = planningBuilderService.getDayId(new Date(maxdaytime));
            $http.get(config.urlbase + '/comment?minday=' + minday + '&maxday=' + maxday).success(callback).error(genericError);
        },

        fetchTimeframeComments : function(pm_dayid, pm_timeframe, callback) {
            $http.get(config.urlbase + '/comment?minday=' + pm_dayid + '&maxday=' + pm_dayid + '&timeframe=' + pm_timeframe).success(callback).error(genericError);
        },

        addComment : function(pm_dayid, pm_timeframe, pm_setting, pm_message, callback) {
            var comment = {
                dayid : pm_dayid,
                timeframe : pm_timeframe,
                setting : pm_setting,
                message : pm_message
            };
            $http.post(config.urlbase + '/comment?log_action=SET_COMMENT', comment).success(callback).error(genericError);
        },

        editComment : function(pm_dayid, pm_timeframe, pm_setting, pm_idcomment, pm_message, callback) {
            var comment = {
                id : pm_idcomment,
                dayid : pm_dayid,
                timeframe : pm_timeframe,
                setting : pm_setting,
                message : pm_message
            };
            $http.put(config.urlbase + '/comment/' + pm_idcomment + '?log_action=SET_COMMENT', comment).success(callback).error(genericError);
        },

        deleteComment : function(pm_idcomment, callback) {
            $http.delete(config.urlbase + '/comment/' + pm_idcomment + '?log_action=DEL_COMMENT').success(callback).error(genericError);
        }

    };
}]);

