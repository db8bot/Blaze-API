// sfo as 464 seatac as 132 nov 24 22
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
        dmUser: req.body.dmUser,
        time: req.body.time,
        tag: req.body.tag,
        jobID: req.body.jobID,
        source: req.body.source, // doi or title
    }

    // send ok to app
    resApp.status(200).send('OK')

    /*
    pathway: highest probability to lowest
        1.  sh
        1.1 sh mirror
        2. lbg
        3. google scholar
        4. prepub mirrors
    */

    // resolve metadata here cause it will be needed for whichever method on return
    var metadata = await resolveMetadata(dataInput)

    var useragent = req.app.get('useragent')

    var result; // post back variable

    // 1.
    // loop, request each mirror until success, then break
    for (let i = 0; i < shMirrors.length; i++) {
        try {
            result = { type: 'sh', multiLink: null, link: await shOriginalsRequest(dataInput, i, useragent) }
            break;
        } catch (err) {
            console.log('shoriginal err')
        }
    }
    // if no success, try next in pathway
    if (!result) {

        //2. scihub mksa.top
        try {
            result = { type: 'shMirror', multiLink: null, link: await shMirrorRequest(dataInput, useragent) }
        } catch (err) {
            console.log('sh mksa.top err')

            // 3. libgen
            try {
                let lbResult = await lbRequest(metadata, useragent)
                if (typeof lbResult === 'string') {
                    result = { type: 'lb', multiLink: null, link: lbResult }
                } else if (typeof lbResult === 'object') {
                    result = { type: 'lb', multiLink: lbResult.multiLink, link: lbResult.link }
                }
            } catch (err) {
                console.log('lg err')

                // 4. prepub servers
                try {
                    result = { type: 'prepubSS', multiLink: null, link: await semanticScholarReq(metadata) }
                } catch (err) {
                    console.log('prepubSS err')

                    try {
                        result = { type: 'prepubSSRN', multiLink: null, link: await ssrnRequest(metadata, useragent) }
                    } catch (err) {
                        console.error('prepubSSRN err')
                        // 5. google scholar
                        try {
                            result = { type: 'gs', multiLink: null, link: (await googleScholarRequest(dataInput)).link }
                        } catch (err) {
                            console.error('google scholar err')
                        }
                    }
                }
            }
        }
    }
    if (result) {
        // post back to /ocrinbound
        await postback(true, dataInput, result, metadata)
        // console.log([dataInput, result, metadata])
        // console.log(metadata.authors)
    } else {
        // postback - not found
        await postback(false)
        // console.log('not found')
    }

})


async function resolveMetadata(params) {
    return new Promise((resolve, reject) => {
        superagent
            .get(`https://www.mybib.com/api/autocite/search?q=${encodeURIComponent(params.source)}&sourceId=${params.source.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi) ? 'webpage' : 'article_journal'}`) // regex match if url
            .end((err, res) => {
                if (err) reject(err)
                try {
                    let resultObj = (JSON.parse(res.text)).results[0].metadata
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
                    else resolve({ // if parse err, return empty object
                        title: null,
                        containerTitle: null,
                        doi: null,
                        issue: null,
                        issuedYear: null,
                        volume: null,
                        authors: ''
                    })
                } catch (err) {
                    resolve({ // if no metadata found, return empty object
                        title: null,
                        containerTitle: null,
                        doi: null,
                        issue: null,
                        issuedYear: null,
                        volume: null,
                        authors: ''
                    })
                }
            })

    })
}


async function shOriginalsRequest(params, selectNum, useragent) { // might not include https:// or an actual domain name.
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
            .set('User-Agent', useragent)
            .send(`request=${params.source}`)
            .end((err, res) => {
                if (err) {
                    reject(err)
                } else if (res.text.includes('This process is automatic. Your browser will redirect to your requested content shortly.')) { // ddos-guard blocked
                    reject('ddos-guard blocked')
                } else {
                    let $ = cheerio.load(res.text)
                    let link = $('#pdf').attr('src')
                    if (link) {
                        if (!link.includes('https://') && link.includes('http://')) link = link.replace('http://', 'https://')
                        if (!link.includes('https://') && !link.includes('http://') && link.includes('//')) link = link.replace('//', 'https://')
                        else link = shMirrors[selectNum] + link
                        resolve(link)
                    } else reject('not found')
                }
            })

    })
}

async function shMirrorRequest(params, useragent) {
    return new Promise((resolve, reject) => {
        superagent
            .get(`https://sci-hub.mksa.top/${params.source}`)
            .set('User-Agent', useragent)
            .end((err, res) => {
                if (err) return reject(err)
                let $ = cheerio.load(res.text)
                try {
                    let matching = $($('#article').children('embed')[0]).attr('src') || $($('#article').children('iframe')[0]).attr('src')
                    if (!matching.includes('https://') && matching.includes('http://')) matching = matching.replace('http://', 'https://')
                    if (!matching.includes('https://') && !matching.includes('http://') && matching.includes('//')) matching = matching.replace('//', 'https://')
                    resolve(matching)
                } catch (err) {
                    reject('not found')
                }
            })
    })
}

async function lbRequest(metadata, useragent) {
    return new Promise((resolve, reject) => {
        // if has doi, go to lib.lol, otherwise get search page

        if (metadata.doi) {
            superagent
                .get(`http://library.lol/scimag/${metadata.doi}`)
                .set('User-Agent', useragent)
                .end((err, res) => {
                    if (err) return reject(err)
                    let $ = cheerio.load(res.text)
                    let link = $('#download').children('h2').children('a').attr('href')
                    if (link) resolve(link)
                    else reject('not found')
                })
        } else {
            superagent
                .get(`https://libgen.is/scimag/?q=${encodeURIComponent(metadata.title)}`)
                .set('User-Agent', useragent)
                .end((err, res) => {
                    if (err) {
                        reject(err)
                    } else if (res.text.includes('No articles were found.')) {
                        reject('not found') // reject if not found - need conditions statement
                    } else {
                        let $ = cheerio.load(res.text)
                        // find first link of first entry - if multiple entries, link to q page
                        let getPageLink = $($($($('.catalog')[0]).children('tbody').children('tr').children('td')[4]).children('ul').children('li')[1]).children('a').attr('href')
                        var fileCount = parseInt($($('.catalog_paginator')[0]).text().trim().split(' ')[0])
                        superagent
                            .get(getPageLink)
                            .set('User-Agent', useragent)
                            .end((err, res) => {
                                if (err) return reject(err)
                                $ = cheerio.load(res.text)
                                if (fileCount > 1) {
                                    resolve({ multi: true, multiLink: `https://libgen.is/scimag/?q=${encodeURIComponent(metadata.title)}`, link: $('#download').children('h2').children('a').attr('href') })
                                } else {
                                    resolve($('#download').children('h2').children('a').attr('href'))
                                }
                            })
                    }
                })
        }
    })
}

async function googleScholarRequest(params) {
    return new Promise((resolve, reject) => {
        superagent
            .get(`https://serpapi.com/search.json?engine=google_scholar&q=${params.source}&api_key=${process.env.SERPAPIKEY}`)
            .end((err, res) => {
                if (err) return reject(err)
                let resultObj = res.body.organic_results[0]
                let matchingLink = resultObj.resources
                let matching = {
                    title: resultObj.title,
                    doi: resultObj.doi,
                    link: matchingLink ? matchingLink[0].url : null
                }
                if (matching.link) resolve(matching)
                else reject('Google Scholar error')
            })
    })
}

async function semanticScholarReq(metadata) {
    return new Promise((resolve, reject) => {
        superagent
            .get(`http://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(metadata.title)}&fields=openAccessPdf,title&limit=5`)
            .end((err, res) => {
                if (err) reject(err)
                else {
                    let resultObj = JSON.parse(res.text)
                    if (resultObj.total > 0) {
                        let linkReturn = resultObj.data[0].openAccessPdf
                        if (linkReturn) resolve(linkReturn.url)
                        else reject('not found')
                    } else {
                        reject('not found')
                    }
                }
            })
    })
}

async function ssrnRequest(metadata, useragent) {
    return new Promise((resolve, reject) => {
        superagent
            .get(`https://papers.ssrn.com/sol3/results.cfm?txtKey_Words=${encodeURIComponent(metadata.title)}`)
            .set('User-Agent', useragent)
            .end((err, res) => {
                if (err) reject(err)
                else {
                    let $ = cheerio.load(res.text)
                    try {
                        var paperReqLink = $($($($($($('.description')[0]).children('h3')[0]).children('span')[0]).children('a'))[0]).attr('href')
                    } catch (err) {
                        return reject('not found')
                    }
                    if (!paperReqLink) return reject('not found')
                    superagent
                        .get(paperReqLink)
                        .end((err, res) => {
                            if (err) reject('ssrn error')
                            else {
                                $ = cheerio.load(res.text)
                                try {
                                    let deliveryLink = $($($($('.abstract-buttons')[0]).children('div')[0]).children('a')[0]).attr('href')
                                    if (deliveryLink) resolve(`https://papers.ssrn.com/sol3/${deliveryLink}`)
                                    else reject('not found')
                                } catch (err) {
                                    reject('not found')
                                }
                            }
                        })
                }
            })
    })
}

async function postback(found, dataInput, params, metadata) {
    return new Promise((resolve, reject) => {
        if (found) {
            superagent
                .post(`${process.env.POSTBACKURL}/getinbound`)
                .set('Content-Type', 'application/x-www-form-urlencoded')
                .send([dataInput, params, metadata])
                .end((err, res) => {
                    if (err) {
                        reject(err)
                    }
                    resolve()
                })
        } else {
            superagent
                .post(`${process.env.POSTBACKURL}/getinbound`)
                .set('Content-Type', 'application/x-www-form-urlencoded')
                .send([dataInput, 'not found'])
                .end((err, res) => {
                    if (err) {
                        reject(err)
                    }
                    resolve()
                })
        }
    })
}

module.exports = router