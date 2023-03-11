const express = require('express')
const router = express.Router()
const multer = require('multer')
const upload = multer()
const MongoClient = require('mongodb').MongoClient
const uri = `mongodb+srv://${process.env.MONGOUSER}:${process.env.MONGOPASS}@db8botcluster.q3bif.mongodb.net/db8bot?retryWrites=true&w=majority`
const database = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true })
const superagent = require('superagent')


async function byeProcessing(msg) {

    let byeTeam = msg.body.replace('BYE', '').trim().replace(/\n/g, '').replace(/\t/g, '')

    let returnData = { // follow standard schema
        subject: msg.subject,
        bye: true,
        byeTeam: byeTeam,
        searchTeam1: null,
        searchTeam2: null,
        sidelock: null,
        flip: null,
        competitionTeamsStr: null,
        judging: null,
        start: null,
        flight: null,
        room: null,
        extraInfo: null,
        map: null
    }

    return (returnData)
}

async function defaultProcessing(msg) {

    // competitor processing
    let competitionTeamsStr = msg.text.substring(0, msg.toLowerCase().indexOf('judging:')).replace(/\n/gmi, ' ').replace(/\r/gmi, ' ').trim() // tabromm doesnt use \r whereas gmail does. the \r replace is for when its from gmail (testing), \n is for prod

    // competitor processing: side lock and flip processing
    var sidelock
    if (competitionTeamsStr.toLowerCase().includes('side locked')) {
        sidelock = true
    }
    var flip
    if (competitionTeamsStr.toLowerCase().includes('(flip)')) {
        flip = true
    }

    let combinedTeamsArr = competitionTeamsStr.split('vs.')
    if (!flip) { // no flip - this means each team has assigned "aff/neg" or "pro/con" sides - these need to be trimmed
        combinedTeamsArr.forEach((x, index) => {
            // this is only for policy as of now. pf prob says pro/con. also flip for sides may come before [0]
            if (x.trim().substring(0, 4) === 'Aff ') {
                combinedTeamsArr[index] = x.replace('Aff ', '').trim()
            } else if (x.trim().substring(0, 4) === 'Neg ') {
                combinedTeamsArr[index] = x.replace('Neg ', '').trim()
            } else if (x.trim().substring(0, 4) === 'Pro ') {
                combinedTeamsArr[index] = x.replace('Pro ', '').trim()
            } else if (x.trim().substring(0, 4) === 'Con ') {
                combinedTeamsArr[index] = x.replace('Con ', '').trim()
            }
        })
    } else { // otherwise just split by the vs. and trim extra spaces off of each element
        combinedTeamsArr = combinedTeamsArr.map(x => x.trim())
    }

    msg.text = msg.text.replace(msg.text.substring(0, msg.text.indexOf('Judging:')), '')

    // judges processing
    let judges = msg.text.match(/(?<=judging:)[\s\S]*(?=start)/gmi)[0].split('\n')
    judges = judges.map(x => x.replace(/\r/gmi, '').trim())
    judges = judges.filter(x => x) // res: array of judges, len = 1 for 1 judge

    msg.text = msg.text.replace(msg.text.substring(0, msg.text.indexOf(judges[judges.length - 1]) + judges[judges.length - 1].length), '')

    // start time
    var start = msg.text.match(/((.|\n)*)(?=room:)/gmi)[0]
    // start time flight processing
    if (start.toLowerCase().includes('flt') || start.toLowerCase().includes('flight')) {
        var flightNum = start.match(/(?<=(flt|flight)) [0-9][\s|s]*(?=start)/gmi)[0].trim()

        start = start.substring(start.indexOf('Start')).replace('Start', '').replace(/\n/gmi, '').replace(/\r/gmi, '').trim()
    } else {
        start = start.replace('Start', '').replace(/\n/g, '').replace(/\r/g, '').trim()
    }
    msg.text = msg.text.replace(msg.text.substring(0, msg.text.indexOf('Room:')), '')
    msg.text = msg.text.trim()

    // rooms
    var room
    if (msg.text.toLowerCase().includes('message: ')) { // text includes message: to hook to
        room = msg.text.match(/(?<=room:)[\s\S]*(?=message:)/gmi)[0].replace(/\n/gmi, '').replace(/\r/gmi, '').trim()
        msg.text = msg.text.replace(`Room: ${room}`, '')
    } else if (msg.text.toLowerCase().includes('pronouns: ') && !msg.text.toLowerCase().includes('message: ')) { // text includes pronouns to hook to
        // match everything until the start of the line containing the word "pronoun"
        room = msg.text.match(/^(?:(?!pronouns).)*$/gmi)[0].replace('Room: ', '').replace(/\n/g, '').replace(/\r/g, '').trim()
        msg.text = msg.text.replace(`Room: ${room}`, '')
    } else if ((msg.text.toLowerCase().includes('map: ')) && (!msg.text.toLowerCase().includes('pronouns: ') && !msg.text.toLowerCase().includes('message: '))) { // includes map, no pronouns & no messages
        room = msg.text.match(/^(?:(?!map).)*$/gmi)[0].replace('Map: ', '').replace(/\n/g, '').replace(/\r/g, '').trim()
        msg.text = msg.text.replace(`Room: ${room}`, '')
    } else { // doesn't include messages or pronouns or map - match to the end
        room = msg.text.replace('Room: ').replace(/\n/g, '').replace(/\r/g, '').trim()
    }

    // messages + pronouns
    var messages
    if (msg.text.toLowerCase().includes('message: ') || msg.text.toLowerCase().includes('pronouns: ')) {
        if (msg.text.toLowerCase().includes('map: ')) {
            messages = msg.text.match(/((.|\n)*)(?=map:)/gmi)[0].replace('Message: ', '').replace(/\n/g, '').replace(/\r/g, '').trim()
            msg.text = msg.text.replace(msg.text.match(/((.|\n)*)(?=map:)/gmi)[0], '')
        } else { // no map - match to end
            messages = msg.text.replace('Message: ', '').replace(/\n/g, '').replace(/\r/g, '').trim()
        }
    }

    // map

    var map
    if (msg.text.toLowerCase().includes('map: ')) {
        map = msg.text.replace('Map: ', '').replace(/\n/g, '').replace(/\r/g, '').trim()
    }



    let returnData = { // follow standard schema
        subject: msg.subject,
        bye: false,
        byeTeam: null,
        searchTeam1: combinedTeamsArr[0],
        searchTeam2: combinedTeamsArr[1],
        sidelock: sidelock,
        flip: flip,
        competitionTeamsStr: competitionTeamsStr,
        judging: judges,
        start: start,
        flight: flightNum,
        room: room,
        extraInfo: messages,
        map: map
    }

    return returnData
}

async function postback(unifiedObject) {
    return new Promise((resolve, reject) => {
        superagent
            .post(`${process.env.POSTBACKURL}/followinbound`)
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send(unifiedObject)
            .end((err, res) => {
                if (err) {
                    reject(err)
                }
            })
    })
}

router.post('/', upload.any(), async (req, resApp) => {

    // console.log(req.body)

    // satisfy sendgrid - no blockages! 
    resApp.status(200).send('OK')


    let sender = req.body.from.match(/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/gmi)[0]

    if ((sender === 'blasts@www.tabroom.com' || sender === 'yfang@thecollegepreparatoryschool.org')) {

        const dbClient = await database.connect()
        const collection = dbClient.db('db8bot').collection('tabroomLiveUpdates')

        let msg = {
            subject: req.body.subject,
            date: new Date(req.body.headers.match(/Date: .+?(?=\n)/gmi)[0].trim().replace('Date: ', '')),
            body: req.body.text,
        }

        /* 
            func return schema:
        {
            subject/title: '...',
            bye: t/f
            byeTeam: '...',
            searchTeam1
            searchTeam2
            original competition str w/ sides aff & neg
            judging
            start time
            room
            extra info (messages +pronouns)
            map (only sometimes)
        }

        ultimate return schema:
        {
            func return schema
            +
            notify arr
            tourn name - footer      
        }
        */

        if (msg.body.includes('BYE')) {

            let byeProcessingData = await byeProcessing(msg)

            // search db for byeTeam
            let byeDBQuery = await collection.find({
                trackedTeamCode: byeProcessingData.byeTeam,
                tournStart: {
                    $lte: msg.date.getTime()
                },
                tournEnd: {
                    $gte: msg.date.getTime()
                }
            }).toArray() // [tourn start]---<email date>---[tourn end]


            if (byeDBQuery.length > 0) { // find server, find channel, send message - team exists!
                console.log(`team name found in db!`)
                let unifiedReturn = {
                    ...returnData,
                    notify: byeDBQuery[0].notify,
                    tournName: byeDBQuery[0].tournName
                }
                await postback(unifiedReturn)
            }

        }
        // else if () { // diff: "normal processing" , default need handle multi judge panels | side locked | (flip)
        // }
        else {
            console.log(await defaultProcessing(msg))
        }
    }
})

module.exports = router