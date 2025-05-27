const connectDB = require("./db");
const { ObjectId, isValidObjectId } = require("mongodb");

function isValidHexId(id) {
  return typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);
}

// Додаємо підтримку deck (колода) як parent для flashcards
// Додаємо розширене оброблення помилок

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const collection = await connectDB();
    const pathParts = event.path.split("/").filter(Boolean);
    // Netlify local dev: pathParts = [".netlify", "functions", "flashcards", id?]
    let id = null;
    if (pathParts.length > 3 && pathParts[2] === "flashcards") {
      id = pathParts[3];
    }

    switch (event.httpMethod) {
      case "GET": {
        // GET /flashcards or /flashcards/:id or /flashcards?deck=deckId
        if (id && id !== 'flashcards') {
          if (!isValidHexId(id)) return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid id format" }) };
          const card = await collection.findOne({ _id: new ObjectId(id) });
          if (!card) return { statusCode: 404, headers, body: JSON.stringify({ error: "Not found" }) };
          return { statusCode: 200, headers, body: JSON.stringify(card) };
        } else {
          let skip = 0, take = 20, deck;
          if (event.queryStringParameters) {
            skip = event.queryStringParameters.skip || 0;
            take = event.queryStringParameters.take || 20;
            deck = event.queryStringParameters.deck;
          }
          const query = deck ? { deckId: deck } : {};
          const cards = await collection.find(query).skip(Number(skip)).limit(Number(take)).toArray();
          return { statusCode: 200, headers, body: JSON.stringify(cards) };
        }
      }
      case "POST": {
        // Add new flashcard, support deckId
        let data;
        try {
          data = JSON.parse(event.body);
        } catch (e) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON in request body" }) };
        }
        if (!data.question || !data.answer) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: "'question' and 'answer' are required" }) };
        }
        // deckId is optional, but if present, must be valid
        if (data.deckId && !isValidHexId(data.deckId)) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid deckId format" }) };
        }
        const result = await collection.insertOne(data);
        return { statusCode: 201, headers, body: JSON.stringify({ _id: result.insertedId, ...data }) };
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
        const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: updateData });
        if (result.matchedCount === 0) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: "Not found" }) };
        }
        return { statusCode: 200, headers, body: JSON.stringify({ _id: id, ...updateData }) };
      }
      case "DELETE": {
        if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing id" }) };
        if (!isValidHexId(id)) return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid id format" }) };
        const result = await collection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: "Not found" }) };
        }
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }
      default:
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
