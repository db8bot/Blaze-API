const express = require('express')
const qs = require('qs')
const router = express.Router()
const axios = require('axios').default
const cheerio = require('cheerio')
const redis = require('redis')
const VERSION = 'dev'
if (VERSION === 'prod') {
    var cache;
    (async () => {
        cache = redis.createClient({
            url: process.env.URL,
            password: process.env.PASSWORD
        })
        await cache.connect()
        console.log('redis connected')
    })();
}


router.post('/paper', async (req, resApp) => {
    if (VERSION === 'prod') {
        if (await cache.exists(req.body.query)) {
            resApp.send(await cache.get(req.body.query))
            return
        }
    }
    let jstor = req.body.query.includes('jstor.org/stable')
    axios({
        method: 'POST',
        url: `https://sci-hub.${jstor ? 'st' : 'se'}/`,
        data: qs.stringify({ 'request': `${req.body.query}` }),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cache-Control': 'no-cache',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Host': `sci-hub.${jstor ? 'st' : 'se'}`,
            'Referer': `https://sci-hub.${jstor ? 'st' : 'se'}/`,
            'Origin': `https://sci-hub.se${jstor ? 'st' : 'se'}`
        }
    })
        .then(async (res) => {
            let matching = (res.data.match(/src="(.*?)" id = "pdf"/)[1].trim().replace('//', 'https://').replace('"', '')).includes('sci-hub') ? res.data.match(/src="(.*?)" id = "pdf"/)[1].trim().replace('//', 'https://').replace('"', '') : `https://sci-hub.${jstor ? 'st' : 'se'}${res.data.match(/src="(.*?)" id = "pdf"/)[1].trim().replace('//', 'https://').replace('"', '')}`
            resApp.send(matching)
            if (VERSION === 'prod') {
                await cache.set(req.body.query, matching, {
                    EX: 1800
                })
            }
        })
        .catch((err) => {
            console.error(err)
        })
})


router.post('/book', async (req, resApp) => {

    if (VERSION === 'prod') {
        if (await cache.exists(req.body.query + req.body.params)) {
            resApp.send(JSON.parse(await cache.get(req.body.query + req.body.params)))
            return
        }
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
            let meta = {
                author: $($($('.catalog tbody').children('tr')[0]).children('td')[0]).text().replace(/\t/g, '').trim(),
                title: $($($('.catalog tbody').children('tr')[0]).children('td')[2]).text(),
                language: $($($('.catalog tbody').children('tr')[0]).children('td')[3]).text()
            }
            resApp.send([ipfsPortalLink, `https://libgen.is/fiction/?q=${encodeURIComponent(req.body.query)}`, meta])
            if (VERSION === 'prod') {
                await cache.set(req.body.query + req.body.params, JSON.stringify([ipfsPortalLink, `https://libgen.is/fiction/?q=${encodeURIComponent(req.body.query)}`, meta]), {
                    EX: 1800
                })
            }
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
            var meta = {
                libgenID: $($($($('table').children()[2]).children('tr')[1]).children('td')[0]).text().replace(/\t/g, '').trim(),
                author: $($($($('table').children()[2]).children('tr')[1]).children('td')[1]).text().replace(/\t/g, '').trim(),
                title: $($($($($('table').children()[2]).children('tr')[1]).children('td')[2]).children('a')[0]).text(),
                isbn: null,
                publisher: $($($($('table').children()[2]).children('tr')[1]).children('td')[3]).text().replace(/\t/g, '').trim(),
                year: $($($($('table').children()[2]).children('tr')[1]).children('td')[4]).text().replace(/\t/g, '').trim()
            }

            // isbn seperation & processing
            let titleSplit = meta.title.split(' ')
            let isbns = []
            for (element of titleSplit) {
                element = element.replace(/\b[-.,()&$#!\[\]{}"']+\B|\B[-.,()&$#!\[\]{}"']+\b/g, '')
                if (element.match(/^(?:ISBN(?:-13)?:?\ )?(?=[0-9]{13}$|(?=(?:[0-9]+[-\ ]){4})[-\ 0-9]{17}$)97[89][-\ ]?[0-9]{1,5}[-\ ]?[0-9]+[-\ ]?[0-9]+[-\ ]?[0-9]$/) || element.match(/^(?:ISBN(?:-10)?:?●)?(?=[0-9X]{10}$|(?=(?:[0-9]+[-●]){3})[-●0-9X]{13}$)[0-9]{1,5}[-●]?[0-9]+[-●]?[0-9]+[-●]?[0-9X]$/)) { // first regex = isbn 13, second regex = isbn 10
                    isbns.push(element)
                    meta.title = meta.title.replace(element, '')
                }
            }
            meta.isbn = isbns.join(', ')
            meta.title = meta.title.replace(/,\s*$/g, '').trim()
            resApp.send([ipfsPortalLink, `https://libgen.is/search.php?req=${encodeURIComponent(req.body.query)}&lg_topic=libgen&open=0&view=simple&res=25&phrase=1&column=def`, meta])
            if (VERSION === 'prod') {
                await cache.set(req.body.query + req.body.params, JSON.stringify([ipfsPortalLink, `https://libgen.is/search.php?req=${encodeURIComponent(req.body.query)}&lg_topic=libgen&open=0&view=simple&res=25&phrase=1&column=def`, meta]), {
                    EX: 1800
                })
            }
        }).catch((err) => {
            console.error(err)
        })
    }
})

router.post('/media', (req, resApp) => {
    resApp.sendStatus(501)
})

module.exports = router