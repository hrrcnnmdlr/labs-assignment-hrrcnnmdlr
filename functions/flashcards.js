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

// Додаємо підтримку deck (колода) як parent для flashcards
// Додаємо розширене оброблення помилок

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const { db, client } = await connectDB();
    const collection = db.collection("flashcards");
    const pathParts = event.path.split("/").filter(Boolean);
    let id = null;
    if (pathParts.length > 3 && pathParts[2] === "flashcards") {
      id = pathParts[3];
    }

    // --- AUTH ---
    const userId = getUserIdFromAuth(event);
    if (!userId) {
      await client.close();
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
    }

    switch (event.httpMethod) {
      case "GET": {
        // GET /flashcards or /flashcards/:id or /flashcards?deck=deckId
        if (id && id !== 'flashcards') {
          if (!isValidHexId(id)) return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid id format" }) };
          const card = await collection.findOne({ _id: new ObjectId(id), userId });
          if (!card) return { statusCode: 404, headers, body: JSON.stringify({ error: "Not found" }) };
          await client.close();
          return { statusCode: 200, headers, body: JSON.stringify(card) };
        } else {
          let skip = 0, take = 20, deck;
          if (event.queryStringParameters) {
            skip = event.queryStringParameters.skip || 0;
            take = event.queryStringParameters.take || 20;
            deck = event.queryStringParameters.deck;
          }
          const query = { userId };
          if (deck) query.deckId = deck;
          const cards = await collection.find(query).skip(Number(skip)).limit(Number(take)).toArray();
          await client.close();
          return { statusCode: 200, headers, body: JSON.stringify(cards) };
        }
      }
      case "POST": {
        let data;
        try {
          data = JSON.parse(event.body);
        } catch (e) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON in request body" }) };
        }
        if (!data.question || !data.answer || !data.topicId) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: "'question', 'answer' і 'topicId' обов'язкові" }) };
        }
        const now = new Date();
        const card = {
          question: data.question,
          answer: data.answer,
          topicId: data.topicId,
          userId,
          status: data.status || "new",
          createdAt: now,
          updatedAt: now
        };
        const result = await collection.insertOne(card);
        await client.close();
        return { statusCode: 201, headers, body: JSON.stringify({ _id: result.insertedId, ...card }) };
      }
      case "PUT": {
        if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing id" }) };
        if (!isValidHexId(id)) return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid id format" }) };
        let updateData;
        try {
          updateData = JSON.parse(event.body);
        } catch (e) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON in request body" }) };
        }
        if (updateData.deckId && !isValidHexId(updateData.deckId)) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid deckId format" }) };
        }
        updateData.updatedAt = new Date();
        const result = await collection.updateOne({ _id: new ObjectId(id), userId }, { $set: updateData });
        if (result.matchedCount === 0) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: "Not found or forbidden" }) };
        }
        await client.close();
        return { statusCode: 200, headers, body: JSON.stringify({ _id: id, ...updateData }) };
      }
      case "DELETE": {
        if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing id" }) };
        if (!isValidHexId(id)) return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid id format" }) };
        const result = await collection.deleteOne({ _id: new ObjectId(id), userId });
        if (result.deletedCount === 0) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: "Not found or forbidden" }) };
        }
        await client.close();
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }
      default:
        await client.close();
        return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
    }
  } catch (error) {
    // Розширене логування помилок
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message, stack: error.stack })
    };
  }
};
