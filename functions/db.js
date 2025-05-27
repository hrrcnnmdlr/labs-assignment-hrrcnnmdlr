const { MongoClient } = require("mongodb");

async function connectDB() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db(process.env.DB_NAME);
  return { collection: db.collection("flashcards"), client };
}

module.exports = connectDB;
