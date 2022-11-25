const superagent = require('superagent')
const shMirrors = require('../internals/shMirrors.json')
const cheerio = require('cheerio')
const params = {
    source: "10.1016/j.jclepro.2018.01.095",
}
const metadata = {
    title: 'Thermo-economic-environmental optimization',
    containerTitle: 'Journal of Cleaner Production',
    // doi: '10.1016/j.jclepro.2018.01.095',
    issue: null,
    issuedYear: 5,
    volume: '184',
    authors: [
        { given: 'Zhitong', family: 'Yi', literal: null },
        { given: 'Xianglong', family: 'Luo', literal: null },
        { given: 'Zhi', family: 'Yang', literal: null },
        { given: 'Chao', family: 'Wang', literal: null },
        { given: 'Jianyong', family: 'Chen', literal: null },
        { given: 'Ying', family: 'Chen', literal: null },
        { given: 'José María', family: 'Ponce-Ortega', literal: null }
    ]
}

lbRequest(metadata).then(res => console.log(res)).catch(err => console.log(err))

async function lbRequest(metadata) {
    return new Promise((resolve, reject) => {
        // if has doi, go to lib.lol, otherwise get libgen.is

        if (metadata.doi) {
            superagent
                .get(`http://library.lol/scimag/${metadata.doi}`)
                .end((err, res) => {
                    if (err) reject(err)
                    let $ = cheerio.load(res.text)
                    resolve($('#download').children('h2').children('a').attr('href'))
                })
        } else {
            superagent
                .get(`https://libgen.is/scimag/?q=${encodeURIComponent(metadata.title)}`)
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
                            .end((err, res) => {
                                if (err) reject(err)
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