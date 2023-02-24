const superagent = require('superagent')
const metadata = {
    title: 'Multiband light curves from eccentric accreting supermassive black hole binaries',
    containerTitle: 'Physical Review D',
    doi: '10.1103/physrevd.106.103010',
    issue: '10',
    issuedYear: 11,
    volume: '106',
    authors: [
        {
            given: 'John Ryan',
            family: 'Westernacher-Schneider',
            literal: null
        },
        { given: 'Jonathan', family: 'Zrake', literal: null },
        { given: 'Andrew', family: 'MacFadyen', literal: null },
        { given: 'Zoltán', family: 'Haiman', literal: null }
    ]
}
superagent
    .get(`http://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(metadata.title)}&fields=openAccessPdf,title&limit=5`)
    .end((err, res) => {
        if (err) reject(err)
        else {
            let resultObj = JSON.parse(res.text)
            console.log(resultObj)
            if (resultObj.total > 0) {
                console.log(resultObj.data[0].openAccessPdf.url)
            } else {
                console.log('not found')
            }
        }
    })