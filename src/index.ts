// /**
//  * Welcome to Cloudflare Workers! This is your first worker.
//  *
//  * - Run `wrangler dev src/index.ts` in your terminal to start a development server
//  * - Open a browser tab at http://localhost:8787/ to see your worker in action
//  * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
//  *
//  * Learn more at https://developers.cloudflare.com/workers/
//  */

// export interface Env {
//   // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
//   // MY_KV_NAMESPACE: KVNamespace;
//   //
//   // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
//   // MY_DURABLE_OBJECT: DurableObjectNamespace;
//   //
//   // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
//   // MY_BUCKET: R2Bucket;
// }

// export default {
//   async fetch(
//     request: Request,
//     env: Env,
//     ctx: ExecutionContext
//   ): Promise<Response> {
//     return new Response("Hello World!");
//   },
// };

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { basicAuth } from 'hono/basic-auth'
import { prettyJSON } from 'hono/pretty-json'
import qs from 'qs'
import axios from 'axios'
import cheerio from 'cheerio'

const app = new Hono()
app.get('/', (c) => c.text('Pretty Blog API'))
app.use('*', prettyJSON())
app.notFound((c) => c.json({ message: 'Not Found', ok: false }, 404))

// export interface Bindings {
//   USERNAME: string
//   PASSWORD: string
// }

app.post('/paper', async (c) => {

  console.log('loggin')
  let parsed = qs.parse(await c.req.text())
  console.log(parsed)
  let jstor = parsed.query.includes('jstor.org/stable')
  let jstorHeaders = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36'
  }
  let normalHeaders = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Cache-Control': 'no-cache',
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Host': `sci-hub.se`,
    'Referer': `https://sci-hub.se/`,
    'Origin': `https://sci-hub.se`
  }

  const init = {
    body: qs.stringify({ 'request': `${jstor ? "" : parsed.query}` }),
    method: jstor ? 'GET' : 'POST',
    headers: jstor ? jstorHeaders : normalHeaders
  };
  console.log(init)
  const response = await fetch(`https://sci-hub.${jstor ? `mksa.top/${parsed.query}` : 'se'}`, init)  // actual sci-hub.st has prob blacklisted the google ip - it is redirecting to the homepage (works with repl.it's vms... so we are using an unofficial fork for now - this might break but since it is for jstor only the impact shouldn't be massive)
  const results = await response.text()
  console.log(results)
  let $ = cheerio.load(results)
  var matching: string | null | undefined;
  try {
    matching = $($('#article').children('embed')[0]).attr('src') || $($('#article').children('iframe')[0]).attr('src')
    if (!matching.includes('https://') && matching.includes('http://')) matching = matching.replace('http://', 'https://')
    if (!matching.includes('https://') && !matching.includes('http://') && matching.includes('//')) matching = matching.replace('//', 'https://')
    return (c.json({ message: match, ok: false }, 200))
  } catch (e) {
    // resApp.sendStatus(404)
    return (c.json({ message: 'Not Found', ok: false }, 404))
    // return
  }

  // async function gatherResponse(response) {
  //   // const { headers } = response;
  //   // const contentType = headers.get('content-type') || '';
  //   // if (contentType.includes('application/json')) {
  //   //   return JSON.stringify(await response.json());
  //   // } else if (contentType.includes('application/text')) {
  //   //   return response.text();
  //   // } else if (contentType.includes('text/html')) {
  //   //   return response.text();
  //   // } else {
  //   //   return response.text();
  //   // }
  //   return response.text();
  // }

  // async function handleRequest() {

  //   // const results = await gatherResponse(response);

  //   // let $ = cheerio.load(results)
  //   // var matching: string | null | undefined;
  //   // try {
  //   //   matching = $($('#article').children('embed')[0]).attr('src') || $($('#article').children('iframe')[0]).attr('src')
  //   //   if (!matching.includes('https://') && matching.includes('http://')) matching = matching.replace('http://', 'https://')
  //   //   if (!matching.includes('https://') && !matching.includes('http://') && matching.includes('//')) matching = matching.replace('//', 'https://')
  //   //   console.log(matching)
  //   // } catch (e) {
  //   //   // resApp.sendStatus(404)
  //   //   return (c.json({ message: 'Not Found', ok: false }, 404))
  //   //   // return
  //   // }

  //   return new Response(results, init)
  // }

  // addEventListener('fetch', event => {
  //   return event.respondWith(handleRequest());
  // });



  // axios({
  //   method: jstor ? 'GET' : 'POST',
  //   url: `https://sci-hub.${jstor ? `mksa.top/${parsed.query}` : 'se'}`, // actual sci-hub.st has prob blacklisted the google ip - it is redirecting to the homepage (works with repl.it's vms... so we are using an unofficial fork for now - this might break but since it is for jstor only the impact shouldn't be massive)
  //   data: qs.stringify({ 'request': `${jstor ? "" : parsed.query}` }),
  //   headers: jstor ? jstorHeaders : normalHeaders
  // }).then(async (res) => {
  //   let $ = cheerio.load(res.data)
  //   var matching: string | null | undefined;
  //   try {
  //     matching = $($('#article').children('embed')[0]).attr('src') || $($('#article').children('iframe')[0]).attr('src')
  //     if (!matching.includes('https://') && matching.includes('http://')) matching = matching.replace('http://', 'https://')
  //     if (!matching.includes('https://') && !matching.includes('http://') && matching.includes('//')) matching = matching.replace('//', 'https://')
  //   } catch (e) {
  //     // resApp.sendStatus(404)
  //     return (c.json({ message: 'Not Found', ok: false }, 404))
  //     // return
  //   }
  // if (matching !== undefined && matching !== null) {
  //   axios({
  //     method: 'GET',
  //     url: `https://www.mybib.com/api/autocite/search?q=${req.body.query}&sourceId=${req.body.query.match(/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi) ? 'webpage' : 'article_journal'}`, // shhhhh ;)
  //     headers: {}
  //   }).then(async (res) => {
  //     let metadata = {  // take the first result & mark it as probably correct results[0]
  //       title: res.data.results[0].metadata.title,
  //       containerTitle: res.data.results[0].metadata.containerTitle,
  //       doi: res.data.results[0].metadata.doi,
  //       issue: res.data.results[0].metadata.issue,
  //       issuedYear: res.data.results[0].metadata.issued.year,
  //       issuedMonth: res.data.results[0].metadata.issued.month,
  //       volume: res.data.results[0].metadata.volume,
  //       authors: res.data.results[0].metadata.author
  //     }
  //     // resApp.send([matching, metadata])
  //     return (c.json({ message: [matching, metadata], ok: false }, 404))
  //     // if (VERSION === 'prod') {
  //     //   let cacheObj = [matching]
  //     //   cacheObj.push(metadata)
  //     //   await cache.set(req.body.query, JSON.stringify(cacheObj), {
  //     //     EX: 1800
  //     //   })
  //     // }
  //   })
  // } else {
  //   return (c.json({ message: 'Not Found', ok: false }, 404))
  // }
  // })
  //   .catch((err) => {
  //     console.error(err)
  //   })




  return c.text('created!', 201)
})


export default app