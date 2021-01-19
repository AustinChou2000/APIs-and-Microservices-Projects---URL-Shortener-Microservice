"use strict";

var express = require("express");
var mongo = require("mongodb");
var mongoose = require("mongoose");
const dns = require("dns");

var cors = require("cors");
require("dotenv").config();

var app = express();

// Basic Configuration
var port = process.env.PORT || 3000;

/** this project needs a db !! **/

// mongoose.connect(process.env.DB_URI);

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here

app.use("/public", express.static(process.cwd() + "/public"));

app.get("/", function(req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// your first API endpoint...
app.get("/api/hello", function(req, res) {
  res.json({ greeting: "hello API" });
});

app.listen(port, function() {
  console.log("Node.js listening ...");
});

/* Database Connection */
let uri =
  "mongodb+srv://freecodecamp:" +
  process.env.PW +
  "@freecodecamp.pzib3.mongodb.net/db1?retryWrites=true&w=majority";
mongoose.connect(uri, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
  useFindAndModify: false
});
const connection = mongoose.connection;
connection.once("open", () => {
  console.log("MongoDB database connection established successfully");
});

let urlSchema = new mongoose.Schema({
  original: { type: String, required: true },
  short: Number
});

let Url = mongoose.model("Url", urlSchema);

let bodyParser = require("body-parser");
let responseObject = {};
app.post(
  "/api/shorturl/new",
  bodyParser.urlencoded({ extended: false }),
  (request, response) => {
    let inputUrl = request.body["url"];

    //   let urlRegex = new RegExp(/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi)

    //   if(!inputUrl.match(urlRegex)){
    //     response.json({error: 'invalid url'})
    //     return
    //   }

    //var regex = /\/\/([^\/,\s]+\.[^\/,\s]+?)(?=\/|,|\s|$|\?|#)/g;

    // let matchUrl = inputUrl.match(/https?:\/\/([^\/,\s]+\.[^\/,\s]+?)(?=\/|,|\s|$|\?|#)/g)

    let matchUrl1 = inputUrl.replace(/^https?:\/\//, "");
    //let matchUrl=matchUrl1.match(/[^\/]+/);
    let matchUrl = matchUrl1.split("/")[0];

    dns.lookup(matchUrl, (err, addresses, family) => {
      if (err) {
        return response.json({ error: "invalid url" });
      } else {
        responseObject["original_url"] = inputUrl;
        let inputShort = 1;

        Url.findOne({})
          .sort({ short: "desc" })
          .exec((error, result) => {
            if (!error && result != undefined) {
              inputShort = result.short + 1;
            }
            if (!error) {
              Url.findOneAndUpdate(
                { original: inputUrl },
                { original: inputUrl, short: inputShort },
                { new: true, upsert: true },
                (error, savedUrl) => {
                  if (!error) {
                    responseObject["short_url"] = savedUrl.short;
                    response.json(responseObject);
                  }
                }
              );
            }
          });
      }
    });
  }
);

app.get("/api/shorturl/:input", (request, response) => {
  var urlInput = request.params.input;
  console.log(urlInput);

  Url.findOne({ short: urlInput }, (error, result) => {
    if (error) return response.send("Error reading database");

    var re = new RegExp("^(http|https)://", "i");
    var strToCheck = result.original;
    if (re.test(strToCheck)) {
      response.redirect(301, result.original);
    } else {
      response.redirect(301, "http://" + result.original);
    }
  });
});
