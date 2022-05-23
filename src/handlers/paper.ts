import axios from 'axios'
import cheerio from 'cheerio'
import qs from 'qs'

const Paper = (request) => {
    const query = request.params.query
    const responseHeaders = { 'Content-type': 'application/json' };
    const normalHeaders = {
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
    axios({
        method: 'POST',
        url: 'https://sci-hub.se',
        data: qs.stringify({
            'request': query
        }),
        headers: normalHeaders
    }).then(async res => {
        const $ = cheerio.load(res.data)
        let matching = $($('#article').children('embed')[0]).attr('src') || $($('#article').children('iframe')[0]).attr('src')
        if (matching) {
            if (!matching.includes('https://') && matching.includes('http://')) matching = matching.replace('http://', 'https://')
            if (!matching.includes('https://') && !matching.includes('http://') && matching.includes('//')) matching = matching.replace('//', 'https://')
            return new Response(JSON.stringify(matching), {headers: responseHeaders, status: 200})
        } else {
            // send 404
            return new Response('Not found', { status: 404, headers: responseHeaders })
        }
    })


    // const body = JSON.stringify(post);
    // return new Response(body, { headers });
};

export default Paper;