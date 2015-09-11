var GoCourseSort = require("./gocoursesort.js"),
  $ = require("jquery")

window.cblog = require("./debug.jsx").Cblog

window.gocoursesort = new GoCourseSort("ws://test.mostate.io:8080/websocket")

require("angular-route")

var catalogApp = angular.module('catalogApp', [
  'ngRoute'
]);

catalogApp.config( ($routeProvider) => {
  $routeProvider
  .when('/', {
    template: require("./view/index.jade")(),
  })
  .when('/courses', {
    template: require("./view/courses.jade")(),
    //controller: 'PhoneListCtrl'
  })
  .when('/search/:query', {
    template: require("./view/search.jade")(),
    controller: 'SearchCtrl'
  })
  .otherwise({
    redirectTo: '/courses'
  })
})
.controller('SearchCtrl', ($scope, $routeParams) => {
  $scope.query = $routeParams.query
  gocoursesort.ready(()=> {
    gocoursesort.search($routeParams.query, (error, results)=> {
      $scope.courses = results.Results
      console.log($scope.courses)
      $scope.$apply()
    })
  })
})
.controller('SearchBarCtrl', ($scope, $location) => {
  $scope.callSearch = (query) => {
    $location.url('/search/' + encodeURIComponent(query))
  }
})
.directive('searchBar', () => {
  return {
    restrict: 'A',
    template: require("./components/search-bar.jade")()
  }
})