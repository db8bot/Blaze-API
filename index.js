require('dotenv').config()
const express = require('express')
const getRoute = require('./routes/get')

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/get', getRoute)

var port = process.env.PORT
if (port == null || port === '') {
    port = 8080
}
app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`)
})