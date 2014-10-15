'use strict';

timeForGamesApp.directive('ggHistory', function() {
    var roles = { GM : "maîtriser", PLAYER : "jouer" };
    return {
        restrict: 'E',
        templateUrl: 'directives/history.html',
        scope: { row : '=' },
        link: function(scope, element, attrs) {
            scope.tstamp = scope.row.tstamp;
            scope.dayid = scope.row.dayid;
            scope.timeframe = scope.row.timeframe;
            scope.setting = scope.row.setting;
            scope.player = scope.row.player;
            scope.data = scope.row.data;
            scope.action = scope.row.action;
            scope.roles = roles;
        }
    };
});

timeForGamesApp.directive('timeframesGroup', [ function() {

        return {
        controller : function ($scope, $element, $attrs) {
            $scope.selectSetting = function(subtf) {
                $scope.$parent.selectSetting(subtf);
            };

            $scope.timeframesNames = $scope.$parent.timeframesNames;
        },
        restrict: 'E',
        templateUrl: 'directives/timeframesgroup.html',
        replace: true,
        scope: {
             timeframe : '=',
        },
        link: function(scope, element, attrs) {

		    $(element).qtip({
		        style : {
		            classes : 'popup'
		        },
		        content : {
		            text : $(element).find('.selectDayDropdown')
		        },
		        position : {
		            my: 'top center', 
		            at: 'bottom center',
		            viewport: $(window),
		            target : 'mouse',
		            effect : false,
		            adjust : {
		                mouse: false,
		                method: 'flip shift'
		            }
		        },
		        overwrite: false,
		        show : {
		            event : 'click',
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
		});

        }
    };
}]);

timeForGamesApp.directive('openTfSetting', ['config', 'plannerService', 'userService', function(config, plannerService, userService) {
    
        return {
        controller : function ($scope, $element, $attrs) {
/*
            userService.getAdmins(function(result) {
                admins = result;
            }, function(error) {
                window.alert("Impossible d'identifier les membres du CA: " + error);
            });
*/
            $scope.basePicUrl = config.urlbase + "/setting/pic/";
            $scope.getSettingPicUrl = function(settingid) {
                return $scope.basePicUrl + settingid;
            };

            $scope.close = function() {
                $scope.$parent.closeTfSetting($scope.tfsetting);
            };

            $scope.setDispo = function(role) {
                plannerService.setDispo($scope.timeframe.dayid, $scope.timeframe.code, $scope.tfsetting.settingid, role, function() {
                       $scope.refreshTimeframe();
                });
            };

            $scope.clearDispo = function(role) {
                plannerService.clearDispo(getMyScheduleId($scope.currentuser, $scope.tfsetting, role), function() {
                       $scope.refreshTimeframe();
                });
            };

            $scope.togglePlayerSelection = function(playerschedule) {
                if ($scope.isPlayerSelected(playerschedule.player)) {
                    delete $scope.gamePicks[playerschedule.player];
                }
                else {
                    $scope.gamePicks[playerschedule.player] = playerschedule;
                }
            };

            $scope.isPlayerSelected = function(player) {
                return (typeof $scope.gamePicks[player] != "undefined");
            };

    	    $scope.disbandGame = function() {
    		   plannerService.disbandGame(getMyGMScheduleId($scope.currentuser, $scope.tfsetting.games), function() {
                       $scope.refreshTimeframe();
    	   	   });
    	    };
    
    	    $scope.dropGame = function() {
        		plannerService.dropGame(getMyPlayerScheduleId($scope.currentuser, $scope.tfsetting.games), function() {
                       $scope.refreshTimeframe();
        		});
    	    };
    
            $scope.isGameValidable = function() {
                if ($scope.gameData.gameTime.trim() == "") return false;
                if ($scope.gameData.storyName.trim() == "") return false;
                for (var player in $scope.gamePicks) {
                    if ($scope.gamePicks.hasOwnProperty(player)) {
                        return true;
                    }
                }
                return false;
            };

    	    $scope.validateGame = function() {
                if (!$scope.isGameValidable()) return;
        		if ( typeof $scope.timeframe.mygame == "undefined") {
        		    plannerService.validateGame(getMyScheduleId($scope.currentuser, $scope.tfsetting, 'GM'), $scope.gameData.gameTime, $scope.gameData.storyName, $scope.gamePicks, function() {
                           $scope.refreshTimeframe();
        		    });
        		} else {
        		    plannerService.reformGame($scope.timeframe.mygame.id, $scope.gameData.gameTime, $scope.gameData.storyName, $scope.gamePicks, function() {
                               $scope.refreshTimeframe();
        		    });
        		}
    	    };

            $scope.openGMMode = function() {
                $scope.displayMode = "validate";
    	        $scope.gamePicks = {};
                $scope.playerspool.length = 0;
                $scope.gmspool.length = 0;
		          if ( typeof $scope.timeframe.mygame != "undefined") {
		              $scope.timeframe.mygame.players.forEach(function(playerschedule) {
                          $scope.playerspool.push(playerschedule);
		                  $scope.gamePicks[playerschedule.player] = playerschedule;
    		          });
    		          $scope.gameData.storyName = $scope.timeframe.mygame.storyName;
    		          $scope.gameData.gameTime = $scope.timeframe.mygame.gameTime;
                      $scope.gmspool.push($scope.timeframe.mygame.gm);
		          }
		          else {
		              $scope.tfsetting.availableplayers.forEach(function (playerschedule) {
                          if ((!$scope.othergames[playerschedule.player]) && (playerschedule.player != $scope.currentuser)) $scope.gamePicks[playerschedule.player] = playerschedule;
                      });
		          }
		         $scope.tfsetting.availablegms.forEach(function (gmschedule) {
		              $scope.gmspool.push(gmschedule);
		         });
                 $scope.tfsetting.availableplayers.forEach(function (playerschedule) {
                      if (playerschedule.player == $scope.currentuser) return;
                      if ($scope.othergames[playerschedule.player]) return;
                      $scope.playerspool.push(playerschedule);
                 });
            };
        
            $scope.cancelGMMode = function() {
                $scope.resetDisplayMode();
            };
        
            $scope.resetDisplayMode = function() {
                if ($scope.tfsetting.hasgame) {
                    $scope.displayMode = "game";               
                }
                else {
                    $scope.displayMode = "prepare";               
                }
            };
 
            $scope.isAdmin = function(playername) {
                return ($scope.admins.indexOf(playername) > -1);
            };

            $scope.storeComment = function() {
                if ($scope.currentMessage == "") return;
                plannerService.addComment($scope.timeframe.dayid, $scope.timeframe.code, $scope.tfsetting.settingid, $scope.currentMessage, function() {
                    $scope.refreshTimeframe();
                });
            };

            $scope.refreshTimeframe = function() {
                $scope.$parent.refreshTimeframe($scope.timeframe);
            };
        },
        restrict: 'E',
        templateUrl: 'directives/opentfsetting.html',
        scope: {
             timeframe : '=',
             tfsetting : '=',
             currentuser : '=',
             admins: '='
        },
        link: function(scope, element, attrs) {
            scope.resetDisplayMode();
            scope.currentMessage = "";
            scope.currentCommentId = null;
            scope.gamePicks = {};
            scope.gameData = { storyName : "", gameTime : "" };
            scope.playerspool = [];
            scope.gmspool = [];
            
            scope.othergames = {};
            for (var player in scope.timeframe.gaming) {
                if (scope.timeframe.gaming[player] != scope.tfsetting.name) {
                    scope.othergames[player] = scope.timeframe.gaming[player];
                } 
            }

            scope.switchComment = function(comment, event) {
                scope.currentMessage = comment.message;
                scope.currentCommentId = comment.id;
            };

            $(element).on('mouseover', ':not([playing=""])', function(event) {
                // Bind the qTip within the event handler
                $(this).qtip({
                    overwrite: false, // Make sure the tooltip won't be overridden once created
                    style : {
                        classes : 'playingTooltip'
                    },
                    content: {
                        attr : 'playing'
                    },
                    position : {
                        my : 'top center',
                        at : 'bottom center'
                    },
                    show: {
                        event: event.type, // Use the same show event as the one that triggered the event handler
                        ready: true // Show the tooltip as soon as it's bound, vital so it shows up the first time you hover!
                    },
                }, event); // Pass through our original event to qTip
            });
        
        }
    };
}]);

timeForGamesApp.directive('watchFlag', ['watchService', function(watchService) {

    function getTooltip(level) {
        if (level == 1 ) return "Être averti lorsqu'un MJ pose des dates";
        else if (level == 2 ) return "Être averti de n'importe quelle action";
        else return "Ne recevoir aucune notification";
    }

    return {
        controller : function ($scope, $element, $attrs) {
        },
        restrict: 'E',
        templateUrl: 'directives/watch.html',
        replace: true,
        scope: {
             level : '=',
             setting : '=',
        },
        link: function(scope, element, attrs) {
             if (typeof scope.level == "undefined") scope.level = 0;
             scope.toggleWatch = function($event) {
                 if ((scope.level == 0) || (scope.level == 1)) {
                     scope.level = scope.level+1;
                     watchService.setWatch(scope.level, scope.setting, function() {}, function(error) { window.alert(error); });
                 }
                 else {
                     scope.level = 0;
                     watchService.clearWatch(scope.setting, function() {}, function() {});
                 }
                 $(element).qtip('option', 'content.text', getTooltip(scope.level));
                 $event.stopPropagation();
             };
             $(element).qtip({
                    style : {
                        classes : 'infoTooltip'
                    },
                    content : {
                        text : function(event, api) {
                            return getTooltip(scope.level);
                        }
                    },
                    position : {
                        my : 'bottom left',
                        at : 'top right'
                    },
                    show : {
                        event : 'mouseenter click',
                    },
                    hide : {
                        delay : 5,
                        event : 'mouseleave',
                    }
                });
        }
    };
}]);

timeForGamesApp.directive('commentBox', ['plannerService', function(plannerService) {
    
        return {
        controller : function ($scope, $element, $attrs) {
            $scope.newmessage = "";
        },
        restrict: 'E',
        templateUrl: 'directives/commentbox.html',
        replace: true,
        scope: {
             comment : '=',
             reader : '=',
             timeframe : '=',
             setting : '='
        },
        link: function(scope, element, attrs) {
            scope.editing = false;
            scope.newmessage = scope.comment.message;
            scope.startEdit = function() {
                scope.editing = true;
            };
            scope.cancelEdit = function() {
                scope.editing = false;
                scope.newmessage = scope.comment.message;
            };

            scope.deleteComment = function() {
                plannerService.deleteComment(scope.comment.id, function() {
                    scope.$parent.refreshTimeframe();
                });
            };
        
            scope.storeComment = function() {
                if (scope.newmessage == "") return;
                plannerService.editComment(scope.timeframe.dayid, scope.timeframe.code, scope.setting, scope.comment.id, scope.newmessage, function() {
                    scope.$parent.refreshTimeframe();
                });
            };
        }
    };
}]);

