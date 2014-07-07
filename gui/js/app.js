'use strict';

/* App Module */

var timeForGamesApp = angular.module('timeForGamesApp', ['LocalStorageModule', 'pasvaz.bindonce', 'angularFileUpload', 'ngAnimate', 'ngCacheBuster']);

timeForGamesApp.config(function ($httpProvider) {
        $httpProvider.interceptors.push('authInterceptor');
        delete $httpProvider.defaults.headers.common['X-Requested-With'];
    });

timeForGamesApp.config(['localStorageServiceProvider', 'httpRequestInterceptorCacheBusterProvider', function(localStorageServiceProvider, httpRequestInterceptorCacheBusterProvider){
  localStorageServiceProvider.setPrefix('tfgPrefix');
  httpRequestInterceptorCacheBusterProvider.setMatchlist([/^gui\/.*/,/\/setting\/pic\//]);
}]);

