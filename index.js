require('dotenv').config({ path: './prod.env' })

const express = require('express')
const superagent = require('superagent')
var cookieParser = require('cookie-parser')

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }))

//
const ocr = require('./routes/ocr')
app.set('/ocr', ocr)


var port = process.env.PORT
if (port == null || port === '' || versionSelector === 'dev') {
    port = 8080
}
app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`)
})