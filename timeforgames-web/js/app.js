'use strict';

/* App Module */

var timeForGamesApp = angular.module('timeForGamesApp', ['LocalStorageModule', 'pasvaz.bindonce', 'angularFileUpload']);

timeForGamesApp.config(function ($httpProvider) {
        $httpProvider.interceptors.push('authInterceptor');
        delete $httpProvider.defaults.headers.common['X-Requested-With'];
    });

timeForGamesApp.config(['localStorageServiceProvider', function(localStorageServiceProvider){
  localStorageServiceProvider.setPrefix('tfgPrefix');
}]);

