// GoCourseSort, written by Cole Lawrence
(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    module.exports = mod();
  else if (typeof define == "function" && define.amd) // AMD
    return define([], mod);
  else // Plain browser env
    this.GoCourseSort = mod();
})(function() {

function GoCourseSort (websocket_uri) {
  this.wss = null;
  this.ws_uri = websocket_uri;
  this._connectWebsocket();
  this.awaitingResponse = [];
}
GoCourseSort.prototype.search = function(src, callback) {
  this._send("?" + src, callback);
};
GoCourseSort.prototype.get = function(course_id, callback) {
  this._send("!" + course_id, callback);
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