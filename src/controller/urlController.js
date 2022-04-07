const validUrl = require('valid-url')
const shortid = require('short-id')
const redis = require("redis")
const { promisify } = require("util");

const urlModel = require('../model/UrlModel')

//Connect to redis
const redisClient = redis.createClient(
    12684,
    "redis-12684.c91.us-east-1-3.ec2.cloud.redislabs.com",
    { no_ready_check: true }
);
redisClient.auth("RMQYXgrERVXKLUhKTjz8zUlI3SZ9CBmr", function (err) {
    if (err) throw err;
});

redisClient.on("connect", async function () {
    console.log("Connected to Redis..");
});

//Connection setup for redis

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);

const isValid = (value) => {
    if (typeof value === 'undefined' || value === null) return false
    if (typeof value === 'string' && value.trim().length === 0) return false
    return true;
}

const isValidUrl = function(longUrl){
    return /^(http(s)?:\/\/)[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/.test(longUrl)
}

const generateShortUrl = async (req, res) => {

    try {

        const { longUrl } = req.body

        if (!isValid(longUrl)) return res.status(400).send({ status: false, message: "Please enter Url" })

        if (!isValidUrl(longUrl)) return res.status(400).send({ status: false, message: "Url is not valid" })

        const presentUrl = await urlModel.findOne({ longUrl }).select({_id:0, longUrl: 1, shortUrl: 1, urlCode: 1 })

        if (presentUrl) return res.status(200).send({ status: true, data: presentUrl })

        const baseUrl = 'http:localhost:3000'

        if (!validUrl.isUri(baseUrl)) return res.status(400).send({ status: false, message: "baseUrl is not valid" })

        const urlCode = shortid.generate()

        const shortUrl = baseUrl + '/' + urlCode

        const newUrl = {
            longUrl: longUrl,
            shortUrl: shortUrl,
            urlCode: urlCode
        }

        const generatedUrl = await urlModel.create(newUrl)

        await SET_ASYNC(`${newUrl}`, JSON.stringify(newUrl))

        return res.status(201).send({ status: true, data: newUrl })
    }
    catch (error) {
        res.status(500).send({ msg: error.message })
    }
}

//-----------------------------------------------------------------------------------------------------


const getUrl = async (req, res) => {
    try {
        const { urlCode } = req.params;

        if (!isValid(urlCode)) return res.status(400).send({ status: false, message: "Invalid Url" })

        let cahcedUrlData = await GET_ASYNC(`${urlCode}`)  

        if(cahcedUrlData){
            let data = JSON.parse(cahcedUrlData)
            return res.redirect(data.longUrl)
        }

        const result = await urlModel.findOne({ urlCode })
        if (!result) {
            return res.status(404).send({ status: false, message: "Url doesn't exist" });
        }

        await SET_ASYNC(`${urlCode}`, JSON.stringify(result))

        return res.redirect(result.longUrl)


    } catch (error) {
        return res.status(500).send({ status: true, msg: error.message })
    }
}

module.exports.generateShortUrl = generateShortUrl
module.exports.getUrl = getUrl
