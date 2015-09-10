// debug helpers
module.exports = {
  Cblog: function (error, res) {
    if (error) console.error(error)
    else {
      console.log(res)
      if (res != null && res.Results != null && res.Results.length > 0) {
        for (var i = 0; i < res.Results.length; i++) {
          console.log(i,res.Results[i])
        }
      }
    }
  }
}