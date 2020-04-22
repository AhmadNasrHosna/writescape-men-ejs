const usersCollection = require("../db").db().collection("users");
const followsCollection = require("../db").db().collection("follows");
const User = require("./user");
const { ObjectID } = require("mongodb");

let Follow = function (followedUsername, authorID) {
  this.followedUsername = followedUsername;
  this.authorID = authorID;
  this.errors = [];
};

Follow.prototype.cleanUp = function () {
  if (typeof this.followedUsername != "string") {
    this.followedUsername = "";
  }
};

Follow.prototype.validate = async function (action) {
  // Followed username must exist in database
  const followedAccount = await usersCollection.findOne({
    username: this.followedUsername,
  });

  if (followedAccount) {
    this.followedAccountID = followedAccount._id;
  } else {
    this.errors.push("You cannot follow a user that does not exits.");
  }

  let doesFollowAlreadyExist = await followsCollection.findOne({
    followedID: this.followedAccountID,
    authorID: new ObjectID(this.authorID),
  });

  if (action == "create") {
    if (doesFollowAlreadyExist) {
      this.errors.push("You are already following this user!");
    }
  }

  if (action == "delete") {
    if (!doesFollowAlreadyExist) {
      this.errors.push(
        "You cannot stop following someone you do not already follow!"
      );
    }
  }

  // should not be able to follow yourself
  if (this.followedAccountID.equals(this.authorID)) {
    this.errors.push("You cannot follow yourself!");
  }
};

Follow.prototype.create = function () {
  return new Promise(async (resolve, reject) => {
    this.cleanUp();
    await this.validate("create");

    if (!this.errors.length) {
      await followsCollection.insertOne({
        followedID: this.followedAccountID,
        authorID: new ObjectID(this.authorID),
      });

      resolve();
    } else {
      reject(this.errors);
    }
  });
};

Follow.prototype.delete = function () {
  return new Promise(async (resolve, reject) => {
    this.cleanUp();
    await this.validate("delete");

    if (!this.errors.length) {
      await followsCollection.deleteOne({
        followedID: this.followedAccountID,
        authorID: new ObjectID(this.authorID),
      });

      resolve();
    } else {
      reject(this.errors);
    }
  });
};

Follow.isVisitorFollowing = async function (followedID, visitorID) {
  let followDoc = await followsCollection.findOne({
    followedID: followedID,
    authorID: new ObjectID(visitorID),
  });

  if (followDoc) {
    return true;
  } else {
    return false;
  }
};

Follow.getFollowersByID = function (id) {
  return new Promise(async (resolve, reject) => {
    try {
      let followers = await followsCollection
        .aggregate([
          { $match: { followedID: id } },
          {
            $lookup: {
              from: "users",
              localField: "authorID",
              foreignField: "_id",
              as: "userDoc",
            },
          },
          {
            $project: {
              username: { $arrayElemAt: ["$userDoc.username", 0] },
              email: { $arrayElemAt: ["$userDoc.email", 0] },
            },
          },
        ])
        .toArray();

      followers = followers.map((follower) => {
        // create a user
        let user = new User(follower, true);

        return {
          username: follower.username,
          avatar: user.avatar,
        };
      });

      resolve(followers);
    } catch {
      reject();
    }
  });
};

Follow.getFollowingByID = function (id) {
  return new Promise(async (resolve, reject) => {
    try {
      let following = await followsCollection
        .aggregate([
          { $match: { authorID: id } },
          {
            $lookup: {
              from: "users",
              localField: "followedID",
              foreignField: "_id",
              as: "userDoc",
            },
          },
          {
            $project: {
              username: { $arrayElemAt: ["$userDoc.username", 0] },
              email: { $arrayElemAt: ["$userDoc.email", 0] },
            },
          },
        ])
        .toArray();

      following = following.map((followedUser) => {
        // create a user
        let user = new User(followedUser, true);

        return {
          username: followedUser.username,
          avatar: user.avatar,
        };
      });

      resolve(following);
    } catch {
      reject();
    }
  });
};

Follow.countFollowersByID = function (id) {
  return new Promise(async (resolve, reject) => {
    const followerCount = await followsCollection.countDocuments({
      followedID: id,
    });
    resolve(followerCount);
  });
};

Follow.countFollowingByID = function (id) {
  return new Promise(async (resolve, reject) => {
    const followingCount = await followsCollection.countDocuments({
      authorID: id,
    });
    resolve(followingCount);
  });
};

module.exports = Follow;
