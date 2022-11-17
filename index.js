require('dotenv').config({ path: './prod.env' })

const express = require('express')
// const superagent = require('superagent')
const cookieParser = require('cookie-parser')
// const redis = require('redis')
const { createWorker, createScheduler } = require('tesseract.js')

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }))

// setup queue

// const bullQueue = new Queue('', {
//     redis: {
//         port: 15957,
//         host: process.env.REDISURL,
//         password: process.env.REDISPASSWORD
//     }
// })

// app.set('bullQueue', bullQueue)

// const redisCache = redis.createClient({
//     url: `redis://${process.env.REDISURL}`,
//     password: process.env.REDISPASSWORD,
//     tls: true
// })
// app.set('redisCache', redisCache)


// tesser queue
async function initTesseractQuee(app) {
    // 2 works = ability to handle 2 jobs at once; no speed difference on 1 job
    const scheduler = createScheduler()
    const worker = createWorker()
    await worker.load()
    await worker.loadLanguage() // default english
    await worker.initialize()   // default english
    scheduler.addWorker(worker)
    const worker2 = createWorker()
    await worker2.load()
    await worker2.loadLanguage() // default english
    await worker2.initialize()  // default english
    scheduler.addWorker(worker2)
    app.set('tesseractScheduler', scheduler)
}
initTesseractQuee(app)


// set up routes
const ocr = require('./routes/ocr')
app.use('/ocr', ocr)


var port = process.env.PORT
if (port == null || port === '') {
    port = 8080
}
app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`)
})