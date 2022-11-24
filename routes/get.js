const express = require('express')
const router = express.Router()
const superagent = require('superagent')
const crypto = require('crypto')
const shMirrors = require('../internals/shMirrors.json')
const cheerio = require('cheerio')

router.post('/', async (req, resApp) => {
    function hash(apiKey) {
        return crypto.createHash('sha256').update(apiKey).digest('hex')
    }
    if (hash(req.body.auth) !== process.env.AUTH) {
        return resApp.status(401).send('Invalid API Key or no authentication provided.')
    }

    // basic input structure

    let dataInput = {
        auth: hash(req.body.auth),
        serverID: req.body.serverID,
        channelID: req.body.channelID,
        memberID: req.body.memberID,
        jobID: req.body.jobID,
        source: req.body.source, // doi or title
    }

    // send ok to app
    resApp.status(200).send('OK')

    /*
    pathway: highest probability to lowest
        1.  scihub
        1.1 scihub mirrors?
        2. libgen
        3. google scholar
        4. crossref
        5. arxiv
    */

    // resolve metadata here cause it will be needed for whichever method on return
    var metadata = resolveMetadata(dataInput)

    var result; // post back variable

    // 1.
    // loop, request each mirror until success, then break
    for (let i = 0; i < shMirrors.length; i++) {
        try {
            result = { type: 'sh', link: await shOriginalsRequest(dataInput, i) }
            break;
        } catch (err) {
            console.log(err)
        }
    }
    // if no success, try next in pathway
    if (!result) {
        // 2.
        // libgen          // then call the next in pathway in the catch 
        try {
            result = await lbRequest(metadata)
            // postback
        } catch (err) {
            console.err(err)
            // call our next pathway
        }
    } else {
        // postback
    }

})

async function resolveMetadata(params) {
    return new Promise((resolve, reject) => {
        superagent
            .get(`https://www.mybib.com/api/autocite/search?q=${parsed.query}&sourceId=${parsed.query.match(/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi) ? 'webpage' : 'article_journal'}`)
            .end((err, res) => {
                if (err) reject(err)
                let resultObj = JSON.parse(res.text)[0]
                let metadata = {
                    title: resultObj.title,
                    containerTitle: resultObj.containerTitle,
                    doi: resultObj.doi,
                    issue: resultObj.issue,
                    issuedYear: resultObj.issued.month,
                    volume: resultObj.volume,
                    authors: resultObj.author
                }
                if (metadata) resolve(metadata)
            })

    })
}


async function shOriginalsRequest(params, selectNum) {
    // try with no cookie edits
    // try with cookie edits if fail

    return new Promise((resolve, reject) => {

        let domain = shMirrors[selectNum].replace('https://', '')
        let expTime = new Date()
        expTime.setDate(expTime.getDate() + 1) // add 1 more day to make sure it is not within exp time
        let expTimeString = expTime.toUTCString()

        superagent
            .post(shMirrors[selectNum])
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .set('Cookie', `__ddg1_=f4qpDH2ftnlDF1bgMk2K; Path=/; Domain=${domain}; Expires=${expTimeString};`) // cookies ddg1, ddg2, ddg5, refresh
            .set('Cookie', `__ddg2_=nl7k0cLb1LT35ycJ; Path=/; Domain=${domain}; Expires=${expTimeString};`) // cookies ddg1, ddg2, ddg5, refresh
            .set('Cookie', `__ddg5_=ln9sbGHfONCftYGC; Path=/; Domain=${domain}; Expires=${expTimeString};`) // cookies ddg1, ddg2, ddg5, refresh
            .set('Cookie', `refresh=${(Date.now() / 10000).toFixed(4)}; Path=/; Domain=sci-hub.se; Secure; Expires=${expTimeString};`) // cookies ddg1, ddg2, ddg5, refresh
            .send(`request=${params.source}`)
            .end((err, res) => {
                if (err) {
                    reject(err)
                } else if (res.text.includes('This process is automatic. Your browser will redirect to your requested content shortly.')) { // ddos-guard blocked
                    reject('ddos-guard blocked')
                } else {
                    let $ = cheerio.load(res.text)
                    resolve($('#pdf').attr('src'))
                }
            })

    })
}

async function lbRequest(metadata) {
    return new Promise((resolve, reject) => {
        // if has doi, go to lib.lol, otherwise get libgen.is
        superagent
            .get(`https://libgen.is/scimag/?q=${metadata.doi}`)   // make direct request to library.lol?
            .end((err, res) => {
                if (err) {
                    reject(err)
                } else if ($($('.catalog_paginator')).text().trim() === '0 files found') {
                    reject('not found') // reject if not found - need conditions statement
                } else {
                    let $ = cheerio.load(res.text)
                    // find first link of first entry - if multiple entries, link to q page
                    let getPageLink = $($($($('.catalog')[0]).children('tbody').children('tr').children('td')[4]).children('ul').children('li')[1]).children('a').attr('href')
                }
            })
    })
}


async function postback(params) {
    return new Promise((resolve, reject) => {

        superagent
            .post(`${process.env.POSTBACKURL}/getinbound`)
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send(param)
            .end((err, res) => {
                if (err) {
                    reject(err)
                }
                resolve()
            })

    })
}

module.exports = router