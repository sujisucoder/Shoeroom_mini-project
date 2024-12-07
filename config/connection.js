const mongoClient = require('mongodb').MongoClient;
// or as an es module:
// import { MongoClient } from 'mongodb'

const state = {
  db: null,
};

module.exports.connect = function (done) {
  // Connection URL
  const url = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  // Database Name
  const dbName = 'Shoeroom';

  mongoClient.connect(url, (err, data) => {
    if (err) return done(err);

    state.db = data.db(dbName);
    done();
  });
};

module.exports.get = function () {
  return state.db;
};
