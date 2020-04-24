const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Post = require("../models/post");
const Follow = require("../models/follow");

exports.sharedProfileData = async function (req, res, next) {
  let isFollowing = false;
  let isVisitorProfile = false;

  if (req.session.user) {
    isVisitorProfile = req.profileUser._id.equals(req.visitorID);

    isFollowing = await Follow.isVisitorFollowing(
      req.profileUser._id,
      req.visitorID
    );
  }

  req.isVisitorProfile = isVisitorProfile;
  req.isFollowing = isFollowing;

  // Retrieve post, follower and following counts
  const postCountPromise = Post.countPostsByAuthorID(req.profileUser._id);
  const followerCountPromise = Follow.countFollowersByID(req.profileUser._id);
  const followingCountPromise = Follow.countFollowingByID(req.profileUser._id);

  const [postCount, followerCount, followingCount] = await Promise.all([
    postCountPromise,
    followerCountPromise,
    followingCountPromise,
  ]);

  req.postCount = postCount;
  req.followerCount = followerCount;
  req.followingCount = followingCount;

  next();
};

exports.mustBeLoggedIn = function (req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.flash("errors", "You must be logged in to perform that action.");
    req.session.save(() => {
      res.redirect("/");
    });
  }
};

exports.apiMustBeLoggedIn = function (req, res, next) {
  try {
    req.apiUser = jwt.verify(req.body.token, process.env.JWTSECRET);
    next();
  } catch {
    res.json("Sorry, you must provide a valid token.");
  }
};

exports.login = function (req, res) {
  let user = new User(req.body);
  user
    .login()
    .then(() => {
      req.session.user = {
        username: user.data.username,
        avatar: user.avatar,
        _id: user.data._id,
      };
      req.session.save(() => {
        res.redirect("/");
      });
    })
    .catch((err) => {
      req.flash("errors", err);
      req.session.save(() => {
        res.redirect("/");
      });
    });
};

exports.apiLogin = function (req, res) {
  let user = new User(req.body);
  user
    .login()
    .then(() => {
      res.json(
        jwt.sign({ _id: user.data._id }, process.env.JWTSECRET, {
          expiresIn: "30d",
        })
      );
    })
    .catch(() => {
      res.json("Not correct");
    });
};

exports.logout = function (req, res) {
  req.session.destroy(() => {
    res.redirect("/");
  });
};

exports.register = function (req, res) {
  let user = new User(req.body);
  user
    .register()
    .then(() => {
      req.session.user = {
        username: user.data.username,
        avatar: user.avatar,
        _id: user.data._id,
      };
      req.session.save(() => {
        res.redirect("/");
      });
    })
    .catch((regErrors) => {
      regErrors.forEach((errMessage) => {
        req.flash("regErrors", errMessage);
      });

      req.session.save(() => {
        res.redirect("/");
      });
    });
};

exports.home = async function (req, res) {
  if (req.session.user) {
    // Fetch feed of posts for current user
    let posts = await Post.getFeed(req.session.user._id);

    res.render("home-dashboard", { posts: posts });
  } else {
    res.render("home-guest", { regErrors: req.flash("regErrors") });
  }
};

exports.ifUserExists = function (req, res, next) {
  User.findByUsername(req.params.username)
    .then((userDocument) => {
      req.profileUser = userDocument;

      next();
    })
    .catch(() => {
      res.render("404");
    });
};

exports.profilePostsScreen = function (req, res) {
  // Ask our post model for posts by a certain author id
  Post.findByAuthorID(req.profileUser._id)
    .then((posts) => {
      res.render("profile", {
        posts: posts,
        currentPage: "posts",
        counts: {
          posts: req.postCount,
          followers: req.followerCount,
          following: req.followingCount,
        },
        profileUsername: req.profileUser.username,
        profileAvatar: req.profileUser.avatar,
        isFollowing: req.isFollowing,
        isVisitorProfile: req.isVisitorProfile,
        title: `${req.profileUser.username} on Writescape`,
      });
    })
    .catch(() => {
      res.render("404");
    });
};

exports.profileFollowersScreen = async function (req, res) {
  try {
    const followers = await Follow.getFollowersByID(req.profileUser._id);
    res.render("profile-followers", {
      followers: followers,
      currentPage: "followers",
      counts: {
        posts: req.postCount,
        followers: req.followerCount,
        following: req.followingCount,
      },
      profileUsername: req.profileUser.username,
      profileAvatar: req.profileUser.avatar,
      isFollowing: req.isFollowing,
      isVisitorProfile: req.isVisitorProfile,
      title: `People following ${req.profileUser.username}`,
    });
  } catch {
    res.render("404");
  }
};

exports.profileFollowingScreen = async function (req, res) {
  try {
    const following = await Follow.getFollowingByID(req.profileUser._id);
    res.render("profile-following", {
      following: following,
      currentPage: "following",
      counts: {
        posts: req.postCount,
        followers: req.followerCount,
        following: req.followingCount,
      },
      profileUsername: req.profileUser.username,
      profileAvatar: req.profileUser.avatar,
      isFollowing: req.isFollowing,
      isVisitorProfile: req.isVisitorProfile,
      title: `People followed by ${req.profileUser.username}`,
    });
  } catch {
    res.render("404");
  }
};

exports.doesUserNameExist = function (req, res) {
  User.findByUsername(req.body.username)
    .then(() => {
      res.json(true);
    })
    .catch(() => {
      res.json(false);
    });
};

exports.doesEmailExist = async function (req, res) {
  let isBeingUsed = await User.doesEmailExist(req.body.email);
  res.json(isBeingUsed);
};

exports.apiGetPostsByUsername = async function (req, res) {
  try {
    const authorDoc = await User.findByUsername(req.params.username);
    let posts = await Post.findByAuthorID(authorDoc._id);
    res.json(posts);
  } catch {
    res.json("Invalid user requested.");
  }
};
