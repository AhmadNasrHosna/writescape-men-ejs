const postsCollection = require("../db").db().collection("posts");
const followsCollection = require("../db").db().collection("follows");
const ObjectID = require("mongodb").ObjectID;
const sanitizeHTML = require("sanitize-html");
const User = require("../models/user");

const Post = function (data, userID, requestedPostID) {
  this.data = data;
  this.errors = [];
  this.userID = userID;
  this.requestedPostID = requestedPostID;
};

Post.prototype.cleanUp = function () {
  if (typeof this.data.title != "string") {
    this.data.title = "";
  }

  if (typeof this.data.body != "string") {
    this.data.body = "";
  }

  // Get rid of any bogus properties
  this.data = {
    title: sanitizeHTML(this.data.title.trim(), {
      allowedTags: [],
      allowedAttributes: [],
    }),
    body: sanitizeHTML(this.data.body.trim(), {
      allowedTags: [],
      allowedAttributes: [],
    }),
    createdDate: new Date(),
    author: ObjectID(this.userID),
  };
};

Post.prototype.validate = function () {
  if (this.data.title == "") {
    this.errors.push("You must provide a title");
  }

  if (this.data.body == "") {
    this.errors.push("You must provide post content");
  }
};

Post.prototype.create = function () {
  return new Promise((resolve, reject) => {
    this.cleanUp();
    this.validate();

    if (!this.errors.length) {
      // Save post into database
      postsCollection
        .insertOne(this.data)
        .then((info) => {
          resolve(info.ops[0]._id);
        })
        .catch(() => {
          this.errors.push("Please try again later.");
          reject(this.errors);
        });
    } else {
      reject(this.errors);
    }
  });
};

Post.prototype.update = function () {
  return new Promise(async (resolve, reject) => {
    try {
      let post = await Post.findSingleById(this.requestedPostID, this.userID);

      if (post.isVisitorOwner) {
        // Actually update the db
        let status = await this.actuallyUpdate();
        resolve(status);
      } else {
        reject();
      }
    } catch {
      reject();
    }
  });
};

Post.prototype.actuallyUpdate = function () {
  return new Promise(async (resolve, reject) => {
    this.cleanUp();
    this.validate();

    if (!this.errors.length) {
      // Save into the database
      await postsCollection.findOneAndUpdate(
        { _id: new ObjectID(this.requestedPostID) },
        {
          $set: {
            title: this.data.title,
            body: this.data.body,
          },
        }
      );

      resolve("success");
    } else {
      resolve("failure");
    }
  });
};

Post.delete = function (postToDeleteID, currentUserID) {
  return new Promise(async (resolve, reject) => {
    try {
      let post = await Post.findSingleById(postToDeleteID, currentUserID);

      if (post.isVisitorOwner) {
        // Actually delete the db
        await postsCollection.deleteOne({ _id: new ObjectID(postToDeleteID) });
        resolve();
      } else {
        reject();
      }
    } catch {
      reject();
    }
  });
};

Post.reusablePostQuery = function (uniqueOperations, visitorID) {
  return new Promise(async (resolve, reject) => {
    let aggOperations = uniqueOperations.concat([
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "authorDocument",
        },
      },
      {
        $project: {
          title: 1,
          body: 1,
          createdDate: 1,
          authorID: "$author",
          author: { $arrayElemAt: ["$authorDocument", 0] },
        },
      },
    ]);

    let posts = await postsCollection.aggregate(aggOperations).toArray();

    // Clean up author property in each post object
    posts = posts.map((post) => {
      post.isVisitorOwner = post.authorID.equals(visitorID);
      post.authorID = undefined;

      post.author = {
        username: post.author.username,
        avatar: new User(post.author, true).avatar,
      };

      return post;
    });

    resolve(posts);
  });
};

Post.findSingleById = function (id, visitorID) {
  return new Promise(async (resolve, reject) => {
    if (typeof id != "string" || !ObjectID.isValid(id)) {
      reject();
      return;
    }

    let posts = await Post.reusablePostQuery(
      [{ $match: { _id: new ObjectID(id) } }],
      visitorID
    );

    if (posts.length) {
      resolve(posts[0]);
    } else {
      reject();
    }
  });
};

Post.findByAuthorID = function (authorID) {
  return Post.reusablePostQuery([
    { $match: { author: authorID } },
    { $sort: { createdDate: -1 } },
  ]);
};

Post.search = function (searchTerm) {
  return new Promise(async (resolve, reject) => {
    if (typeof searchTerm == "string") {
      let posts = await Post.reusablePostQuery([
        { $match: { $text: { $search: searchTerm } } },
        { $sort: { score: { $meta: "textScore" } } },
      ]);

      resolve(posts);
    } else {
      reject();
    }
  });
};

Post.countPostsByAuthorID = function (id) {
  return new Promise(async (resolve, reject) => {
    const postCount = await postsCollection.countDocuments({ author: id });
    resolve(postCount);
  });
};

Post.getFeed = async function (id) {
  // Create an array of the user ids that the current user follows
  let followedUsers = await followsCollection
    .find({ authorID: new ObjectID(id) })
    .toArray();

  followedUsers = followedUsers.map((followDoc) => {
    return followDoc.followedID;
  });

  // Look for posts where the author is in the above array of followed users
  return new Post.reusablePostQuery([
    { $match: { author: { $in: followedUsers } } },
    { $sort: { createdDate: -1 } },
  ]);
};

module.exports = Post;
