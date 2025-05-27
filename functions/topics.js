const connectDB = require("./db");
const { ObjectId, isValidObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

function isValidHexId(id) {
  return typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);
}

function getUserIdFromAuth(event) {
  const auth = event.headers && (event.headers.authorization || event.headers.Authorization);
  if (!auth || !auth.startsWith("Bearer ")) return null;
  try {
    const token = auth.slice(7);
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.userId;
  } catch {
    return null;
  }
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const { db, client } = await connectDB();
    const topics = db.collection("topics");
    // --- AUTH ---
    const userId = getUserIdFromAuth(event);
    if (!userId) {
      await client.close();
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
    }

    if (event.httpMethod === "GET") {
      // Перевірка, чи існує колекція topics
      const collections = await db.listCollections({ name: "topics" }).toArray();
      if (collections.length === 0) {
        await db.createCollection("topics");
        const defaultTopics = [
          { name: "Загальна", userId },
          { name: "Англійська", userId },
          { name: "Історія", userId },
        ];
        await topics.insertMany(defaultTopics);
        await client.close();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(defaultTopics),
        };
      }
      const all = await topics.find({ userId }).toArray();
      await client.close();
      return { statusCode: 200, headers, body: JSON.stringify(all) };
    }

    if (event.httpMethod === "POST") {
      const { name, color } = JSON.parse(event.body || "{}");
      if (!name) {
        await client.close();
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Name required" }),
        };
      }
      const topic = { name, userId, color: color || '#e0eaff' };
      const result = await topics.insertOne(topic);
      await client.close();
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ _id: result.insertedId, ...topic }),
      };
    }

    if (event.httpMethod === "PUT") {
      const { id, name, color } = JSON.parse(event.body || "{}");
      if (!id || !name) {
        await client.close();
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "id and name required" }),
        };
      }
      await topics.updateOne({ _id: new ObjectId(id), userId }, { $set: { name, color } });
      await client.close();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true }),
      };
    }

    if (event.httpMethod === "DELETE") {
      const { id } = JSON.parse(event.body || "{}");
      if (!id) {
        await client.close();
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "id required" }),
        };
      }
      await topics.deleteOne({ _id: new ObjectId(id), userId });
      await client.close();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true }),
      };
    }

    await client.close();
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Internal Server Error" }),
    };
  }
};
