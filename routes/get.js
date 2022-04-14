const express = require('express')
const qs = require('qs')
const router = express.Router()
const axios = require('axios').default

router.post('/paper', (req, resApp) => {
    // console.log(req.body)

    axios({
        method: 'POST',
        url: 'https://sci-hub.se/',
        // url: 'https://sci-hub.ru/', // dev testing
        data: qs.stringify({'request': `${req.body.query}`}),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cache-Control': 'no-cache',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Host': 'sci-hub.se',
            'Referer': 'https://sci-hub.se/',
            'Origin': 'https://sci-hub.se'
        }
    })
        .then((res) => {
            let matching = (res.data.match(/src="(.*?)" id = "pdf"/)[1].trim().replace('//', 'https://').replace('"', '')).includes('sci-hub') ? res.data.match(/src="(.*?)" id = "pdf"/)[1].trim().replace('//', 'https://').replace('"', '') : `https://sci-hub.se${res.data.match(/src="(.*?)" id = "pdf"/)[1].trim().replace('//', 'https://').replace('"', '')}`
            resApp.send(matching)
            // console.log(res.status)
            // console.log(res.headers)
            // console.log(res.statusText)
        })
        .catch((err) => {
            console.error(err)
        })
})


router.post('/book', (req, resApp) => {
    resApp.send('200 ok')
})
router.post('/media', (req, resApp) => {
    resApp.send('200 ok')
})

module.exports = router