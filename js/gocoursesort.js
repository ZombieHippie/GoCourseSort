// GoCourseSort, written by Cole Lawrence
(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    module.exports = mod();
  else if (typeof define == "function" && define.amd) // AMD
    return define([], mod);
  else // Plain browser env
    this.GoCourseSort = mod();
})(function() {

// interpret server data
function CourseEntry (o) {
  if (o == null) { o = { O:{}, H:{}} }
  this.Id = o.I
  this.Desc = o.D
  this.Prereqs = o.P
  this.Link = o.L
  this.Offered = {
    Fall: o.O.F,
    Spring: o.O.S,
    Summer: o.O.M,
  }
  this.Hours = {
    Credit: o.H.C,
    Lecture: o.H.E,
    Lab: o.H.L,
  }
}

function GoCourseSort (websocket_uri) {
  this.wss = null;
  this.ws_uri = websocket_uri;
  this._connectWebsocket();
  this.awaitingResponse = [];
}

function _DatabaseResultsConverter (callback) {
  return function (error, res) {
    if (error != null) callback(error)
    else {
      for (var i = 0; i < res.Results.length; i++) {
        res.Results[i] = new CourseEntry(res.Results[i])
      }
      callback(null, res)
    }
  }
}
function _CourseConverter (callback) {
  return function (error, course) {
    if (error != null) callback(error)
    else callback(null, new CourseEntry(course))
  }
}

GoCourseSort.prototype.search = function(src, callback) {
  this._send("?" + src, new _DatabaseResultsConverter(callback));
};
GoCourseSort.prototype.get = function(course_id, callback) {
  this._send("!" + course_id, new _CourseConverter(callback));
};
GoCourseSort.prototype.searchExact = function(src, callback) {
  this._send("=" + src, new _DatabaseResultsConverter(callback));
};
GoCourseSort.prototype.getAll = function(course_ids, callback) {
  this._send("&" + course_ids.join(";"), new _DatabaseResultsConverter(callback));
};
GoCourseSort.prototype.getLink = function(link, callback) {
  this._send("L" + link, new _DatabaseResultsConverter(callback));
};
GoCourseSort.prototype.getDept = function(dept, callback) {
  this._send("D" + dept, new _DatabaseResultsConverter(callback));
};
GoCourseSort.prototype._send = function(message, callback) {
  var self = this;
  if (self.wss != null && typeof(self.wss.send) === "function") {
    self.wss.send(message);
    self.awaitingResponse.push(callback);
  } else {
    callback(new Error("Websocket Connection not established"));
  }
};
GoCourseSort.prototype._respond = function(error, data) {
  this.awaitingResponse.shift()(error, data);
};
GoCourseSort.prototype._connectWebsocket = function () {
  var self = this;
  self.wss = new window.WebSocket(self.ws_uri);
  self.wss.onopen = function () { console.log("opened websocket") }
  self.wss.onmessage = function (messageEvent) {
    var data = JSON.parse(messageEvent.data);
    // respond to latest request
    // possible to get things out of order, but highly unlikely
    self._respond(null, data);
  }
  self.wss.onclose = function () {
    self.wss = null;
    setTimeout(self._connectWebsocket(), 2000);
  }
};

return GoCourseSort;

})