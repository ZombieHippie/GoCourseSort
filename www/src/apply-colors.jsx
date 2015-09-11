// this file reads data from data/course-links.js and data/colors.js
// to generate the stylesheet that color codes different courses
var colors = require("./data/colors.js").colors
var courseLinks = require("./data/course-links.js").courseLinks
var rgbRe = /(\d+)\/(\d+)\/(\d+)/
var mapColorToLink = {}
for (var i = 0, m; i < colors.length; i++) {
  mapColorToLink[colors[i]] = []
}
console.log(mapColorToLink)
for (var j = 0; j < courseLinks.length; j++) {
  mapColorToLink[colors[j % colors.length]].push(courseLinks[j])
}
var colorstyles = ""
for (var color in mapColorToLink) {
  colorstyles += `
${mapColorToLink[color].map((val)=> "." + val + "_bc").join(", ")} {
  border-color: ${color.replace(rgbRe, "rgba($1, $2, $3, 1)")} !important;
}${mapColorToLink[color].map((val)=> "." + val + "_bg").join(", ")} {
background-color: ${color.replace(rgbRe, "rgba($1, $2, $3, 1)")} !important;
}${mapColorToLink[color].map((val)=> "." + val + "_bg05").join(", ")} {
background-color: ${color.replace(rgbRe, "rgba($1, $2, $3, .5)")} !important;
}${mapColorToLink[color].map((val)=> "." + val + "_bg025").join(", ")} {
background-color: ${color.replace(rgbRe, "rgba($1, $2, $3, .25)")} !important;
}${mapColorToLink[color].map((val)=> "." + val + "_bgd").join(", ")} {
background-color: ${color.replace(rgbRe, (match, r, g, b) => {
  return `rgba(${Math.max(parseInt(r) - 40, 0)}, ${Math.max(parseInt(g) - 40, 0)}, ${Math.max(parseInt(b) - 40,0)}, 1)`
})} !important;
}${mapColorToLink[color].map((val)=> "." + val + "_cd").join(", ")} {
color: ${color.replace(rgbRe, (match, r, g, b) => {
  return `rgba(${Math.max(parseInt(r) - 40, 0)}, ${Math.max(parseInt(g) - 40, 0)}, ${Math.max(parseInt(b) - 40,0)}, 1)`
})} !important;
}${mapColorToLink[color].map((val)=> "." + val + "_c").join(", ")} {
color: ${color.replace(rgbRe, "rgba($1, $2, $3, 1)")} !important;
}`
}
var colorStyleElem = document.createElement("STYLE")
colorStyleElem.innerHTML = colorstyles
document.getElementsByTagName("head")[0].appendChild(colorStyleElem)
