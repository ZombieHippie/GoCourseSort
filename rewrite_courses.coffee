fs = require "fs"

datalinkRE = /<span data-link='[A-Z]{3}\d{2,3}'>([A-Z]{3} ?\d{2,3})<\/span>/g
stripDataLinks = (str) ->
  return if str? then str.replace(datalinkRE, "$1")  else ""

transformCourse = (value) ->
  ### value = { "course_id": "CSC320",
  "title": "CSC 320 Computer Architecture",
  "req": "<em>Prerequisite: <span data-link='CSC131'>CSC 131</span>.</em>",
  "desc": "Introduction to the architecture and internal operation of computers, including assembly language. A study of the major components, functional organization, and sequential operation of digital computers during program execution. Several computer architectures will be studied. ",
  "hours": {
    "credit": 4,
    "lecture": 4 },
  "offered": {
    "Fall": true,
    "Spring": true } } ###
  ### alt = { Id: value.course_id
    Title: value.title
    Desc: value.desc
    Prereqs: value.req
    Link: "#{fname[...-5]}/#{value.course_id}"
    Offered: {
      Fall: !!value.offered.Fall
      Spring: !!value.offered.Spring
      Summer: !!value.offered.Summer }
    Hours: {
      Credit: value.hours.credit || 0
      Lecture: value.hours.lecture || 0
      Lab: value.hours.lab || 0 } } ###
  return {
    I: value.course_id
    T: value.title
    D: stripDataLinks(value.desc)
    P: stripDataLinks(value.req)
    L: "#{fname[...-5]}"
    O: {
      F: !!value.offered.Fall
      S: !!value.offered.Spring
      M: !!value.offered.Summer
    }
    H: {
      C: value.hours.credit || 0
      E: value.hours.lecture || 0
      L: value.hours.lab || 0
    }
  }

for fname in fs.readdirSync("catalog_pages")
  JSONStream = ""
  courses = JSON.parse String fs.readFileSync "catalog_pages/#{fname}"
  for _, value of courses
    obj = transformCourse(value)
    JSONStream += JSON.stringify(obj) + "\n"
  fs.writeFileSync("new_catalog_pages/#{fname}", JSONStream)