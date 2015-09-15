var GoCourseSort = require("./gocoursesort.js"),
  $ = require("jquery")

window.cblog = require("./debug.jsx").Cblog

var appconfig = require("../appconfig.js")


window.gocoursesort = new GoCourseSort(appconfig.websocket_uri)

require("angular-route")
require("angular-sanitize")

var catalogApp = angular.module('catalogApp', [
  'ngRoute', 'ngSanitize'
]);

require("./apply-colors.jsx")
var course_id_re_g = /([A-Z]{3}) ?(\d{2,3})/g

catalogApp.config( ($routeProvider) => {
  $routeProvider
  .when('/', {
    template: require("./view/index.jade")(),
  })
  .when('/courses/:courseId', {
    template: require("./view/course.jade")(),
    controller: 'CourseViewCtrl'
  })
  .when('/department/:departmentId', {
    template: require("./view/department.jade")(),
    controller: 'DepartmentViewCtrl'
  })
  .when('/department/:departmentId/:courseNum', {
    template: require("./view/department.jade")(),
    controller: 'DepartmentViewCtrl'
  })
  .when('/search/:query', {
    template: require("./view/search.jade")(),
    controller: 'SearchViewCtrl'
  })
  .otherwise({
    redirectTo: '/'
  })
})
.controller('SearchViewCtrl', ($scope, HoverInfo) => {
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
.controller('CourseViewCtrl', ($scope, $routeParams, HoverInfo) => {
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
.controller('DepartmentViewCtrl', ($scope, $routeParams, HoverInfo) => {
  $scope.$on('$routeChangeSuccess', function (event, current, previous) {
    $scope.departmentId = current.pathParams.departmentId
    $scope.courseNum = current.pathParams.courseNum
    var getCourseLevel = (courseId) => {
      var num = /\d+/.exec(courseId)[0]
      return parseInt(num)
    }
    gocoursesort.ready(()=> {
      gocoursesort.getDept($scope.departmentId, (error, results)=> {
        $scope.error = error
        var dept = {
          CourseLevels: [],
          CoursesByLevel: {}
        }
        var sortedCourses = results.Results.sort((a, b) => getCourseLevel(a.Id) - getCourseLevel(b.Id))
        for (var i = 0, level; i < sortedCourses.length; i++) {
          level = Math.floor(getCourseLevel(sortedCourses[i].Id) / 100)
          if (dept.CoursesByLevel[level] == null) {
            dept.CourseLevels.push(level)
            dept.CoursesByLevel[level] = []
          }
          dept.CoursesByLevel[level].push(sortedCourses[i])
        }
        dept.CourseLevels = dept.CourseLevels.sort()
        $scope.department = dept
        $scope.$apply()
        
        // put header divisions in
        if ($scope.courseNum) {
          // scroll to course
          var targetCourseElem = $(".id-" + current.pathParams.departmentId + current.pathParams.courseNum)
          $(window).scrollTop(targetCourseElem.offset().top - 80)
          gocoursesort.get($scope.departmentId + $scope.courseNum, (error, course) => {
            if (course != null)
              targetCourseElem.find(">div").addClass(course.Link + "_bg025")
          })
        }
      })
    })
  })
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
.factory('HoverInfo', require("./hover-info.jsx"))

.directive('linkTo', function ($location) {
  return {
    restrict: 'A',
    link: function linkDataLink (scope, element, attrs) {
      var courseInfo = course_id_re_g.exec(scope.$eval(attrs.linkTo))
      element.on("click", () => {
        $location.url('/department/' + courseInfo[1] + '/' + courseInfo[2])
        scope.$apply()
      })
    }
  }
})
// borrowed from http://stackoverflow.com/a/17426614/2096729
.directive('linkCourses', ['$compile', function ($compile) {
  return {
    restrict: 'A',
    link: function linkCoursesLink (scope, element, attrs) {
      element = element[0]
      scope.$watch(attrs.linkCourses, (value) => {
        // when the 'compile' expression changes
        // assign it into the current DOM
        if (typeof value === "string" && value.replace != null) {
          value = value.replace(course_id_re_g, "<a href=\"#/department/$1/$2\" data-link=\"$1$2\">$1 $2</a>")
          element.innerHTML = value

          // compile the new DOM and link it to the current
          // scope.
          // NOTE: we only compile .childNodes so that
          // we don't get into infinite loop compiling ourselves
          $compile(element.childNodes)(scope)
        }
      })
    }
  }
}])