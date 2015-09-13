var $ = require("jquery")

export default ($compile, $rootScope, $location) => {

  var hoverElementScope = $rootScope.$new(true)
  var hoverElement = (function () {
    var hoverCourse = document.createElement("DIV")
    hoverCourse.id = "hover-info"
    document.body.appendChild(hoverCourse);
    hoverCourse.style.position = "fixed"
    hoverCourse.style.top = 0
    hoverCourse.style.left = 0
    hoverCourse.style.pointerEvents = "none"
    hoverCourse.innerHTML = require("./components/course-small.jade")()
    return hoverCourse
  }());

  $compile(hoverElement)(hoverElementScope)
  var lastHoverId = null
  var HoverInfo = {
    updateHoverInfo: (courseId, done) => {
      lastHoverId = courseId
      gocoursesort.get(courseId, (error, info) => {
        if (error != null) {
          console.error(error)
          info = { Id: courseId }
        }
        hoverElementScope.course = info
        hoverElement.className = "show"
        hoverElementScope.$apply()
        // add color
        if (info.Link)
          $(hoverElement).find(">div").addClass(info.Link + "_bgl025")
        if (typeof done === "function")
          done()
      })
    },
    closeHoverInfo: () => {
      hoverElement.className = ""
    },
    moveHoverInfo: (x, y) => {
      var target = hoverElement
      // ensure that most of #hover-info is going to be in the window
      if (document.body.offsetHeight < y + target.offsetHeight)
        y = document.body.offsetHeight - target.offsetHeight
      if (document.body.offsetWidth < x + target.offsetWidth)
        x = document.body.offsetWidth - target.offsetWidth
      target.style.webkitTransform =
      target.style.transform =
        'translate(' + x + 'px, ' + y + 'px)'
    }
  }
  // set up events
  // Hover Info set-up
  $("body").on("mousemove", "[data-link]", function (event) {
    if (this.dataset.link !== lastHoverId) {
      HoverInfo.updateHoverInfo(this.dataset.link, function () {
        HoverInfo.moveHoverInfo(event.clientX + 10, event.clientY + 10)
      })
    } else {
      hoverElement.className = "show"
    }
  })
  // set up events
  // Hover Info set-up
  $("#search-output").on("mouseenter", "li[data-link-course-id]", function () {
    HoverInfo.updateHoverInfo(this.dataset.linkCourseId)
  })
  $("body").on("mousemove", "[data-link]", (event) => {
    HoverInfo.moveHoverInfo(event.clientX + 10, event.clientY + 10)
    event.stopPropagation()
  })
  $("html").on("mousemove", () => {
    HoverInfo.closeHoverInfo()
  })

  return HoverInfo
}