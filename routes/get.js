const express = require('express')
const qs = require('qs')
const router = express.Router()
const axios = require('axios').default
const cheerio = require('cheerio')
const redis = require('redis')
var cache;
(async () => {
    cache = redis.createClient({
        url: process.env.URL,
        password: process.env.PASSWORD
    })
    await cache.connect()
    console.log('redis connected')
})();


router.post('/paper', async (req, resApp) => {
    if (await cache.exists(req.body.query)) {
        resApp.send(await cache.get(req.body.query))
        return
    }
    axios({
        method: 'POST',
        url: 'https://sci-hub.se/',
        data: qs.stringify({ 'request': `${req.body.query}` }),
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
        .then(async (res) => {
            let matching = (res.data.match(/src="(.*?)" id = "pdf"/)[1].trim().replace('//', 'https://').replace('"', '')).includes('sci-hub') ? res.data.match(/src="(.*?)" id = "pdf"/)[1].trim().replace('//', 'https://').replace('"', '') : `https://sci-hub.se${res.data.match(/src="(.*?)" id = "pdf"/)[1].trim().replace('//', 'https://').replace('"', '')}`
            resApp.send(matching)
            await cache.set(req.body.query, matching, {
                EX: 1800
            })
        })
        .catch((err) => {
            console.error(err)
        })
})


router.post('/book', async (req, resApp) => {

    if (await cache.exists(req.body.query + req.body.params)) {
        resApp.send(JSON.parse(await cache.get(req.body.query + req.body.params)))
        return
    }

    async function getIPFSPortal(libgenLolLink) {
        return new Promise((resolve, reject) => {
            axios({
                method: "GET",
                url: libgenLolLink
            }).then((res) => {
                var $ = cheerio.load(res.data)
                if (res.data.includes('Download from an IPFS distributed storage, choose any gateway:')) { // there are ipfs buttons
                    resolve($($($($('#download').children('ul')[0]).children('li')[0]).children('a')[0]).attr('href'))
                } else { // fall back on the slower get link
                    resolve($($('#download').children('h2').children('a')[0]).attr('href'))
                }
            }).catch((err) => {
                console.error(err)
            })
        })
    }

    if (req.body.params === 'fiction') {
        axios({
            method: "GET",
            url: `https://libgen.is/fiction/?q=${encodeURIComponent(req.body.query)}`,
        }).then(async (res) => {

            var $ = cheerio.load(res.data)
            var libgenLolLink = $($($($($('.catalog tbody').children('tr')[0]).children('td')[5]).children('ul').children('li')[0]).children('a')[0]).attr('href') // lol link of the first mirror of the first entry
            if (libgenLolLink === undefined) {
                resApp.status(404)
                resApp.send('Not Found')
                return
            }
            let ipfsPortalLink = await getIPFSPortal(libgenLolLink)
            resApp.send([ipfsPortalLink, `https://libgen.is/fiction/?q=${encodeURIComponent(req.body.query)}`])
            await cache.set(req.body.query + req.body.params, JSON.stringify([ipfsPortalLink, `https://libgen.is/fiction/?q=${encodeURIComponent(req.body.query)}`]), {
                EX: 1800
            })
        }).catch((err) => {
            console.error(err)
        })
    } else if (req.body.params === 'nonfiction') {
        axios({
            method: "GET",
            url: `https://libgen.is/search.php?req=${encodeURIComponent(req.body.query)}&lg_topic=libgen&open=0&view=simple&res=25&phrase=1&column=def`,
        }).then(async (res) => {
            var $ = cheerio.load(res.data)
            var libgenLolLink = $($($($($('table').children()[2]).children('tr')[1]).children('td')[9]).children('a')[0]).attr('href')
            if (libgenLolLink === undefined) {
                resApp.status(404)
                resApp.send('Not Found')
                return
            }
            let ipfsPortalLink = await getIPFSPortal(libgenLolLink)
            resApp.send([ipfsPortalLink, `https://libgen.is/search.php?req=${encodeURIComponent(req.body.query)}&lg_topic=libgen&open=0&view=simple&res=25&phrase=1&column=def`])
            await cache.set(req.body.query + req.body.params, JSON.stringify([ipfsPortalLink, `https://libgen.is/search.php?req=${encodeURIComponent(req.body.query)}&lg_topic=libgen&open=0&view=simple&res=25&phrase=1&column=def`]), {
                EX: 1800
            })
        }).catch((err) => {
            console.error(err)
        })
    }
})

router.post('/media', (req, resApp) => {
    resApp.sendStatus(501)
})

module.exports = router