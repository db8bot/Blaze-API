
const express = require('express')
const router = express.Router()
const multer = require('multer')
const upload = multer()

router.post('/', upload.any(), async (req, resApp) => {

      console.log(req.body)
      resApp.status(200).send('OK')


})
module.exports = router