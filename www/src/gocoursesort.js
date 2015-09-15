// GoCourseSort, written by Cole Lawrence
// depends on browser-store, and caolan/async
(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    module.exports = mod(require("browser-store"), require("async"));
  else if (typeof define == "function" && define.amd) // AMD
    return define(["browser-store", "async"], mod);
  else // Plain browser env
    this.GoCourseSort = mod(this.BrowserStore, this.async);
})(function(BrowserStore, async) {

// interpret server data
function CourseEntry (o) {
  if (o == null) { o = { O:{}, H:{}} }
  this.Id = o.I
  this.Title = o.T
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

function _DatabaseResultsConverter (callback) {
  return function (error, res) {
    var newRes = {}
    for (var key in res) {
      newRes[key] = res[key]
    }
    newRes.Results = new Array(res.Results.length)
    if (error != null) callback(error)
    else {
      for (var i = 0; i < newRes.Results.length; i++) {
        newRes.Results[i] = new CourseEntry(res.Results[i])
      }
      callback(null, newRes)
    }
  }
}

function logError (error) {
  if (error != null)
    console.error(error)
}
window.logError = logError

function GoCourseSort (websocket_uri) {
  this.wss = null;
  this.ws_uri = websocket_uri;
  this._connectWebsocket();
  this.awaitingResponse = [];
  this._readyCallbacks = [];
  this.isReady = false;
  this.cache = BrowserStore;
}

GoCourseSort.prototype.ready = function(callback) {
  if (this.isReady) callback()
  else this._readyCallbacks.push(callback)
}

GoCourseSort.prototype.search = function(src, callback) {
  this._send("?" + src, new _DatabaseResultsConverter(callback));
};
GoCourseSort.prototype.get = function(course_id, callback) {
  // get course id out of cache
  var self = this
  this.cache.get(course_id, function (error, courseData) {
    // if courseData != null, then respond with course
    if (courseData != null) callback(null, new CourseEntry(courseData))
    // else, then get value from ws, and set to cache
    else
      self._send("!" + course_id, function (error, courseData) {
        if (error != null) return callback(error)
        if (!courseData.I) return callback(courseData)
        var courseResult = new CourseEntry(courseData)
        self.cache.put(courseResult.Id, courseData, logError)
        callback(null, courseResult)
      })
  })
};
GoCourseSort.prototype.getAll = function(course_ids, callback) {
  var converter = new _DatabaseResultsConverter(callback)
  // get course id out of cache
  var cachedCourseDatas = {}
  var notCachedIds = {}
  var self = this
  async.each(
    course_ids,
    function (course_id, done) {
      self.cache.get(course_id, function (error, courseData) {
        if (error != null) return done(error);
        if (courseData != null)
          cachedCourseDatas[course_id] = courseData
        else notCachedIds[course_id] = null
        done()
      })
    },
    function (error) {
      if (error != null) return converter(error);
      var databaseResultsCallback = function (error, results) {
        if (error != null) return converter(error);
        var newResults = []
        for (var j = 0; j < results.Results.length; j++) {
          notCachedIds[results.Results[j].I] = results.Results[j]
        }
        // now we have cached and retrieved entries
        for (var i = 0, course_id; i < course_ids.length; i++) {
          course_id = course_ids[i]
          if (typeof notCachedIds[course_id] !== "undefined") newResults.push(notCachedIds[course_id])
          else newResults.push(cachedCourseDatas[course_id])
        }
        results.Results = newResults
        results.TotalResults += Object.keys(cachedCourseDatas).length
        converter(null, results)
        // cache results
        async.each(
          results.Results,
          function (courseData, done) {
            self.cache.put(courseData.I,courseData,done)
          },
          logError
        )
      }
      if (Object.keys(notCachedIds).length > 0)
        self._send("&" + Object.keys(notCachedIds).join(";"), databaseResultsCallback)
      else {
        var spoofDatabaseResult = { ExecutionTime: 0, Results: [], TotalResults: 0 }
        setTimeout(databaseResultsCallback, 0, null, spoofDatabaseResult)
      }
    }
  )
};
GoCourseSort.prototype.searchExact = function(src, callback) {
  this._send("=" + src, new _DatabaseResultsConverter(callback));
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
  self.wss.onopen = function () {
    self.isReady = true;
    while(self._readyCallbacks.length > 0) {
       self._readyCallbacks.pop()();
    }
  }
  self.wss.onmessage = function (messageEvent) {
    var data = JSON.parse(messageEvent.data);
    // respond to latest request
    // possible to get things out of order, but highly unlikely
    self._respond(null, data);
  }
  self.wss.onclose = function () {
    self.wss = null;
    this.isReady = false;
    setTimeout(self._connectWebsocket(), 2000);
  }
};

return GoCourseSort;

})
