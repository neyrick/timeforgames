'use strict';

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
    
	var admins = [];

        return {
        controller : function ($scope, $element, $attrs) {

            userService.getAdmins(function(result) {
                admins = result;
            }, function(error) {
                window.alert("Impossible d'identifier les membres du CA: " + error);
            });

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
                if (playerschedule.player == $scope.currentuser) return;
                if ($scope.timeframe.gaming[playerschedule.player]) return;
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
                if ($scope.gameTime.trim() == "") return false;
                if ($scope.storyName.trim() == "") return false;
                for (var player in $scope.gamePicks) {
                    if ($scope.gamePicks.hasOwnProperty(player)) {
                        return true;
                    }
                }
                return false;
            }

    	    $scope.validateGame = function() {
                if (!$scope.isGameValidable()) return;
        		if ( typeof $scope.timeframe.mygame == "undefined") {
        		    plannerService.validateGame(getMyScheduleId($scope.currentuser, $scope.tfsetting, 'GM'), $scope.gameTime, $scope.storyName, $scope.gamePicks, function() {
                           $scope.refreshTimeframe();
        		    });
        		} else {
        		    plannerService.reformGame($scope.timeframe.mygame.id, $scope.gameTime, $scope.storyName, $scope.gamePicks, function() {
                               $scope.refreshTimeframe();
        		    });
        		}
    	    };

            $scope.openGMMode = function() {
                $scope.displayMode = "validate";
    	        $scope.gamePicks = {};
		          if ( typeof $scope.timeframe.mygame != "undefined") {
		              $scope.timeframe.mygame.players.forEach(function(playerschedule) {
		                  $scope.gamePicks.push(playerschedule);
    		          });
		          }
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
                return (admins.indexOf(playername) > -1);
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
             currentuser : '='
        },
        link: function(scope, element, attrs) {
            scope.resetDisplayMode();
            scope.currentMessage = "";
            scope.currentCommentId = null;
            scope.gamePicks = {};
            scope.storyName = "";
            scope.gameTime = "";

            scope.switchComment = function(comment, event) {
                scope.currentMessage = comment.message;
                scope.currentCommentId = comment.id;
            };
        
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

/* Directives */
/*
timeForGamesApp.directive('ggTfSetting', function() {

    var templates = {
        desktop : 'directives/tfsetting.html',
        mobile : 'directives/tfsetting-mobile.html'
    };
    
    function initTfSetting($scope) {
        $scope.currentEdit.day = $scope.day;
        $scope.currentEdit.timeframe = $scope.timeframe;
        $scope.history.date = $scope.dowcodes[$scope.day.dow] + ' ' + $scope.day.dom + '/' + $scope.day.month;
        $scope.history.timeframe = $scope.timeframesDesc[$scope.timeframe.code].name;
        $scope.resetTfSettingData($scope.schedule);
    }
    

	return {
        controller : function ($scope, $element, $attrs) {
            $scope.triggerTfSettingTooltip = function(element) {
                if ($scope.display == 'desktop') {
                    if($scope.tooltipLock.mainlock === false) {
            		    $scope.$apply( function () {
            		        initTfSetting($scope);
            		    });
                	    var api =  $('#tfSettingTooltipContainer').qtip('api');
                	    api.set('position.target', $(element));
                	    api.reposition();
                	    api.show();
                    }
                }
                else if ($scope.display == 'mobile') {
                    initTfSetting($scope);
                    $( "#tfSettingModal" ).modal('show');
                }
            };
        },
		restrict: 'EA',
		templateUrl: function(element, attrs) { return templates[attrs.display]; },
		scope: true,
		link: function(scope, element, attrs) {
		        var classes = [];
		        classes.push('settingBadge');
		        classes.push('settingBadge-id-' + scope.schedule.settingid);
		        var mystatus = scope.schedule.mystatus;
		        if (mystatus.pj || mystatus.mj) {
		            classes.push('playBadge');
		        }
		        else if (mystatus.dispoPJ || mystatus.dispoMJ)  {
		            if (scope.schedule.hasgame) classes.push('noPlayBadge');
		            else classes.push('availableBadge');
		        }
			else classes.push('notAvailableBadge');
			if (scope.schedule.newStuff) {
			    classes.push('newStuff');
			}
            for (var i = 0; i < scope.settingsList.length; i++) {
                if (scope.settingsList[i].id == scope.schedule.settingid) {
                    if (!scope.settingsList[i].visible) classes.push('ggHidden');
                    break;
                }
            }
			scope.settingClasses = classes;

            if (scope.display == 'desktop') {
                $(element).find('.tfSetting').mouseenter(function (event) {
                    var $this = $(this);
                    $this.data('ggdelay', setTimeout( function () {
                        scope.triggerTfSettingTooltip(event.target);
                    }, 200));
                });
                $(element).find('.tfSetting').mouseleave(function (event) {
                    var $this = $(this);
                    clearTimeout($this.data('ggdelay'));                
                });
            }
            else if (scope.display == 'mobile') {
            }

		}
	};
});


timeForGamesApp.directive('ggTimeframeBox', function() {

    var templates = {
        desktop : 'directives/timeframebox.html',
        mobile : 'directives/timeframebox-mobile.html'
    };
    
	var timeframesDesc = {
			    "AFTERNOON": {"code":"AFTERNOON", pic:"images/aprem.png", name:"Après-midi"},
			    "EVENING": {"code":"EVENING", pic:"images/soir.png", name:"Soirée"},
			};
    
    function initAddSetting($scope) {
        $scope.currentEdit.day = $scope.day;
        $scope.currentEdit.timeframe = $scope.timeframe;
        delete $scope.currentEdit.schedule;
    }
    
	return {
        controller : function ($scope, $element, $attrs) {
			$scope.timeframesDesc = timeframesDesc;
            $scope.triggerExtraSettingTooltip = function(element) {
                if ($scope.display == 'desktop') {
                    if($scope.tooltipLock.mainlock === false) {
        	       	    $scope.$apply( function () {
        	       	        initAddSetting($scope);
                            var api =  $('#addSettingTooltipContainer').qtip('api');
                            api.set('position.target', $(element));
                            api.reposition();
                            api.show();
                        });
                    }
                }
                else if ($scope.display == 'mobile') {
                    initAddSetting($scope);
                    $( "#addSettingModal" ).modal('show');
                }              
            };
        },
		restrict: 'E',
        templateUrl: function(element, attrs) { 
            return templates[attrs.display];
             },
		scope: true,
		link: function(scope, element, attrs) {
            if (scope.display == 'desktop') {
    			$(element).find('.timeFramePic').qtip({
    				style: { classes: 'infoTooltip' },
    				content: { text: timeframesDesc[scope.timeframe.code].name },
    				position: {
    					my: 'bottom left',
    					at: 'top right'
    				},
    				show: {
    					event: 'mouseenter click',
    				},
    				hide: {
    					delay: 10,
    					event: 'mouseleave',
    				}
    			});
    			$(element).find('.tfExtra').mouseenter(function (event) {
    				var $this = $(this);
    				$this.data('ggdelay', setTimeout( function () {
    					scope.triggerExtraSettingTooltip(event.target);
    				}, 200));
    			});
    			$(element).find('.tfExtra').mouseleave(function (event) {
    				var $this = $(this);
    				clearTimeout($this.data('ggdelay'));				
    			});
    	   }
           else if (scope.display == 'mobile') {
    	   }
		}
	};
});

timeForGamesApp.directive('ggDayTab', function() {

	var dowcodes = { "0":"DIM","1":"LUN","2":"MAR","3":"MER","4":"JEU","5":"VEN","6":"SAM"};

    var templates = {
        desktop : 'directives/daytab.html',
        mobile : 'directives/daytab-mobile.html'
    };
    
	return {
		restrict: 'E',
        templateUrl: function(element, attrs) {
             return templates[attrs.display];
         },
		scope: true,
		link: function(scope, element, attrs) {
            scope.day = scope.$eval(attrs['day']);
			$(element).hover(function(event) {
				$(element).find(".datePanel").addClass("hoverDay");
			},
			function(event) {
				$(element).find(".datePanel").removeClass("hoverDay");
			});
			scope.dowcodes = dowcodes;
		}
	};
});

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
*/
