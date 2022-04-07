const express = require("express")
const router = express.Router()
const UrlController = require("../controller/urlController")

router.post("/url/shorten",UrlController.generateShortUrl)

router.get("/:urlCode",UrlController.getUrl)

// handle wrong end-point
router.get("*", (req, res) => {
    return res.status(400).send({error:'Invalid code'})
})

router.post("*", (req, res) => {
    return res.status(404).send({error:'page not found'})
})


module.exports = router;

