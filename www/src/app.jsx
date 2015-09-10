var GoCourseSort = require("gocoursesort"),
  $ = require("jquery")

window.cblog = require("./debug.jsx").Cblog

window.gocoursesort = new GoCourseSort("ws://catalog.mostate.io/websocket")

window.template = require("./template.jade")
