var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");
var path = require("path");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 8080;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

var exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({
  defaultLayout: "main",
  partialsDir: path.join(__dirname, "/views/layouts/partials")
}));
app.set("view engine", "handlebars");

// Connect to the Mongo DB
var MONGODB_URI = process.env.MONGODB_URI || ("mongodb://localhost/unit18Populater");
mongoose.connect(MONGODB_URI);
// Routes

// A GET route for scraping the echoJS website

app.get("/scrape", function (req, res) {
  console.log("I'm scraping okay!")
  // here empty
  // First, we grab the body of the html with axios
  axios.get("https://www.technewsworld.com/").then(function (response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // Now, we grab every h2 within an article tag, and do the following:
    $("div.story-list").each(function (i, element) {
      // Save an empty result object
      var result = {};


      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(element)
        .children("div.title")
        .children("a")
        .text();
      result.summary = $(element)
        .children("div.teaser")
        .text();
      result.link = $(element)
        .children("div.image")
        .children()
        .attr("href");
      if (result.link) {
        result.link = "https://www.technewsworld.com" + result.link
      }
      result.img = $(element)
        .children("div.image")
        .children()
        .children()
        .attr("src");
      if (result.img) {
        result.img = "https://www.technewsworld.com" + result.img
      }
      if (result.title){
      // Create a new Article using the `result` object built from scraping
      db.Article.find()
        .then(function (allArticles) {
          var newArticle = true
          allArticles.forEach(function (article) {
            if (article.title === result.title) {
              newArticle = false
            }
          })
          if (newArticle) {
            db.Article.create(result)
              .then(function (dbArticle) {
                // View the added result in the console
                dbArticle
              })
              .catch(function (err) {
                // If an error occurred, log it
                console.log(err);
              });
          }
        })
      }
    });
    res.render("index", { dbArticle: result })
    // Send a message to the client
    // console.log(result)
  });
});

// Route for getting all Articles from the db
app.get("/articles", function (req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function (dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

app.get("/", function (req, res) {
  db.Article.find(function (error, data) {
      var hbsObject = {
          articles: data
      };
      // console.log(hbsObject);
      res.render("index", hbsObject);
  });
});

app.get("/saved", function (req, res) {
  db.Article.find({ "saved": true }).exec(function (error, data) {
      var hbsObject = {
          articles: data
      };
      res.render("saved", hbsObject);
});
});

app.post("/articles/save/:id", function (req, res) {
    // Use the article id to find and update its saved boolean
    db.Article.findOneAndUpdate({ "_id": req.params.id }, { "saved": true })
        // Execute the above query
        .exec(function (err, data) {
            // Log any errors
            if (err) {
                console.log(err);
            }
            else {

                res.send(data);
            }
        });
      });
// Start the server
app.listen(PORT, function () {
  console.log("App running on port " + PORT + "!");
});
