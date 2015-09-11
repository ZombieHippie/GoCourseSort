var GoCourseSort = require("./gocoursesort.js"),
  $ = require("jquery")

window.cblog = require("./debug.jsx").Cblog

window.gocoursesort = new GoCourseSort("ws://test.mostate.io:8080/websocket")

require("angular-route")
require("angular-sanitize")

var catalogApp = angular.module('catalogApp', [
  'ngRoute', 'ngSanitize'
]);

require("./apply-colors.jsx")

catalogApp.config( ($routeProvider) => {
  $routeProvider
  .when('/', {
    template: require("./view/index.jade")(),
  })
  .when('/courses/:courseId', {
    template: require("./view/course.jade")(),
    controller: 'CourseViewCtrl'
  })
  .when('/courses', {
    template: require("./view/courses.jade")(),
    //controller: 'PhoneListCtrl'
  })
  .when('/department/:departmentId', {
    template: require("./view/courses.jade")(),
    //controller: 'PhoneListCtrl'
  })
  .when('/search/:query', {
    template: require("./view/search.jade")(),
    controller: 'SearchViewCtrl'
  })
  .otherwise({
    redirectTo: '/courses'
  })
})
.controller('SearchViewCtrl', ($scope) => {
  $scope.$on('$routeChangeSuccess', function (event, current, previous) {
    gocoursesort.ready(()=> {
      gocoursesort.search(current.pathParams.query, (error, results)=> {
        $scope.searchResults = results
        $scope.executionTimeSimplified = Math.ceil(results.ExecutionTime * 1E6) * 1E-6
        $scope.$apply()
      })
    })
  })
})
.controller('CourseViewCtrl', ($scope, $routeParams) => {
  $scope.$on('$routeChangeSuccess', function (event, current, previous) {
    $scope.courseId = current.pathParams.courseId
    gocoursesort.ready(()=> {
      gocoursesort.get($scope.courseId, (error, course)=> {
        $scope.error = error
        $scope.course = course
        $scope.$apply()
      })
    })
  });
})
.controller('SearchBarCtrl', ($scope, $location) => {
  $scope.$on('$routeChangeSuccess', function (event, current, previous) {
    if(current.pathParams.query)
      $scope.query = current.pathParams.query
  })
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
.directive('courseSmall', () => {
  require("./components/course-small.styl")
  return {
    restrict: 'C',
    scope: true,
    template: require("./components/course-small.jade")()
  }
})
.filter('linkc', () => {
  var course_id_re_g = /([A-Z]{3}) ?(\d{2,3})/g
  return function (input) {
    if (typeof input === "string" && input.replace != null)
      return input.replace(course_id_re_g, "<a href=\"#courses/$1$2\" data-linkc>$1 $2</a>")
  }
})