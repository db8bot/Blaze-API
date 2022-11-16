(async () => {
    const { createWorker, createScheduler } = require('tesseract.js')
    const scheduler = createScheduler();
    const worker = createWorker();
    await worker.load();
    await worker.loadLanguage();
    await worker.initialize();
    scheduler.addWorker(worker);

    const worker2 = createWorker();
    await worker2.load();
    await worker2.loadLanguage();
    await worker2.initialize();
    scheduler.addWorker(worker2);
    console.time()
    const data2 = await scheduler.addJob('recognize', `https://cdn.discordapp.com/attachments/900260322378653729/1038726875247292477/image.png`, {}, '75442486-0878-440c-9db1-a7006c25a39f');

    // https://cdn.discordapp.com/attachments/900260322378653729/1041108058362880040/file.jpg

    // const data = await scheduler.addJob('recognize', `https://cdn.discordapp.com/attachments/900260322378653729/1038726875247292477/image.png`);
    console.log(data2)
    // console.log(data.data.text)
    console.timeEnd()
})();

// 1 worker 1 job: 5.373s
// 1 worker 2 job: 5.963s
// 2 worker 1 job: 2.223s
// 2 worker 2 job: 5.819s
// 2 worker 1 job full implementation: 4.617s
// 1 worker 1 job full implementation: 4.733s