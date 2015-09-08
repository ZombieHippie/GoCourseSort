(function () {

var head = document.getElementsByTagName("head")[0]
var style = document.createElement("STYLE")
style.innerHTML = "body{margin:2em;width:400px}"
head.appendChild(style)

var goCourseSort = new GoCourseSort("ws://" + window.location.host + "/websocket")

var outputElem = document.getElementById("output")

document.getElementById("searchGoCourseSort")
.addEventListener("submit", function (event) {
  var searchSrc = this.searchCourses.value;
  goCourseSort.search(searchSrc, function (error, data) {
    if (error) console.error(error);
    else {
      console.log("Search '" + searchSrc + "':", data)
      var newOutput = "";
      for (var i = 0; i < data.Results.length; i++) {
        newOutput += "<div>" + data.Results[i].T + "</div>"
      };
      newOutput += "<br><i>Total Results: " + data.TotalResults + "    Execution Time: " + (Math.ceil(data.ExecutionTime * 1E4) / 1E4) + "s</i></div>";
      outputElem.innerHTML = newOutput;
    }
  })
  event.preventDefault()
  return false
})
}());