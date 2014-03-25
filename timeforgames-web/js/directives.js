'use strict';

/* Directives */

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

