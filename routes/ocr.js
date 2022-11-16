const express = require('express')
const router = express.Router()
const { createWorker } = require('tesseract.js')

router.post('/', async (req, resApp) => {
    if (req.body.auth !== process.env.AUTH) {
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
        serverID: req.body.serverID,
        channelID: req.body.channelID,
        memberID: req.body.memberID,
        jobID: req.body.jobID,
        lang: req.body.lang,
        source: req.body.source
    }
    // respond to init request 200 ok
    resApp.status(200).send('OK')

    // start OCR! - add to ocr job
    console.time()
    ocr(redisDataInput, req)

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
    } else {
        const worker = createWorker()
        await worker.load()
        await worker.loadLanguage(param.lang)
        await worker.initialize(param.lang)
        var data = await worker.recognize(param.source, param.lang, param.jobID)
        worker.terminate()
        // append to params + postback to /ocr
    }
    // send request
    console.log(data.jobId)
    console.log(data.data.text)
    console.timeEnd()
}

module.exports = router