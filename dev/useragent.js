const superagent = require('superagent')

superagent
    .get(`https://omahaproxy.appspot.com/win`)
    .end((err, res) => {
        console.log(res.text)
    })