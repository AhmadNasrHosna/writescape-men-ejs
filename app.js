const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo")(session);
const flash = require("connect-flash");
const moment = require("moment");
const markdown = require("marked");
const sanitizeHTML = require("sanitize-html");
const csrf = require("csurf");

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use("/api", require("./router-api"));

app.use(express.static("public"));
app.set("views", "views");
app.set("view engine", "ejs");

const sessionOptions = session({
  secret: "Lorem ipsum dolor sit amet.",
  store: new MongoStore({ client: require("./db") }),
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    httpOnly: true,
  },
});

app.use(sessionOptions);
app.use(flash());

app.use((req, res, next) => {
  // Make current user id available on the req object
  if (req.session.user) {
    req.visitorID = req.session.user._id;
  } else {
    req.visitorID = 0;
  }

  // Make user session data available from within the view templates
  res.locals.user = req.session.user;

  // Make all errors and success available from within the view templates
  res.locals.errors = req.flash("errors");
  res.locals.success = req.flash("success");

  // Make markdown available from within the view templates
  res.locals.filterUserHTML = function (content) {
    return markdown(content);
  };

  // Make moment library available from within the view templates
  res.locals.moment = moment;

  // Make the URL of the current page available from within the view templates
  res.locals.pageURL = req.protocol + "://" + req.get("host") + req.originalUrl;

  next();
});

const router = require("./router");

app.use(csrf());

app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use("/", router);

app.use((err, req, res, next) => {
  if (err) {
    if (err.code == "EBADCSRFTOKEN") {
      req.flash("errors", "Cross-site request forgery detected.");
      req.session.save(() => res.redirect("/"));
    } else {
      res.render("404");
    }
  }
});

const server = require("http").createServer(app);

const io = require("socket.io")(server);

io.use((socket, next) => {
  sessionOptions(socket.request, socket.request.res, next);
});

io.on("connection", (socket) => {
  if (socket.request.session.user) {
    const user = socket.request.session.user;

    socket.emit("welcome", {
      username: user.username,
      avatar: user.avatar,
    });

    socket.on("chatMessageFromBrowser", (data) => {
      socket.broadcast.emit("chatMessageFromServer", {
        message: sanitizeHTML(data.message, {
          allowedAttributes: {},
          allowedTags: [],
        }),
        username: user.username,
        avatar: user.avatar,
      });
    });
  }
});

module.exports = server;

// Node / Express: EADDRINUSE, Address already in use - Kill server
// https://stackoverflow.com/questions/4075287/node-express-eaddrinuse-address-already-in-use-kill-server
// ENV FILE
// https://stackoverflow.com/questions/43664565/why-do-people-put-the-env-into-gitignore/43664611
