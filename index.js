require('dotenv').config({ path: './prod.env' })

const express = require('express')
const superagent = require('superagent')
const cookieParser = require('cookie-parser')
const redis = require('redis')

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


// const manualQueue = redis.createClient({
//     url: `redis://${process.env.REDISURL}`,
//     password: process.env.REDISPASSWORD,
//     tls: true
// })

// app.set('manualQueue', manualQueue)
// app.set('bullQueue', bullQueue)

// set up routes
const ocr = require('./routes/ocr')
app.set('/ocr', ocr)


var port = process.env.PORT
if (port == null || port === '' || versionSelector === 'dev') {
    port = 8080
}
app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`)
})