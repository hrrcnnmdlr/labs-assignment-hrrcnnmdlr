const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

function getDb() {
  const client = new MongoClient(process.env.MONGO_URI);
  return client.connect().then(() => ({
    db: client.db(process.env.DB_NAME),
    client
  }));
}

function signToken(user) {
  return jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
}

function isValidEmail(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}
function isStrongPassword(password) {
  return typeof password === 'string' && password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password);
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS, PUT, GET",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }
  try {
    const { db, client } = await getDb();
    const users = db.collection("users");
    let userId = null;
    let auth = event.headers && (event.headers.authorization || event.headers.Authorization);
    if (auth && auth.startsWith("Bearer ")) {
      try {
        const token = auth.slice(7);
        const payload = jwt.verify(token, JWT_SECRET);
        userId = payload.userId;
      } catch {}
    }
    if (event.httpMethod === "POST" && event.path.endsWith("register")) {
      const { email, password, nickname } = JSON.parse(event.body || "{}");
      if (!email || !password) {
        await client.close();
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Email and password required" }) };
      }
      if (!isValidEmail(email)) {
        await client.close();
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid email format" }) };
      }
      if (!isStrongPassword(password)) {
        await client.close();
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Password must be at least 8 chars, with upper, lower, digit" }) };
      }
      const exists = await users.findOne({ email });
      if (exists) {
        await client.close();
        return { statusCode: 400, headers, body: JSON.stringify({ error: "User already exists" }) };
      }
      const hash = await bcrypt.hash(password, 12);
      const user = { email, password: hash, nickname: nickname || "", isBlocked: false };
      const result = await users.insertOne(user);
      const token = signToken({ _id: result.insertedId, email });
      await client.close();
      return { statusCode: 201, headers, body: JSON.stringify({ token }) };
    } else if (event.httpMethod === "POST" && event.path.endsWith("login")) {
      const { email, password } = JSON.parse(event.body || "{}");
      if (!email || !password) {
        await client.close();
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Email and password required" }) };
      }
      const user = await users.findOne({ email });
      if (!user || user.isBlocked) {
        await sleep(1000); // затримка для захисту від brute-force
        await client.close();
        return { statusCode: 401, headers, body: JSON.stringify({ error: "Invalid credentials or blocked" }) };
      }
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) {
        await sleep(1000); // затримка для захисту від brute-force
        // TODO: логування підозрілих спроб
        await client.close();
        return { statusCode: 401, headers, body: JSON.stringify({ error: "Invalid credentials" }) };
      }
      const token = signToken(user);
      await client.close();
      return { statusCode: 200, headers, body: JSON.stringify({ token }) };
    } else if (event.httpMethod === "GET" && event.path.endsWith("profile")) {
      if (!userId) { await client.close(); return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) }; }
      const user = await users.findOne({ _id: new ObjectId(userId) }, { projection: { password: 0 } });
      if (user && user.isBlocked) { await client.close(); return { statusCode: 403, headers, body: JSON.stringify({ error: "Blocked" }) }; }
      await client.close();
      return { statusCode: 200, headers, body: JSON.stringify(user) };
    } else if (event.httpMethod === "PUT" && event.path.endsWith("profile")) {
      if (!userId) { await client.close(); return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) }; }
      const { nickname, password, newPassword } = JSON.parse(event.body || "{}");
      const user = await users.findOne({ _id: new ObjectId(userId) });
      if (!user) { await client.close(); return { statusCode: 404, headers, body: JSON.stringify({ error: "User not found" }) }; }
      if (user.isBlocked) { await client.close(); return { statusCode: 403, headers, body: JSON.stringify({ error: "Blocked" }) }; }
      const update = {};
      if (typeof nickname === 'string') update.nickname = nickname;
      if (password && newPassword) {
        if (!isStrongPassword(newPassword)) {
          await client.close();
          return { statusCode: 400, headers, body: JSON.stringify({ error: "New password must be at least 8 chars, with upper, lower, digit" }) };
        }
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) { await client.close(); return { statusCode: 400, headers, body: JSON.stringify({ error: "Wrong current password" }) }; }
        update.password = await bcrypt.hash(newPassword, 12);
      }
      if (Object.keys(update).length) {
        await users.updateOne({ _id: new ObjectId(userId) }, { $set: update });
      }
      await client.close();
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }
    await client.close();
    return { statusCode: 404, headers, body: JSON.stringify({ error: "Not found" }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
