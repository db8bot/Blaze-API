/* 
CLOUDFLARE WORKERS

db8bot (https://github.com/AirFusion45/db8bot) service API for /get series commands. 
Processing JSTOR links directed to sci-hub (mirror), journal metadata & library genesis requests
Copyright (c) Jim Fang
MIT license
Part of the db8bot application

*/


import { Hono } from 'hono'
import { prettyJSON } from 'hono/pretty-json'
import qs from 'qs'
import cheerio from 'cheerio'

const app = new Hono()
app.get('/', (c) => c.text('db8bot API for sci-hub JSTOR links, journal metadata & library genesis.'))
app.use('*', prettyJSON())
app.notFound((c) => c.json({ message: 'Not Found', ok: false }, 404))


// /paper JSTOR only - normal scihub will be routed to app engine
app.post('/paper', async (c) => {

  let parsed = qs.parse(await c.req.text())
  let jstor = parsed.query.includes('jstor.org/stable')

  if (jstor) {
    const jstorInit = {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36'
      }
    }
    console.log(jstorInit)
    console.log(`https://sci-hub.mksa.top/${parsed.query}`)
    const jstorResponse = await fetch(`https://sci-hub.mksa.top/${parsed.query}`, jstorInit)  // actual sci-hub.st has prob blacklisted the google ip - it is redirecting to the homepage (works with repl.it's vms... so we are using an unofficial fork for now - this might break but since it is for jstor only the impact shouldn't be massive)

    const jstorResults = await jstorResponse.text()
    let $ = cheerio.load(jstorResults)
    var matching: string | undefined;
    try {
      matching = $($('#article').children('embed')[0]).attr('src') || $($('#article').children('iframe')[0]).attr('src')
      if (!matching.includes('https://') && matching.includes('http://')) matching = matching.replace('http://', 'https://')
      if (!matching.includes('https://') && !matching.includes('http://') && matching.includes('//')) matching = matching.replace('//', 'https://')
      console.log(matching)
      // may need to check if this includes a domain before the /
      // dev
      // return (c.json({ message: matching, ok: true }, 200))
      // prod - we would not return this until we have the mybib meta info
    } catch (e) {
      return (c.json({ message: 'Not Found', ok: false }, 404))
    }
  }

  // check mybib for meta info
  if (!jstor || matching) { // either we are just doing meta for scihubse or we are a) making sure that the prev req was successful + meta stuff. if se pdf req is unsuccessful on teh app engine, meta results will get trashed at db8bot host compute 1 - database caching for se will happen on compute 1
    try {
      const myBibResponse = await fetch(`https://www.mybib.com/api/autocite/search?q=${parsed.query}&sourceId=${parsed.query.match(/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi) ? 'webpage' : 'article_journal'}`, {
        method: 'GET'
      })

      const myBibResults = await myBibResponse.json()
      // console.log(myBibResults.results[0])

      let metadata = {  // take the first result & mark it as probably correct results[0]
        title: myBibResults.results[0].metadata.title,
        containerTitle: myBibResults.results[0].metadata.containerTitle,
        doi: myBibResults.results[0].metadata.doi,
        issue: myBibResults.results[0].metadata.issue,
        issuedYear: myBibResults.results[0].metadata.issued.year,
        issuedMonth: myBibResults.results[0].metadata.issued.month,
        volume: myBibResults.results[0].metadata.volume,
        authors: myBibResults.results[0].metadata.author
      }

      //dev
      if (jstor) {
        return (c.json([matching, metadata], 200))
      } else {
        return (c.json(metadata, 200))
      }

    } catch (err) {
      return (c.json([matching, {}], 200))
    }
  }
})


app.post('/book', async (c) => {
  let parsed = qs.parse(await c.req.text())

  async function getIPFSPortal(libgenLolLink: string) {

    const IPFSResponse = await fetch(libgenLolLink, {
      method: 'GET'
    })
    const IPFSResults = await IPFSResponse.text()

    var $ = cheerio.load(IPFSResults)
    if (IPFSResults.includes('Download from an IPFS distributed storage, choose any gateway:')) { // there are ipfs buttons
      return ($($($($('#download').children('ul')[0]).children('li')[0]).children('a')[0]).attr('href'))
    } else { // fall back on the slower get link
      return ($($('#download').children('h2').children('a')[0]).attr('href'))
    }
  }


  if (parsed.params === 'fiction') {

    const fictionResponse = await fetch(`https://libgen.is/fiction/?q=${encodeURIComponent(parsed.query)}`, {
      method: 'GET'
    })

    const fictionResults = await fictionResponse.text()

    try {
      var $ = cheerio.load(fictionResults)
      var libgenLolLink = $($($($($('.catalog tbody').children('tr')[0]).children('td')[5]).children('ul').children('li')[0]).children('a')[0]).attr('href') // lol link of the first mirror of the first entry
      if (libgenLolLink === undefined) {
        return (c.json({ message: 'Not Found', ok: false }, 404))
      }
      let ipfsPortalLink = await getIPFSPortal(libgenLolLink)
      let titleBeforeISBNFilter = $($($('.catalog tbody').children('tr')[0]).children('td')[2]).text()

      let meta = {
        author: $($($('.catalog tbody').children('tr')[0]).children('td')[0]).text().replace(/\t/g, '').trim(),
        title: titleBeforeISBNFilter.substring(0, titleBeforeISBNFilter.split('\n\t\t', 2).join('\n\t\t').length).replace('\n\t\t', '').trim(),
        isbn: titleBeforeISBNFilter.includes('ISBN') ? (titleBeforeISBNFilter.substring(titleBeforeISBNFilter.indexOf('ISBN: ')).replace('ISBN: ', '').replace(/\t/g, '').replace('\n\t\t', '').trim()) : '',
        language: $($($('.catalog tbody').children('tr')[0]).children('td')[3]).text()
      }
      return (c.json([ipfsPortalLink, `https://libgen.is/fiction/?q=${encodeURIComponent(parsed.query)}`, meta], 200))
    } catch (err) {
      return (c.json({ message: 'Not Found', ok: false }, 404))
    }
  } else if (parsed.params === 'nonfiction') {
    const nonfictionResponse = await fetch(`https://libgen.is/search.php?req=${encodeURIComponent(parsed.query)}&lg_topic=libgen&open=0&view=simple&res=25&phrase=1&column=def`, {
      method: 'GET'
    })
    const nonfictionResults = await nonfictionResponse.text()
    try {
      var $ = cheerio.load(nonfictionResults)
      var libgenLolLink = $($($($($('table').children()[2]).children('tr')[1]).children('td')[9]).children('a')[0]).attr('href')
      if (libgenLolLink === undefined) {
        return (c.json({ message: 'Not Found', ok: false }, 404))
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
      for (var element of titleSplit) {
        element = element.replace(/\b[-.,()&$#!\[\]{}"']+\B|\B[-.,()&$#!\[\]{}"']+\b/g, '')
        if (element.match(/^(?:ISBN(?:-13)?:?\ )?(?=[0-9]{13}$|(?=(?:[0-9]+[-\ ]){4})[-\ 0-9]{17}$)97[89][-\ ]?[0-9]{1,5}[-\ ]?[0-9]+[-\ ]?[0-9]+[-\ ]?[0-9]$/) || element.match(/^(?:ISBN(?:-10)?:?●)?(?=[0-9X]{10}$|(?=(?:[0-9]+[-●]){3})[-●0-9X]{13}$)[0-9]{1,5}[-●]?[0-9]+[-●]?[0-9]+[-●]?[0-9X]$/)) { // first regex = isbn 13, second regex = isbn 10
          isbns.push(element)
          meta.title = meta.title.replace(element, '')
        }
      }
      meta.isbn = isbns.join(', ')
      meta.title = meta.title.replace(/,\s*$/g, '').trim()

      return (c.json([ipfsPortalLink, `https://libgen.is/search.php?req=${encodeURIComponent(parsed.query)}&lg_topic=libgen&open=0&view=simple&res=25&phrase=1&column=def`, meta], 200))
    } catch (err) {
      return (c.json({ message: 'Not Found', ok: false }, 404))
    }
  }
})




export default app