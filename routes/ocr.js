const express = require('express')
const router = express.Router()
const { createWorker, createScheduler } = require('tesseract.js')
const os = require('os')
// const queue = require('Bull')
const scheduler = createScheduler()

router.post('/', async (req, resApp) => {
    if (req.body.auth === process.env.AUTH) {
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

    // respond to request

    // if english - multiworker suppport
    // other lang - single threaded job
    if (lang === 'eng') {
        // check if there are workers created: if yes: add to queue, if no: create workers and add to queue
        if (scheduler.getNumWorkers() === 0) { // no workers - create new
            let tempWorker
            for (i = 0; i < os.cpus().length; i++) {
                tempWorker = createWorker()
                await tempWorker.load()
                await worker.loadLanguage('eng')
                await worker.initialize('eng')
                scheduler.addWorker(tempWorker)
            }
        }
        // add to queue
        const { data } = await scheduler.addJob('detect', image)
    } else {

    }

    // await for complete

    // post back

    const manualQueue = req.app.get('manualQueue')
    manualQueue.connect()
    await manualQueue.set(res.data.jobID, JSON.stringify(res.data), { // params: (key, value)
        EX: 86400 // 1 day
    })

})


// async function ocr(metaInfo, resApp) {
//     const worker = createWorker()
//     await worker.load()
//     await worker.loadLanguage(metaInfo.lang)
//     await worker.initialize(metaInfo.lang)
//     const { data: { text } } = await worker.recognize(metaInfo.source)
//     metaInfo['result'] = Buffer.from(text)
//     await worker.terminate()
// }




module.exports = router