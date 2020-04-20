const Post = require("../models/post");

exports.viewCreateScreen = function (req, res) {
  res.render("create-post");
};

exports.create = function (req, res) {
  const post = new Post(req.body, req.session.user._id);
  post
    .create()
    .then((theNewPostID) => {
      req.flash("success", "New post successfully created.");
      req.session.save(() => res.redirect(`/post/${theNewPostID}`));
    })
    .catch((errors) => {
      errors.forEach((err) => req.flash("errors", err));
      req.session.save(() => res.redirect(`/create-post`));
    });
};

exports.viewSingle = async function (req, res) {
  try {
    let post = await Post.findSingleById(req.params.id, req.visitorID);
    res.render("post", { post: post });
  } catch {
    res.render("404");
  }
};

exports.viewEditScreen = async function (req, res) {
  try {
    let post = await Post.findSingleById(req.params.id, req.visitorID);

    if (post.isVisitorOwner) {
      // If the user is the owner of the post
      res.render("edit-post", { post: post });
    } else {
      // If the user was just a visitor
      req.flash("errors", "You do not have permission to perform that action.");
      req.session.save(() => res.redirect("/"));
    }
  } catch {
    res.render("404");
  }
};

exports.edit = function (req, res) {
  let post = new Post(req.body, req.visitorID, req.params.id);
  post
    .update()
    .then((status) => {
      // If the post was successfully updated in the database
      // Or if the user did have permission , but there were validation errors
      if (status == "success") {
        // post was updated in the database
        req.flash("success", "Post successfully updated.");
        req.session.save(() => res.redirect(`/post/${req.params.id}/edit`));
      } else {
        post.errors.forEach((error) => req.flash("errors", error));

        req.session.save(() => res.redirect(`/post/${req.params.id}/edit`));
      }
    })
    .catch(() => {
      // If a post with the requested id doesn't exit
      // Or if the current visitor is not the owner of the requested post
      req.flash("errors", "You do not have permission to perform that action.");
      req.session.save(() => res.redirect("/"));
    });
};

exports.delete = function (req, res) {
  Post.delete(req.params.id, req.visitorID)
    .then(() => {
      req.flash("success", "Post successfully deleted.");
      req.session.save(() =>
        res.redirect(`/profile/${req.session.user.username}`)
      );
    })
    .catch(() => {
      // If a post with the requested id doesn't exit
      // Or if the current visitor is not the owner of the requested post
      req.flash("errors", "You do not have permission to perform that action.");
      req.session.save(() => res.redirect("/"));
    });
};

exports.search = function (req, res) {
  Post.search(req.body.searchTerm)
    .then((posts) => {
      res.json(posts);
    })
    .catch(() => {
      res.json([]);
    });
};
