


if (req.body.auth === process.env.AUTH) {
    return resApp.status(401).send('Invalid API Key or no authentication provided.')
}