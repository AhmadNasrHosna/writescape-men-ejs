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
        const msg = `
          <span class="c-notice__icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="gridicon gridicons-checkmark notice__icon" height="24" width="24"><g><path d="M9 19.414l-6.707-6.707 1.414-1.414L9 16.586 20.293 5.293l1.414 1.414"></path></g></svg>
          </span>
          <span class="c-notice__content">Post updated! <a href='#'>Visit post</a>.</span>
          <button class="c-notice__dismiss" aria-label="Dismiss">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="gridicon gridicons-cross" height="24" width="24" > <g><path d="M18.36 19.78L12 13.41l-6.36 6.37-1.42-1.42L10.59 12 4.22 5.64l1.42-1.42L12 10.59l6.36-6.36 1.41 1.41L13.41 12l6.36 6.36z"></path></g> </svg>
          </button>
        `;
        req.flash("success", msg);
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
