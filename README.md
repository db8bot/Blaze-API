# Blaze-API
General service API for db8bot to handle high intensity workloads such as web scraping, research journal requests & OCR

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fdb8bot%2FBlaze-API.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Fdb8bot%2FBlaze-API?ref=badge_large)

## Build from source

This project uses [Doppler](https://doppler.com) to manage secrets. Please register an account, setup a project, and grab an access token.

This project makes use of the [SerpApi](https://serpapi.com/) to search Google Scholar. They offer a free tier with 100 searches/month. Signup for an account, enable the Google Scholar search of the API and grab your API key.

This API has the following secrets:
```env
SERPAPIKEY=<Your SERP API Key>
POSTBACKURL=<db8bot HTTP Server IP/URL>
AUTH=<Authentication key for Blaze API>
MONGOUSER=<db8bot MongoDB user>
MONGOPASS=<db8bot MongoDB password>
```
You can either run `npm run build` (`npm run buildarm` if you are on an ARM processor) or just import those secrets into the environment to run the API.

## Features

* Journal request logic in `routes/get.js`
* Live monitoring hook in `routes/heartbeat.js`
* OCR logic in `routes/ocr.js`
* Follow email receipt procesing service in `routes/sendgridreceive.js`

## Contributors

* *AirFusion45* - Original Author

## License 
This Project is licensed under MIT License - see the LICENSE.md file for more details. The main points of the MIT License are:
  
  * This code can be used commercially
  * This code can be modified
  * This code can be distributed
  * This code can be used for private use
  * This code has no Liability
  * This code has no Warranty
  * When using this code, credit must be given to the author

## Privacy

Please see db8bot's privacy policy.

## Contact Me
Feel free to contact me if you find bugs, license issues, missing credits, etc.

  * Please contact me here:
    * Email: jim@db8bot.app
    * Discord: AirFusion#5112
