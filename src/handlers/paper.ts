import qs from "qs";
import axios from "axios";
import cheerio from "cheerio";
// import redis from "redis";

// const VERSION = 'prod'

// if (VERSION === 'prod') {
//     var cache;
//     (async () => {
//         cache = redis.createClient({
//             url: process.env.URL,
//             password: process.env.PASSWORD
//         })
//         await cache.connect()
//         console.log('redis connected')
//     })();
// }

const Paper = async request => {
    console.log('in')
    const content = await request.json()
    console.log(content)
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-type': 'application/json'
    }
    return new Response(JSON.stringify('test'), { headers })
    // let jstor = content.query.includes('jstor.org/stable')
    // let jstorHeaders = {
    //     'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36',
    // }
    // let normalHeaders = {
    //     'Content-Type': 'application/x-www-form-urlencoded',
    //     'Cache-Control': 'no-cache',
    //     'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36',
    //     'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    //     'Accept-Encoding': 'gzip, deflate, br',
    //     'Connection': 'keep-alive',
    //     'Host': `sci-hub.se`,
    //     'Referer': `https://sci-hub.se/`,
    //     'Origin': `https://sci-hub.se`
    // }
    // axios({
    //     method: jstor ? 'GET' : 'POST',
    //     url: `https://sci-hub.${jstor ? `mksa.top/${content.query}` : 'se'}`, // actual sci-hub.st has prob blacklisted the google ip - it is redirecting to the homepage (works with repl.it's vms... so we are using an unofficial fork for now - this might break but since it is for jstor only the impact shouldn't be massive)
    //     data: qs.stringify({ 'request': `${jstor ? "" : content.query}` }),
    //     headers: jstor ? jstorHeaders : normalHeaders
    // }).then(async (res) => {
    //     let $ = cheerio.load(res.data)
    //     var matching: string | null | undefined;
    //     try {
    //         matching = $($('#article').children('embed')[0]).attr('src') || $($('#article').children('iframe')[0]).attr('src')
    //         if (!matching.includes('https://') && matching.includes('http://')) matching = matching.replace('http://', 'https://')
    //         if (!matching.includes('https://') && !matching.includes('http://') && matching.includes('//')) matching = matching.replace('//', 'https://')
    //     } catch (e) {
    //         return new Response("Not found", { status: 404 })
    //     }
    //     if (matching !== undefined && matching !== null) {
    //         axios({
    //             method: 'GET',
    //             url: `https://www.mybib.com/api/autocite/search?q=${req.body.query}&sourceId=${req.body.query.match(/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi) ? 'webpage' : 'article_journal'}`, // shhhhh ;)
    //             headers: {}
    //         }).then(async (res) => {
    //             let metadata = {  // take the first result & mark it as probably correct results[0]
    //                 title: res.data.results[0].metadata.title,
    //                 containerTitle: res.data.results[0].metadata.containerTitle,
    //                 doi: res.data.results[0].metadata.doi,
    //                 issue: res.data.results[0].metadata.issue,
    //                 issuedYear: res.data.results[0].metadata.issued.year,
    //                 issuedMonth: res.data.results[0].metadata.issued.month,
    //                 volume: res.data.results[0].metadata.volume,
    //                 authors: res.data.results[0].metadata.author
    //             }
    //             // if (VERSION === 'prod') {
    //             //     let cacheObj = [matching]
    //             //     cacheObj.push(metadata)
    //             //     await cache.set(req.body.query, JSON.stringify(cacheObj), {
    //             //         EX: 1800
    //             //     })
    //             // }
    //             return new Response([matching, metadata], { status: 200 })
    //         })
    //     } else {
    //         return new Response("Not found", { status: 404 })
    //     }
    // })
    //     .catch((err) => {
    //         console.error(err)
    //     })
}

export default Paper