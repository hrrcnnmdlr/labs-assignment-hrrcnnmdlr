const { MongoClient } = require("mongodb");

async function connectDB() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db(process.env.DB_NAME);
  return { db, client };
}

module.exports = connectDB;
