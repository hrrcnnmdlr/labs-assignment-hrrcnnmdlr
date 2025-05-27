const { ApolloServer, gql } = require("apollo-server-express");
const express = require("express");
const serverless = require("serverless-http");
const connectDB = require("./db");
const { ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

const typeDefs = gql`
  type User {
    _id: ID!
    email: String!
    nickname: String
  }
  type AuthPayload {
    token: String!
    user: User!
  }
  type Topic {
    _id: ID!
    name: String!
    color: String
  }
  type Flashcard {
    _id: ID!
    question: String!
    answer: String!
    topicId: ID!
    topic: Topic
    createdAt: String
    updatedAt: String
  }
  type Query {
    flashcards(skip: Int, take: Int, sortField: String, sortOrder: String, filter: String, topicName: String, topicId: ID): [Flashcard]
    flashcard(id: ID!): Flashcard
    topics(filter: String, skip: Int, take: Int, sortField: String, sortOrder: String): [Topic]
    topic(id: ID!): Topic
    profile: User
  }
  type Mutation {
    createFlashcard(question: String!, answer: String!, topicId: ID!): Flashcard
    updateFlashcard(id: ID!, question: String!, answer: String!, topicId: ID!): Flashcard
    deleteFlashcard(id: ID!): Boolean
    createTopic(name: String!, color: String): Topic
    updateTopic(id: ID!, name: String!, color: String): Topic
    deleteTopic(id: ID!): Boolean
    login(email: String!, password: String!): AuthPayload
    register(email: String!, password: String!, nickname: String): AuthPayload
    updateProfile(nickname: String, password: String, newPassword: String): User
  }
`;

function signToken(user) {
  return jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
}

async function getUserFromToken(token) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const { db, client } = await connectDB();
    const user = await db.collection("users").findOne({ _id: new ObjectId(payload.userId) });
    await client.close();
    if (!user) return null;
    return { _id: user._id.toString(), email: user.email, nickname: user.nickname };
  } catch {
    return null;
  }
}

const resolvers = {
  Query: {
    flashcards: async (_, { skip = 0, take = 20, sortField = "createdAt", sortOrder = "desc", filter, topicName, topicId }) => {
      const { db, client } = await connectDB();
      let topicIds = null;
      if (topicName) {
        const topics = await db.collection("topics").find({ name: { $regex: topicName, $options: "i" } }).toArray();
        topicIds = topics.map(t => t._id.toString());
      }
      const query = {};
      if (filter) {
        query.$or = [
          { question: { $regex: filter, $options: "i" } },
          { answer: { $regex: filter, $options: "i" } }
        ];
      }
      if (topicIds && topicIds.length) {
        query.topicId = { $in: topicIds };
      }
      // --- Додаємо фільтрацію по topicId (ID) ---
      if (topicId) {
        query.topicId = topicId;
      }
      const sort = sortField ? { [sortField]: sortOrder === "desc" ? -1 : 1 } : {};
      const cards = await db.collection("flashcards")
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(take)
        .toArray();
      await client.close();
      return cards;
    },
    flashcard: async (_, { id }) => {
      const { db, client } = await connectDB();
      const card = await db.collection("flashcards").findOne({ _id: new ObjectId(id) });
      await client.close();
      return card;
    },
    topics: async (_, { filter, skip = 0, take = 20, sortField = "name", sortOrder = "asc" }) => {
      const { db, client } = await connectDB();
      const query = filter ? { name: { $regex: filter, $options: "i" } } : {};
      const sort = sortField ? { [sortField]: sortOrder === "desc" ? -1 : 1 } : {};
      const topics = await db.collection("topics")
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(take)
        .toArray();
      await client.close();
      return topics;
    },
    topic: async (_, { id }) => {
      const { db, client } = await connectDB();
      const topic = await db.collection("topics").findOne({ _id: new ObjectId(id) });
      await client.close();
      return topic;
    },
    profile: async (_, __, { user }) => {
      if (!user) throw new Error("Unauthorized");
      return user;
    },
  },
  Mutation: {
    createFlashcard: async (_, { question, answer, topicId }) => {
      const { db, client } = await connectDB();
      const now = new Date();
      const card = { question, answer, topicId, createdAt: now, updatedAt: now };
      const result = await db.collection("flashcards").insertOne(card);
      card._id = result.insertedId;
      await client.close();
      return card;
    },
    updateFlashcard: async (_, { id, question, answer, topicId }) => {
      const { db, client } = await connectDB();
      const updateFields = { updatedAt: new Date() };
      if (question) updateFields.question = question;
      if (answer) updateFields.answer = answer;
      if (topicId) updateFields.topicId = topicId;
      await db.collection("flashcards").updateOne({ _id: new ObjectId(id) }, { $set: updateFields });
      const card = await db.collection("flashcards").findOne({ _id: new ObjectId(id) });
      await client.close();
      return card;
    },
    deleteFlashcard: async (_, { id }) => {
      const { db, client } = await connectDB();
      const result = await db.collection("flashcards").deleteOne({ _id: new ObjectId(id) });
      await client.close();
      return result.deletedCount > 0;
    },
    createTopic: async (_, { name, color }) => {
      const { db, client } = await connectDB();
      const topic = { name, color: color || '#e0eaff' };
      const result = await db.collection("topics").insertOne(topic);
      topic._id = result.insertedId;
      await client.close();
      return topic;
    },
    updateTopic: async (_, { id, name, color }) => {
      const { db, client } = await connectDB();
      const updateFields = {};
      if (name) updateFields.name = name;
      if (color) updateFields.color = color;
      await db.collection("topics").updateOne({ _id: new ObjectId(id) }, { $set: updateFields });
      const topic = await db.collection("topics").findOne({ _id: new ObjectId(id) });
      await client.close();
      return topic;
    },
    deleteTopic: async (_, { id }) => {
      const { db, client } = await connectDB();
      const result = await db.collection("topics").deleteOne({ _id: new ObjectId(id) });
      await client.close();
      return result.deletedCount > 0;
    },
    login: async (_, { email, password }) => {
      const { db, client } = await connectDB();
      const user = await db.collection("users").findOne({ email });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        await client.close();
        throw new Error("Invalid credentials");
      }
      const token = signToken(user);
      await client.close();
      return { token, user: { _id: user._id.toString(), email: user.email, nickname: user.nickname } };
    },
    register: async (_, { email, password, nickname }) => {
      const { db, client } = await connectDB();
      const exists = await db.collection("users").findOne({ email });
      if (exists) {
        await client.close();
        throw new Error("User already exists");
      }
      const hash = await bcrypt.hash(password, 10);
      const user = { email, password: hash, nickname: nickname || "" };
      const result = await db.collection("users").insertOne(user);
      const token = signToken({ _id: result.insertedId, email });
      await client.close();
      return { token, user: { _id: result.insertedId.toString(), email, nickname: nickname || "" } };
    },
    updateProfile: async (_, { nickname, password, newPassword }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      const { db, client } = await connectDB();
      const dbUser = await db.collection("users").findOne({ _id: new ObjectId(user._id) });
      if (!dbUser) { await client.close(); throw new Error("User not found"); }
      const update = {};
      if (typeof nickname === 'string') update.nickname = nickname;
      if (password && newPassword) {
        const ok = await bcrypt.compare(password, dbUser.password);
        if (!ok) { await client.close(); throw new Error("Wrong current password"); }
        update.password = await bcrypt.hash(newPassword, 10);
      }
      if (Object.keys(update).length) {
        await db.collection("users").updateOne({ _id: dbUser._id }, { $set: update });
      }
      const updated = await db.collection("users").findOne({ _id: dbUser._id });
      await client.close();
      return { _id: updated._id.toString(), email: updated.email, nickname: updated.nickname };
    },
  },
  Flashcard: {
    topic: async (parent) => {
      if (!parent.topicId) return null;
      const { db, client } = await connectDB();
      const topic = await db.collection("topics").findOne({ _id: new ObjectId(parent.topicId) });
      await client.close();
      return topic;
    }
  }
};

const app = express();
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ event, req }) => {
    // Netlify: event.headers, Express: req.headers
    const headers = event ? event.headers : req.headers;
    let token = null;
    if (headers && (headers.authorization || headers.Authorization)) {
      token = headers.authorization || headers.Authorization;
      if (token.startsWith("Bearer ")) token = token.slice(7);
    }
    const user = await getUserFromToken(token);
    return { user };
  },
});

let handler;
let serverReadyResolve;
const serverReadyPromise = new Promise((resolve) => { serverReadyResolve = resolve; });

async function startApolloServer() {
  await server.start();
  server.applyMiddleware({ app });
  handler = serverless(app);
  serverReadyResolve();
}
startApolloServer();

exports.handler = async (event, context) => {
  await serverReadyPromise;
  return handler(event, context);
};
