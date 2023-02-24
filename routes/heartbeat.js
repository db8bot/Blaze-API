const express = require('express')
const router = express.Router()
const os = require('os')
const process = require('process')

router.get('/', (req, resApp) => {
    // no api key needed
    let response = {
        status: true,
        // server information
        arch: os.arch(),
        platform: os.platform(),
        cpus: os.cpus(),
        load: os.loadavg(),
        uptime: os.uptime(),
        totalMem: os.totalmem(),
        mem: process.memoryUsage()
    }
    resApp.json(response)
})

module.exports = router