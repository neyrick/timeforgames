'use strict';

/* Controllers */

function sortSettings(settings) {
    return settings.sort(function(settinga, settingb) {
        return settinga.name.localeCompare(settingb.name);
    });
}

timeForGamesApp.controller('CalendarCtrlOld', ['$scope', 'settingsService', 'userService', 'plannerService', 'planningBuilderService', 'config', 'localStorageService', 'historyService',
function CalendarCtrl($scope, settingsService, userService, plannerService, planningBuilderService, config, localStorageService, historyService) {

    function timeSlide(days) {
        $scope.firstday = $scope.firstday + days * planningBuilderService.MS_IN_DAY;
        initPlanning();
    }

    function initPlanning() {
        $scope.loading = true;
        setTimeout(function() {
            plannerService.getUpdates($scope.firstday, $scope.dayCount, $scope.currentUser, function(updatesHash) {
                plannerService.getPlanning($scope.firstday, $scope.dayCount, function(planning) {
                    var weeks = planningBuilderService.buildWeeksPlanning($scope.firstday, $scope.dayCount, $scope.settingsList, planning, $scope.currentUser);
                    planningBuilderService.dispatchUpdatesFlags(updatesHash, weeks, $scope.config.lastUpdate);
                    $scope.config.lastUpdate = new Date().getTime();
                    $scope.weeks = weeks;
                    storeConfig();
                    applyFilters();
                });
            });
            $scope.loading = false;
        }, 0);
    }

    function loadConfig() {
        if (( typeof $scope.currentUser == "undefined") || ($scope.currentUser == null))
            return;
        var config = localStorageService.get('ggconfig-' + $scope.currentUser);
        if (( typeof config == "undefined") || (config === '') || (config == null))
            return;
        $scope.config = config;
    }

    function reset() {
        $scope.tempUser = '';
        $scope.tempPassword = '';
        $scope.weeks = Array();
        $scope.config = {
            invisibleStatus : [],
            invisibleOpenSettings : [],
            invisibleOneShots : [],
            visibleClosedSettings : [],
            lastUpdate : 0
        };
        $scope.gui = 'regular';
        $scope.currentEdit = {
        };
    }

    function applyFilters() {
        $scope.settingsList.forEach(function(setting) {
            if (setting.visible)
                $('.settingBadge-id-' + setting.id).removeClass('ggHidden');
            else
                $('.settingBadge-id-' + setting.id).addClass('ggHidden');
        });
    }

    function storeConfig() {
        if ( typeof $scope.currentUser == "undefined")
            return;
        $scope.config.invisibleOpenSettings = [];
        $scope.config.visibleClosedSettings = [];
        $scope.config.invisibleOneShots = [];
        $scope.config.invisibleStatus = [];
        $scope.openSettings.forEach(function(item) {
            if (!item.visible)
                $scope.config.invisibleOpenSettings.push(item.id);
        });
        $scope.closedSettings.forEach(function(item) {
            if (item.visible)
                $scope.config.visibleClosedSettings.push(item.id);
        });
        $scope.oneShots.forEach(function(item) {
            if (!item.visible)
                $scope.config.invisibleOneShots.push(item.id);
        });
        for (var i = 0; i < $scope.statusDesc.length; i++) {
            if (!$scope.statusDesc[i].visible)
                $scope.config.invisibleStatus.push(i);
        }
        localStorageService.add('ggconfig-' + $scope.currentUser, JSON.stringify($scope.config));
    }

    function loginPrompt() {
        if ($scope.display == 'desktop') {
            $("#logindialogcontainer").qtip("toggle", true);
        } else if ($scope.display == 'mobile') {
            // TODO: fenetre de login mobile
        }
    }


    $scope.login = function() {

        userService.login($scope.tempUser, $scope.tempPassword, function(result) {
            if (result.id > -1) {
                $scope.currentUser = $scope.tempUser;
                localStorageService.set('tfgUser', $scope.currentUser);
                $scope.tempUser = '';
                $scope.tempPassword = '';
                localStorageService.set('tfgLoginToken', result.token);
                $scope.gui = result.gui;
                $scope.weeks = [];
                loadConfig();
                $scope.refreshSettings(true);

                if ($scope.display == 'desktop') {
                    $("#logindialogcontainer").qtip("toggle", false);
                } else if ($scope.display == 'mobile') {
                    $("#loginModal").modal('hide');
                }
            } else {
                $scope.loginMessage = result.error;
            }
        }, function(error) {
            if ( typeof error == "object") {
                $scope.loginMessage = error.message;
            } else {
                $scope.loginMessage = error;
            }
        });
    };

    $scope.relogin = function() {
        var oldtoken = localStorageService.get('tfgLoginToken');
        if (oldtoken != null) {
            userService.relogin(function(result) {
                localStorageService.set('tfgLoginToken', result.token);
                $scope.gui = result.gui;
                $scope.currentUser = result.username;
                $scope.tempUser = '';
                $scope.tempPassword = '';
                $scope.weeks = [];
                loadConfig();
                $scope.refreshSettings(true);
            }, function(denialmsg) {
                localStorageService.remove('tfgLoginToken');
                window.alert("Identification invalide: " + denialmsg);
                loginPrompt();
            }, function(errormsg) {
                window.alert("Impossible de te reconnecter: " + errormsg);
                loginPrompt();
            });
        } else {
            loginPrompt();
        }
    };

    $scope.logout = function() {
        userService.expireToken(function() {
            reset();
            delete $scope.currentUser;
            localStorageService.remove('tfgLoginToken');
            if ($scope.display == 'mobile') {
                $("#loginModal").modal('show');
            } else if ($scope.display == 'desktop') {
                $("#logindialogcontainer").qtip("toggle", true);
            }
        });
    };

    $scope.refreshSettings = function(andPlanning) {
        settingsService.getSettings(function(settings) {
            $scope.settingsList = sortSettings(settings);
            $scope.openSettings = [];
            $scope.closedSettings = [];
            $scope.oneShots = [];
            $scope.clubEvents = [];
            $scope.settingsList.forEach(function(item) {
                if (item.status > 0)
                    return;
                if (item.mode == 0) {
                    $scope.openSettings.push(item);
                    item.visible = ($scope.config.invisibleOpenSettings.indexOf(item.id) == -1);
                } else if (item.mode == 1) {
                    $scope.closedSettings.push(item);
                    item.visible = ($scope.config.visibleClosedSettings.indexOf(item.id) > -1);
                } else if (item.mode == 2) {
                    $scope.oneShots.push(item);
                    item.visible = ($scope.config.invisibleOneShots.indexOf(item.id) == -1);
                } else if (item.mode == 3) {
                    $scope.clubEvents.push(item);
                    item.visible = true;
                }
            });
            if (andPlanning && ( typeof $scope.currentUser != "undefined") && ($scope.currentUser != '') && ($scope.currentUser != null))
                initPlanning();
            $scope.settingsReady = true;
        }, function(error) {
            window.alert("Impossible de récupérer les chroniques: " + error);
        });
    };
    /*
     $scope.toggleStatusVisibility = function(status) {
     if ($scope.statusDesc[status].visible) {
     $('.' + $scope.statusDesc[status].style).addClass('ggHidden');
     $scope.statusDesc[status].visible = false;
     } else {
     $('.' + $scope.statusDesc[status].style).removeClass('ggHidden');
     $scope.statusDesc[status].visible = true;
     }
     storeConfig();
     };
     */
    $scope.toggleSettingVisibility = function(settingid, force) {
        var setting;
        for (var i = 0; i < $scope.settingsList.length; i++) {
            setting = $scope.settingsList[i];
            if (setting.id == settingid) {
                if ((setting.visible) && (force !== true)) {
                    $('.settingBadge-id-' + settingid).addClass('ggHidden');
                    setting.visible = false;
                    break;
                }
                if ((!setting.visible) && (force !== false)) {
                    $('.settingBadge-id-' + settingid).removeClass('ggHidden');
                    setting.visible = true;
                }
                break;
            }
        }
        storeConfig();
    };

    $scope.isInArray = function(item, list) {
        return (list.indexOf('' + item) > -1);
    };

    $scope.statusDesc = [{
        id : 0,
        desc : "Pas dispo / intéressé",
        style : "notAvailableBadge",
        visible : true
    }, {
        id : 1,
        desc : "Partie sans moi",
        style : "noPlayBadge",
        visible : true
    }, {
        id : 2,
        desc : "Je suis dispo",
        style : "availableBadge",
        visible : true
    }, {
        id : 3,
        desc : "Je joue !",
        style : "playBadge",
        visible : true
    }];

    $scope.showPrevious = function() {
        timeSlide(-1 * $scope.dayCount);
    };

    $scope.showNext = function() {
        timeSlide($scope.dayCount);
    };

    // Fonctions au  niveau de la timeframe

    $scope.createAndAddSetting = function() {
        $scope.newsetting.status = 0;
        settingsService.storeSetting($scope.newsetting, function(newsetting) {
            $scope.settingsList.push(newsetting);
            sortSettings($scope.settingsList);
            $scope.weeks.forEach(function(week) {
                week.days.forEach(function(day) {
                    day.timeframes.forEach(function(timeframe) {
                        timeframe.possibleNewSettings.push(newsetting);
                        sortSettings(timeframe.possibleNewSettings);
                    });
                });
            });
            $scope.addSetting(newsetting);
            newsetting.visible = true;
            if (newsetting.mode == 0) {
                $scope.openSettings.push(newsetting);
                sortSettings($scope.openSettings);
            } else if (newsetting.mode == 1) {
                $scope.closedSettings.push(newsetting);
                sortSettings($scope.closedSettings);
            } else if (newsetting.mode == 2) {
                $scope.oneShots.push(newsetting);
                sortSettings($scope.oneShots);
            } else if (newsetting.mode == 3) {
                $scope.clubEvents.push(newsetting);
                sortSettings($scope.clubEvents);
            }
            storeConfig();
            $scope.newsetting.name = '';
            $scope.newsetting.mode = -1;
            $scope.newsetting.status = 0;
            $scope.tooltipLock.mainlock = false;
            if ($scope.display == 'desktop') {
                $('#addSettingTooltipContainer').qtip('api').hide();
            } else if ($scope.display == 'mobile') {
                $("#addSettingModal").modal('hide');
            }
        }, function(error) {
            window.alert("Impossible de créer la chronique: " + error);
        });

    };

    $scope.addSetting = function(setting) {
        plannerService.setDispo($scope.currentEdit.day.id, $scope.currentEdit.timeframe.code, setting.id, 'GM', function() {

            $scope.toggleSettingVisibility(setting.id, true);
            $scope.tooltipLock.mainlock = false;
            if ($scope.display == 'desktop') {
                $('#addSettingTooltipContainer').qtip('api').hide();
            } else if ($scope.display == 'mobile') {
                $("#addSettingModal").modal('hide');
            }
            $scope.refreshTimeframe();
        });
    };

    $scope.refreshTimeframe = function() {
        plannerService.getTimeframePlanning($scope.currentEdit.day.id, $scope.currentEdit.timeframe.code, function(result) {
            planningBuilderService.refreshTimeframeInWeeksPlanning($scope.settingsList, result, $scope.currentEdit.timeframe, $scope.currentUser);
            if ( typeof $scope.currentEdit.schedule != "undefined") {
                $scope.currentEdit.timeframe.settings.some(function(newschedule) {
                    if (newschedule.settingid == $scope.currentEdit.schedule.settingid) {
                        $scope.resetTfSettingData(newschedule);
                        return true;
                    }
                });
            }
        });
    };

    // Fonctions au  niveau du tfSetting

    $scope.toggleGamePlayer = function(playerSchedule) {
        if ( typeof $scope.currentEdit.gamePlayers[playerSchedule.player] != "undefined") {
            delete $scope.currentEdit.gamePlayers[playerSchedule.player];
            $scope.currentEdit.numPlayers--;
        } else {
            $scope.currentEdit.gamePlayers[playerSchedule.player] = playerSchedule;
            $scope.currentEdit.numPlayers++;
        }
    };

    $scope.disbandGame = function() {
        plannerService.disbandGame(getMyGMScheduleId($scope.currentUser, $scope.currentEdit.schedule.games), function() {
            $scope.tooltipLock.mainlock = false;
            //            $('#tfSettingTooltipContainer').qtip('api').hide();
            $scope.refreshTimeframe();
        });
    };

    $scope.dropGame = function() {
        plannerService.dropGame(getMyPlayerScheduleId($scope.currentUser, $scope.currentEdit.schedule.games), function() {
            $scope.tooltipLock.mainlock = false;
            //            $('#tfSettingTooltipContainer').qtip('api').hide();
            $scope.refreshTimeframe();
        });
    };

    $scope.validateGame = function($event) {
        $scope.tooltipLock.mainlock = false;
        //        $('#tfSettingTooltipContainer').qtip('api').hide();
        if ( typeof $scope.currentEdit.timeframe.mygame == "undefined") {
            plannerService.validateGame(getMyScheduleId($scope.currentUser, $scope.currentEdit.schedule, 'GM'), $scope.currentEdit.gamePlayers, function() {
                $scope.refreshTimeframe();
            });
        } else {
            plannerService.reformGame($scope.currentEdit.timeframe.mygame.id, $scope.currentEdit.gamePlayers, function() {
                $scope.refreshTimeframe();
            });
        }
    };

    $scope.setComment = function() {
        plannerService.setComment($scope.currentUser, $scope.currentEdit.day.id, $scope.currentEdit.timeframe.code, $scope.currentEdit.schedule.settingid, $scope.currentEdit.schedule.idcomment, $scope.currentEdit.schedule.message, function() {
            $scope.tooltipLock.mainlock = false;
            //            $('#tfSettingTooltipContainer').qtip('api').hide();
            $scope.refreshTimeframe();
        });
    };

    $scope.setDispo = function(role) {
        plannerService.setDispo($scope.currentEdit.day.id, $scope.currentEdit.timeframe.code, $scope.currentEdit.schedule.settingid, role, function() {
            $scope.tooltipLock.mainlock = false;
            //            $('#tfSettingTooltipContainer').qtip('api').hide();
            $scope.refreshTimeframe();
        });
    };
    $scope.clearDispo = function(role) {
        plannerService.clearDispo(getMyScheduleId($scope.currentUser, $scope.currentEdit.schedule, role), function() {
            $scope.tooltipLock.mainlock = false;
            //            $('#tfSettingTooltipContainer').qtip('api').hide();
            $scope.refreshTimeframe();
        });
    };

    $scope.openCommentEditor = function() {
        $scope.tooltipLock.mainlock = true;
        $scope.editingComment = true;
        $('.commentEdit').find('.inputComment').focus();
        /*
         $('.commentTrigger').slideUp(200);
         var $box=$('.commentTrigger').next('.commentEdit');
         $box.slideDown(200);
         */
    };

    $scope.closeCommentEditor = function() {
        $scope.editingComment = false;
        /*
         $('.commentEdit').slideUp(200);
         $('.commentTrigger').slideDown(200);
         */
    };

    $scope.openGameEditor = function() {
        $scope.tooltipLock.mainlock = true;
        $scope.editingGame = true;
        /*
         $('.validateDiv').slideUp(200);
         $('.gameEditor').slideDown(200);
         */
    };

    $scope.closeGameEditor = function() {
        $scope.editingGame = false;
        /*
         $('.validateDiv').slideDown(200);
         $('.gameEditor').slideUp(200);
         */
    };

    $scope.showHistory = function($event) {
        $scope.historyList.length = 0;
        historyService.getHistory($scope.currentEdit.day.id, $scope.currentEdit.timeframe.code, $scope.currentEdit.schedule.settingid, function(history) {
            for (var i = 0; i < history.length; i++) {
                $scope.historyList.push(history[i]);
            }
            if ($scope.display == 'desktop') {
                $scope.tooltipLock.mainlock = true;
                $($event.target).qtip('api').show();
            } else if ($scope.display == 'mobile') {
                $('#historyModal').modal('show');
            }
        });

    };

    $scope.resetTfSettingData = function(newschedule) {
        $scope.currentEdit.schedule = newschedule;
        $scope.currentEdit.status = newschedule.mystatus;
        $scope.currentEdit.gamePlayers = {};
        $scope.currentEdit.potentialPlayers = new Array();
        $scope.currentEdit.numPlayers = 0;
        $scope.historyList.length = 0;
        $scope.history.setting = newschedule.name;

        var i, j, currentItem;
        for ( i = 0; i < newschedule.games.length; i++) {
            currentItem = newschedule.games[i];
            if (currentItem.gm.player == $scope.currentUser) {
                for ( j = 0; j < currentItem.players.length; j++) {
                    $scope.currentEdit.gamePlayers[currentItem.players[j].player] = currentItem.players[j];
                    $scope.currentEdit.potentialPlayers.push(currentItem.players[j]);
                    $scope.currentEdit.numPlayers++;
                }
            }
        }
        for ( i = 0; i < newschedule.availableplayers.length; i++) {
            currentItem = newschedule.availableplayers[i];
            if ((currentItem.player != $scope.currentUser) && ( typeof $scope.currentEdit.timeframe.gaming[currentItem.player] == "undefined")) {
                $scope.currentEdit.potentialPlayers.push(currentItem);
            }
        }
    };

    $scope.openSettingEditor = function() {
        $scope.tooltipLock.mainlock = true;
        $('.settingTrigger').slideUp(200);
        var $box = $('.settingEditor');
        $box.slideDown(200);
        $box.find('.inputSettingName').focus();
    };

    $scope.closeSettingEditor = function() {
        $('.settingEditor').slideUp(200);
        $('.settingTrigger').slideDown(200);
    };

    $scope.display = $('body').data('display');
    if ( typeof $scope.display == "undefined")
        $scope.display = "desktop";

    if ($scope.display == 'desktop') {

        $.fn.qtip.modal_zindex = 16000;
        $('#logindialogcontainer').qtip({
            style : {
                classes : 'ggpanel logindialog'
            },
            content : {
                text : $('#logindialog')
            },
            position : {
                my : 'center',
                at : 'center',
                target : $(window)
            },
            show : {
                autofocus : '#inputName',
                event : false,
                modal : {
                    on : true,
                    blur : false,
                    escape : false
                }
            },
            hide : false
        });

        $('#tfSettingTooltipContainer').qtip({
            style : {
                classes : 'ggpanel tfSettingEditBox'
            },
            content : {
                text : $('.tfSettingDropdown')
            },
            position : {
                my : 'top center',
                at : 'bottom center',
                target : $('#tfSettingTooltipContainer'),
                adjust : {
                    x : -10,
                    y : -9
                }
            },
            show : {
                event : false,
            },
            hide : {
                delay : 100,
                fixed : true,
                event : 'mouseleave unfocus',
                inactive : 10000
            },
            events : {
                show : function(event, api) {
                    $('#addSettingTooltipContainer').qtip('hide');
                },
                hide : function(event, api) {
                    if (($scope.tooltipLock.mainlock === true) && ((event.originalEvent.type != 'mousedown') || (event.originalEvent.target.id != 'ggoverlay'))) {
                        event.preventDefault();
                        return;
                    }
                    $scope.closeCommentEditor();
                    $scope.closeGameEditor();
                    if ($scope.$$phase == null) {
                        $scope.$apply(function() {
                            $scope.tooltipLock.mainlock = false;
                        });
                    } else {
                        $scope.tooltipLock.mainlock = false;
                    }
                }
            }
        });

        $('#addSettingTooltipContainer').qtip({
            style : {
                classes : 'ggpanel extraSettingEditBox'
            },
            content : {
                text : $('.addSettingDropdown')
            },
            position : {
                my : 'top center',
                at : 'bottom left',
                target : $('#addSettingTooltipContainer'),
                adjust : {
                    x : -4,
                    y : -12
                }
            },
            show : {
                event : false,
            },
            hide : {
                delay : 100,
                fixed : true,
                event : 'mouseleave unfocus',
                inactive : 2000
            },
            events : {
                show : function(event, api) {
                    $('#tfSettingTooltipContainer').qtip('hide');
                },
                hide : function(event, api) {
                    if (($scope.tooltipLock.mainlock === true) && ((event.originalEvent.type != 'mousedown') || (event.originalEvent.target.id != 'ggoverlay'))) {
                        event.preventDefault();
                        return;
                    }
                    $scope.closeSettingEditor();
                    if ($scope.$$phase == null) {
                        $scope.$apply(function() {
                            $scope.tooltipLock.mainlock = false;
                        });
                    } else {
                        $scope.tooltipLock.mainlock = false;
                    }
                }
            }
        });
    }

    if ($scope.display == 'mobile') {
        $('#addSettingModal').on('hidden.bs.modal', function(e) {
            $scope.closeSettingEditor();
        });
        $('#tfSettingModal').on('hidden.bs.modal', function(e) {
            $scope.closeCommentEditor();
            $scope.closeGameEditor();
        });
        $('#historyModal').on('show.bs.modal', function(e) {
            $('#tfSettingModal').modal('hide');
        });
        $('#historyModal').on('hidden.bs.modal', function(e) {
            $('#tfSettingModal').modal('show');
        });
        $('#loginModal').on('shown.bs.modal', function(e) {
            $('#inputName').focus();
        });
    }

    $scope.loading = false;

    $scope.newsetting = {
        name : '',
        mode : -1,
        status : 0,
        code : ''
    };

    if ($scope.display == 'desktop') {
        $scope.dayCount = 42;
    } else if ($scope.display == 'mobile') {
        $scope.dayCount = 42;
    }

    $scope.firstday = planningBuilderService.getDefaultMinDay();

    $scope.settingsReady = false;

    $scope.tooltipLock = {
        mainlock : false
    };
    $scope.editingGame = false;
    $scope.editingComment = false;

    $scope.gui = 'regular';
    $scope.loginMessage = "C'est qui ?";
    $scope.currentEdit = {};
    $scope.historyList = [];
    $scope.history = {};
    reset();
    //    relogin();

}]);

timeForGamesApp.controller('AdminCtrl', ['$scope', '$timeout', 'config', 'settingsService', 'userService', 'localStorageService', 'historyService',
function AdminCtrl($scope, $timeout, config, settingsService, userService, localStorageService, historyService) {

    $scope.tab = 'users';
    $scope.settingsMode = -1;
    $scope.settingsList = [];
    $scope.users = [];

    $scope.currentEditUser = null;
    $scope.currentEditSetting = null;
    $scope.currentUploadFile = null;
    $scope.currentUploadData = null;
    $scope.historyCriterion = null;
    $scope.showHistorySetting = false;
    $scope.uploading = false;
    $scope.progress = 0;
    $scope.historyList = [];
    $scope.imagePristine = true;
    $scope.picTimestamp = {};
    $scope.basePicUrl = config.urlbase + "/setting/pic/";

    $scope.currentUser = localStorageService.get('tfgUser');

    function showApiError(error) {
        if ( typeof error == "object") {
            window.alert(error.message);
        } else {
            window.alert(error);
        }
    }


    $scope.loadUsers = function() {
        userService.getUsers(function(users) {
            $scope.users = users;
        }, function(error) {
            showApiError(error);
        });
    };

    $scope.loadSettings = function() {
        settingsService.getSettings(function(settings) {
            //            $scope.settingsList = sortSettings(settings);
            $scope.settingsList = settings;
        }, function(error) {
            showApiError(error);
        });
    };

    $scope.logout = function() {
        userService.expireToken(function() {
            localStorageService.remove('tfgLoginToken');
            window.location = 'index.html';
        });
    };

    $scope.editUser = function(user) {
        if ( typeof user == "undefined") {
            $scope.currentEditUser = {
                name : null,
                email : null,
                status : 0,
                isadmin : false
            };
        } else {
            $scope.currentEditUser = user;
        }
        $('#userEditModal').modal('show');
    };

    $scope.editSetting = function(setting) {
        if ( typeof setting == "undefined") {
            $scope.currentEditSetting = {
                name : null,
                mode : 0,
                status : 0
            };
            $scope.clearImage();
        } else {
            $scope.currentEditSetting = setting;
            $('.fileDropZone').css('background-image', "url('" + $scope.basePicUrl + setting.id + "?" + $scope.picTimestamp[setting.id] + "')");
        }
        $scope.imagePristine = true;
        $('#settingEditModal').modal('show');
    };

    $scope.storeUser = function() {
        userService.storeUser($scope.currentEditUser, function(data) {
            $scope.loadUsers();
            $('#userEditModal').modal('hide');
        }, function(error) {
            showApiError(error);
        });
    };

    $scope.getSettingPicUrl = function(settingid) {
        var base = $scope.basePicUrl + settingid + '?';
        if ( typeof $scope.picTimestamp[settingid] == "undefined")
            return base;
        else
            return base + $scope.picTimestamp[settingid];
    };

    $scope.storeSetting = function() {
        settingsService.storeSetting($scope.currentEditSetting, function(newsetting) {
            if ($scope.imagePristine) {
                $scope.loadSettings();
                $('#settingEditModal').modal('hide');
            } else {
                if ($scope.currentUploadFile != null) {
                    $scope.progress = 0;
                    $scope.uploading = true;
                    settingsService.storePicture(newsetting.id, $scope.currentUploadFile, function(evt) {
                        $scope.progress = parseInt(100.0 * evt.loaded / evt.total);
                    }, function(data, status, headers, config) {
                        $scope.uploading = false;
                        $scope.loadSettings();
                        $scope.picTimestamp[newsetting.id] = new Date().getTime();
                        $('#settingEditModal').modal('hide');
                    }, function(result) {
                        $scope.uploading = false;
                        window.alert("Upload échoué");
                    });
                } else {
                    settingsService.deletePicture(newsetting.id, function(data) {
                        $scope.loadSettings();
                        $scope.picTimestamp[newsetting.id] = new Date().getTime();
                        $('#settingEditModal').modal('hide');
                    }, function(result) {
                        window.alert("Suppresion échouée");
                    });
                }
            }
        }, function(error) {
            showApiError(error);
        });
    };

    $scope.resetPassword = function(user) {
        userService.adminResetPassword(user, function(data) {
            window.alert('Le mot de passe de ' + user.name + ' a été réinitialisé');
        }, function(error) {
            showApiError(error);
        });
    };

    $scope.spoofLogin = function(user) {
        userService.spoofLogin(user.name, function(result) {
            localStorageService.set('tfgLoginToken', result.token);
            window.location = 'index.html';
        }, function(error) {
            showApiError(error);
        });
    };

    $scope.promptDestroyUser = function(user) {
        $scope.currentEditUser = user;
        $('#userDeleteAlert').modal('show');
    };

    $scope.promptDestroySetting = function(setting) {
        $scope.currentEditSetting = setting;
        $('#settingDeleteAlert').modal('show');
    };

    $scope.destroyUser = function() {
        userService.deleteUser($scope.currentEditUser, function(data) {
            $scope.loadUsers();
            $('#userDeleteAlert').modal('hide');
        }, function(error) {
            showApiError(error);
        });
    };

    $scope.destroySetting = function() {
        settingsService.deleteSetting($scope.currentEditSetting, function(data) {
            $scope.loadSettings();
            $('#settingDeleteAlert').modal('hide');
        }, function(error) {
            showApiError(error);
        });
    };

    var timeframesNames = {
        "AFTERNOON" : "Après-midi",
        "EVENING" : "Soirée"
    };
    $scope.getTfName = function(dayid, timeframe) {
        if ((!dayid) || (!timeframe))
            return '';
        var datestr = '' + dayid;
        var year = datestr.slice(0, 4);
        var month = datestr.slice(4, 6);
        var day = datestr.slice(6);
        return day + '/' + month + '/' + year + ' ' + timeframesNames[timeframe];
    };

    $scope.showUserHistory = function(user) {
        $scope.showHistorySetting = true;
        $scope.historyCriterion = user.name;
        historyService.getUserHistory(user.name, function(history) {
            $scope.historyList = history;
            $('#historyModal').modal('show');
        });
    };

    $scope.showSettingHistory = function(setting) {
        $scope.showHistorySetting = false;
        $scope.historyCriterion = setting.name;
        historyService.getSettingHistory(setting.id, function(history) {
            $scope.historyList = history;
            $('#historyModal').modal('show');
        });
    };

    $scope.onSettingPictureSelect = function($files) {
        var pictureFile = $files[0];
        if ( typeof pictureFile == "undefined") {
            window.alert("Fichier impossible à récupérer");
            return;
        }
        if (pictureFile.type.indexOf('image') != 0) {
            window.alert("Avec un fichier image, ça passera mieux...");
            return;
        }

        if (window.FileReader) {
            var fileReader = new FileReader();
            fileReader.readAsDataURL(pictureFile);
            fileReader.onload = function(e) {
                $scope.$apply(function() {
                    $scope.imagePristine = false;
                    $scope.currentUploadData = e.target.result;
                    $('.fileDropZone').css('background-image', "url(" + $scope.currentUploadData + ")");
                    $scope.currentUploadFile = pictureFile;
                });
            };
        }
    };

    $scope.clearImage = function() {
        $scope.currentUploadFile = null;
        $scope.currentUploadData = null;
        $('.fileDropZone').css('background-image', "none");
        $scope.imagePristine = false;
    };

    userService.checkAdminStatus(function(result) {
        if (result.admin) {
            $scope.loadSettings();
            $scope.loadUsers();
        } else {
            window.location = 'index.html';
        }
    }, function(error) {
        window.location = 'index.html';
    });

    $('body').on('mouseenter', '.functButton', function() {
        var helper = $(this).nextAll('.buttonHelper');
        helper.text(this.dataset['title']);
        helper.show();
    });

    $('body').on('mouseleave', '.functButton', function() {
        var helper = $(this).nextAll('.buttonHelper');
        helper.text("");
        helper.hide();
    });

}]);

timeForGamesApp.controller('CalendarCtrl', ['$scope', 'planningBuilderService', 'plannerService', 'settingsService', 'localStorageService',
'userService', 'config', '$window',   
function TestCtrl($scope, planningBuilderService, plannerService, settingsService, localStorageService, userService, config, $window) {
/*
    $scope.firstday = planningBuilderService.getDefaultMinDay();
    $scope.dayCount = 30;
    $scope.currentUser = 'Neyrick';

    $scope.timeframes = [];
*/

    function setLastDay() {
        $scope.lastday = $scope.firstday + ($scope.dayCount-1) * planningBuilderService.MS_IN_DAY;
    }

    function applyFilters() {
        $scope.settingsList.forEach(function(setting) {
            if (setting.visible)
                $('.setting-id-' + setting.id).removeClass('hidden');
            else
                $('.setting-id-' + setting.id).addClass('hidden');
        });
    }

    $scope.refreshSettings = function(andPlanning) {
        settingsService.getSettings(function(settings) {
            $scope.settingsList = sortSettings(settings);
             $scope.openSettings = [];
             $scope.closedSettings = [];
             $scope.oneShots = [];
             $scope.clubEvents = [];
             $scope.settingsList.forEach(function(item) {
             if (item.status > 0)
                 return;
             if (item.mode == 0) {
                 $scope.openSettings.push(item);
                 item.visible = ($scope.config.invisibleOpenSettings.indexOf(item.id) == -1);
             } else if (item.mode == 1) {
                 $scope.closedSettings.push(item);
                item.visible = ($scope.config.visibleClosedSettings.indexOf(item.id) > -1);
             } else if (item.mode == 2) {
                $scope.oneShots.push(item);
                item.visible = true; 
                //($scope.config.invisibleOneShots.indexOf(item.id) == -1);
             } else if (item.mode == 3) {
                $scope.clubEvents.push(item);
                item.visible = true;
             }
           });
            if (andPlanning && ( typeof $scope.currentUser != "undefined") && ($scope.currentUser != '') && ($scope.currentUser != null))
                initPlanning();
            $scope.settingsReady = true;
        }, function(error) {
            window.alert("Impossible de récupérer les chroniques: " + error);
        });
    };

    var initPlanning = function() {
        $scope.loading = true;
        setTimeout(function() {
            plannerService.getUpdates($scope.firstday, $scope.dayCount, $scope.currentUser, function(updatesHash) {
                plannerService.getPlanning($scope.firstday, $scope.dayCount, function(planning) {
                    plannerService.fetchComments($scope.firstday, $scope.dayCount, function(comments) {
                        var timeframes = planningBuilderService.buildTimeframesPlanning($scope.firstday, $scope.dayCount, $scope.settingsList, planning, comments, $scope.currentUser);
                        planningBuilderService.dispatchUpdatesFlags(updatesHash, timeframes, $scope.config.lastUpdate);
                        $scope.config.lastUpdate = new Date().getTime();
                        $scope.timeframes = timeframes;
                        storeConfig();
                        applyFilters();
                    });
                });
            });
            $scope.loading = false;
        }, 0);
    };


    var loginPrompt = function() {
        if ($scope.display == 'desktop') {
            $("#logindialogcontainer").qtip("toggle", true);
        } else if ($scope.display == 'mobile') {
            // TODO: fenetre de login mobile
        }
    };

    $scope.toggleSettingVisibility = function(settingid, force) {
        var setting;
        for (var i = 0; i < $scope.settingsList.length; i++) {
            setting = $scope.settingsList[i];
            if (setting.id == settingid) {
                if ((setting.visible) && (force !== true)) {
                    setting.visible = false;
                    break;
                }
                if ((!setting.visible) && (force !== false)) {
                    setting.visible = true;
                }
                break;
            }
        }
        storeConfig();
    };

    $scope.selectSetting = function(timeframe) {
        $scope.currentTimeframe = timeframe;
        $('#addsettingdialogcontainer').qtip('show');
    };

    $scope.createAndAddSetting = function() {
        settingsService.storeSetting($scope.newsetting, function(newsetting) {
            if ($scope.currentUploadFile != null) {
                    $scope.progress = 0;
                    $scope.uploading = true;
                    settingsService.storePicture(newsetting.id, $scope.currentUploadFile, function(evt) {
                        $scope.progress = parseInt(100.0 * evt.loaded / evt.total);
                    }, function(data, status, headers, config) {
                        $scope.uploading = false;
                    }, function(result) {
                        $scope.uploading = false;
                        window.alert("Upload échoué");
                    });
            }
            $scope.settingsList.push(newsetting);
            sortSettings($scope.settingsList);
            $scope.timeframes.forEach(function(timeframe) {
                timeframe.possibleNewSettings.push(newsetting);
                sortSettings(timeframe.possibleNewSettings);
            });
            $scope.addSetting(newsetting);
            newsetting.visible = true;
            if (newsetting.mode == 0) {
                $scope.openSettings.push(newsetting);
                sortSettings($scope.openSettings);
            } else if (newsetting.mode == 1) {
                $scope.closedSettings.push(newsetting);
                sortSettings($scope.closedSettings);
            } else if (newsetting.mode == 2) {
                $scope.oneShots.push(newsetting);
                sortSettings($scope.oneShots);
            } else if (newsetting.mode == 3) {
                $scope.clubEvents.push(newsetting);
                sortSettings($scope.clubEvents);
            }
            storeConfig();
            $scope.newsetting.name = '';
            $scope.newsetting.mode = -1;
            $scope.newsetting.status = 0;
            $('#createSettingForm').hide();
        }, function(error) {
            window.alert("Impossible de créer la chronique: " + error);
        });

    };

    $scope.addSetting = function(setting) {
        plannerService.setDispo($scope.currentTimeframe.dayid, $scope.currentTimeframe.code, setting.id, 'GM', function() {
            $scope.refreshTimeframe($scope.currentTimeframe);
            $('#addsettingdialogcontainer').qtip('hide');
        });
    };

    $scope.refreshTimeframe = function(timeframe) {
        plannerService.getTimeframePlanning(timeframe.dayid, timeframe.code, function(planning) {
            plannerService.fetchTimeframeComments(timeframe.dayid, timeframe.code, function(comments) {
                if (timeframe.collapsed) {
                    initPlanning();
                } else {
                    planningBuilderService.refreshTimeframePlanning($scope.settingsList, planning, comments, timeframe, $scope.currentUser);
                }
            });
        });
    };

    $scope.login = function() {

        userService.login($scope.tempUser, $scope.tempPassword, function(result) {
            if (result.id > -1) {
                $scope.currentUser = $scope.tempUser;
                localStorageService.set('tfgUser', $scope.currentUser);
                $scope.tempUser = '';
                $scope.tempPassword = '';
                localStorageService.set('tfgLoginToken', result.token);
                $scope.gui = result.gui;
                $scope.weeks = [];
                loadConfig();
                $scope.refreshSettings(true);

                if ($scope.display == 'desktop') {
                    $("#logindialogcontainer").qtip("toggle", false);
                } else if ($scope.display == 'mobile') {
                    $("#loginModal").modal('hide');
                }
            } else {
                $scope.loginMessage = result.error;
            }
        }, function(error) {
            if ( typeof error == "object") {
                $scope.loginMessage = error.message;
            } else {
                $scope.loginMessage = error;
            }
        });
    };

    $scope.relogin = function() {
        var oldtoken = localStorageService.get('tfgLoginToken');
        if (oldtoken != null) {
            userService.relogin(function(result) {
                localStorageService.set('tfgLoginToken', result.token);
                $scope.gui = result.gui;
                $scope.currentUser = result.username;
                $scope.tempUser = '';
                $scope.tempPassword = '';
                $scope.weeks = [];
                loadConfig();
                $scope.refreshSettings(true);
            }, function(denialmsg) {
                localStorageService.remove('tfgLoginToken');
                window.alert("Identification invalide: " + denialmsg);
                loginPrompt();
            }, function(errormsg) {
                window.alert("Impossible de te reconnecter: " + errormsg);
                loginPrompt();
            });
        } else {
            loginPrompt();
        }
    };

    $scope.logout = function() {
        userService.expireToken(function() {
            reset();
            delete $scope.currentUser;
            localStorageService.remove('tfgLoginToken');
            if ($scope.display == 'mobile') {
                $("#loginModal").modal('show');
            } else if ($scope.display == 'desktop') {
                $("#logindialogcontainer").qtip("toggle", true);
            }
        });
    };

    $scope.openFilters = function() {
        $scope.filtersOpen = true;
        $('#filtersBox').slideDown(200);
    };

    $scope.closeFilters = function() {
        $scope.filtersOpen = false;
        $('#filtersBox').slideUp();
    };

    $scope.getSettingVisibility = function(tfsetting) {
        if (!tfsetting.mystatus.onit()) {
            var hidden = false;
            var i, setting;
            for (var i = 0; i<$scope.settingsList.length; i++) {
                setting = $scope.settingsList[i];
                if (setting.id == tfsetting.settingid) {
                    if (!setting.visible) return "hidden";
                }
            }
        }
        if ($scope.openTfSettings[tfsetting.key]) return "open"
        else return "closed";
    };

    $scope.getTfSettingDisplayMode = function(tfsetting) {
        return $scope.openTfSettings[tfsetting.key];
    };

    $scope.openTfSetting = function(tfsetting) {
        $scope.openTfSettings[tfsetting.key] = true;
    };

    $scope.closeTfSetting = function(tfsetting) {
        delete $scope.openTfSettings[tfsetting.key];
    };

    $scope.onSettingPictureSelect = function($files) {
        var pictureFile = $files[0];
        if ( typeof pictureFile == "undefined") {
            window.alert("Fichier impossible à récupérer");
            return;
        }
        if (pictureFile.type.indexOf('image') != 0) {
            window.alert("Avec un fichier image, ça passera mieux...");
            return;
        }

        if (window.FileReader) {
            var fileReader = new FileReader();
            fileReader.readAsDataURL(pictureFile);
            fileReader.onload = function(e) {
                $scope.$apply(function() {
                    $scope.currentUploadData = e.target.result;
                    $('#newSettingImg').attr('src', $scope.currentUploadData );
                    $scope.currentUploadFile = pictureFile;
                    $('#newSettingImgMessage').hide();
                });
            };
        }
    };

    $scope.clearImage = function() {
        $scope.currentUploadFile = null;
        $scope.currentUploadData = null;
        $('#newSettingImgMessage').show();
    };


    function timeSlide(days) {
        $scope.firstday = $scope.firstday + days * planningBuilderService.MS_IN_DAY;
        setLastDay();
        initPlanning();
    }

    $scope.showPrevious = function() {
        timeSlide(-1 * $scope.dayCount);
    };

    $scope.showNext = function() {
        timeSlide($scope.dayCount);
    };

    function loadConfig() {
        if (( typeof $scope.currentUser == "undefined") || ($scope.currentUser == null))
            return;
        var config = localStorageService.get('tfgconfig-' + $scope.currentUser);
        if (( typeof config == "undefined") || (config === '') || (config == null))
            return;
        $scope.config = config;
    }

    function storeConfig() {
        if ( typeof $scope.currentUser == "undefined")
            return;
        $scope.config.invisibleOpenSettings = [];
        $scope.config.visibleClosedSettings = [];
        $scope.config.invisibleOneShots = [];
        $scope.config.invisibleStatus = [];
        $scope.openSettings.forEach(function(item) {
            if (!item.visible)
                $scope.config.invisibleOpenSettings.push(item.id);
        });
        $scope.closedSettings.forEach(function(item) {
            if (item.visible)
                $scope.config.visibleClosedSettings.push(item.id);
        });
        /*
        $scope.oneShots.forEach(function(item) {
            if (!item.visible)
                $scope.config.invisibleOneShots.push(item.id);
        });        
        for (var i = 0; i < $scope.statusDesc.length; i++) {
            if (!$scope.statusDesc[i].visible)
                $scope.config.invisibleStatus.push(i);
        }
        */
        localStorageService.add('tfgconfig-' + $scope.currentUser, JSON.stringify($scope.config));
    }

    function reset() {
        $scope.tempUser = '';
        $scope.tempPassword = '';
        $scope.currentTimeframe = null;
        $scope.filtersOpen = false;
        $scope.timeframes = [];
        $scope.config = {
//            invisibleStatus : [],
            invisibleOpenSettings : [],
//            invisibleOneShots : [],
            visibleClosedSettings : [],
            lastUpdate : 0
        };
        $scope.gui = 'regular';
        $scope.openTfSettings = {};
        $scope.gamePicks = {};
        $scope.uploading = false;
        $scope.progress = 0;
        $scope.currentUploadFile = null;
        $scope.currentUploadData = null;
        $scope.currentEdit = {

        };
    }

    $scope.display = $('body').data('display');
    if ( typeof $scope.display == "undefined")
        $scope.display = "desktop";

    if ($scope.display == 'desktop') {

        $.fn.qtip.modal_zindex = 16000;
        $('#logindialogcontainer').qtip({
            style : {
                classes : 'popup loginpopup'
            },
            content : {
                text : $('#logindialog')
            },
            position : {
                my : 'center',
                at : 'center',
                target : $(window)
            },
            show : {
                autofocus : '#inputName',
                event : false,
                modal : {
                    on : true,
                    blur : false,
                    escape : false
                }
            },
            hide : false
        });

        $('#addsettingdialogcontainer').qtip({
            style : {
                classes : 'popup addsettingpopup'
            },
            content : {
                text : $('#addsettingdialog')
            },
            position : {
                my: 'center',
                at: 'center',
                target : $(window),
                adjust : { y : -100 }
            },
            show : {
                event : false,
                modal : {
                    on : true,
                    blur : true,
                    escape : true
                },
            },
            events: {
                visible: function (event, api) {
                    api.set('position.target', $(window));
                    api.reposition(event);
                },
                hide: function (event, api) {
                    $scope.newsetting.name = '';
                    $scope.newsetting.mode = -1;
                    $('#createSettingForm').hide();
                },
            },
            hide : false
        });

//        $('#planning').on('click', '.selectDayToggle', function(event) {
        $('#planning').on('click', '.selectDayToggle', function(event) {
            $(event.target).qtip({
                style : {
                    classes : 'popup'
                },
                content : {
                    text : $(event.target).closest('.multijournees').find('.selectDayDropdown')
                },
                position : {
                    my: 'top center', 
                    at: 'bottom center',
                    viewport: $(window),
                    target : $(event.target),
                    effect : false,
                    adjust : {
                        mouse: false,
                        method: 'flip shift'
                    }
                },
                overwrite: false,
                show : {
                    event : event.type,
                    ready: true
                },
                hide :  {
                    event : 'mouseleave',
                    fixed : true,
                    delay : 100
                },
                events: {
                    show: function (subevent, api) {
//                        api.reposition();
                    }
                }
        }); });
    }

    $scope.loading = false;
    $scope.basePicUrl = config.urlbase + "/setting/pic/";

    $scope.newsetting = {
        name : '',
        mode : -1,
        status : 0,
    };

    if ($scope.display == 'desktop') {
        $scope.dayCount = 42;
    } else if ($scope.display == 'mobile') {
        $scope.dayCount = 42;
    }

    $scope.firstday = planningBuilderService.getDefaultMinDay();
    setLastDay();
    
    $scope.timeframesNames = {
        "AFTERNOON" : "Après-midi",
        "EVENING" : "Soirée"
    };

/*
    $scope.settingsReady = false;

    $scope.tooltipLock = {
        mainlock : false
    };
    $scope.editingGame = false;
    $scope.editingComment = false;

*/
    $scope.loginMessage = "C'est qui ?";
//    $scope.currentEdit = {};
    reset();

//    $scope.refreshSettings(true);

}]);



