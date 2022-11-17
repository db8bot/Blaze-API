const express = require('express')
const router = express.Router()
const { createWorker } = require('tesseract.js')
const superagent = require('superagent')
const crypto = require('crypto')

router.post('/', async (req, resApp) => {
    function hash(apiKey) {
        return crypto.createHash('sha256').update(apiKey).digest('hex')
    }
    if (hash(req.body.auth) !== process.env.AUTH) {
        return resApp.status(401).send('Invalid API Key or no authentication provided.')
    }
    // Input Data Schema
    // {
    //     serverID: <Integer>
    //     channelID: <Integer>
    //     memberID: <Integer>
    //     jobID: <UUID>
    //     lang: <String>
    //     source: <URL>
    // }
    let redisDataInput = {
        auth: hash(req.body.auth),
        serverID: req.body.serverID,
        channelID: req.body.channelID,
        memberID: req.body.memberID,
        jobID: req.body.jobID,
        lang: req.body.lang,
        source: req.body.source,
        time: req.body.time
    }

    // start OCR! - add to ocr job
    try {
        ocr(redisDataInput, req)
        // respond to init request 200 ok
        resApp.status(200).send('OK')

    } catch (err) {
        resApp.status(500).send(err)
    }

    // always keep one english worker idling
    // add new workers as needed; but less than core count. if not english, dont use queue
    // remove workers when not needed
})


async function ocr(param, req) {

    // use existing workers if lang is english else create new worker without queue
    if (param.lang === 'eng') {

        const tesseractScheduler = req.app.get('tesseractScheduler')

        var data = await tesseractScheduler.addJob('recognize', param.source, {}, param.jobID)

        // append to params + postback to /ocr
        param.text = Buffer.from(data.data.text)

        // post back to /ocr
        if (!process.env.POSTBACKURL.includes('localhost')) { // only post back if theres an actual url - so avoid crashing due to err
            superagent
                .post(`${process.env.POSTBACKURL}/ocrinbound`)
                .set('Content-Type', 'application/x-www-form-urlencoded')
                .send(param)
                .end((err, res) => {
                    if (err) {
                        console.log(err)
                    }
                })
        }

        console.log(param)

    } else {
        const worker = createWorker()
        await worker.load()
        await worker.loadLanguage(param.lang)
        await worker.initialize(param.lang)
        var data = await worker.recognize(param.source, param.lang, param.jobID)
        worker.terminate()

        // append to params + postback to /ocr
        param.text = Buffer.from(data.data.text)

        // post back to /ocr
        if (!process.env.POSTBACKURL.includes('localhost')) {
            superagent
                .post(`${process.env.POSTBACKURL}/ocrinbound`)
                .set('Content-Type', 'application/x-www-form-urlencoded')
                .send(param)
                .end((err, res) => {
                    if (err) {
                        console.log(err)
                    }
                })
        }

        console.log(param)

    }
    // console.log(data.jobId)
    // console.log(data.data.text)
}

module.exports = router