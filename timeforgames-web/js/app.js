'use strict';

/* App Module */

var timeForGamesApp = angular.module('timeForGamesApp', ['LocalStorageModule', 'pasvaz.bindonce']);

timeForGamesApp.config(function ($httpProvider) {
        delete $httpProvider.defaults.headers.common['X-Requested-With'];
    });

timeForGamesApp.config(['localStorageServiceProvider', function(localStorageServiceProvider){
  localStorageServiceProvider.setPrefix('tfgPrefix');
}]);
