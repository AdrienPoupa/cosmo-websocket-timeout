const express = require("express");
const { createServer } = require("http");
const { ApolloServer } = require("apollo-server-express");
const { WebSocketServer } = require("ws");
const { useServer } = require("graphql-ws/lib/use/ws");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const fs = require("fs");
const path = require("path");

// Read GraphQL schema from file
const typeDefs = fs.readFileSync(
  path.join(__dirname, "schema.graphql"),
  "utf8"
);

// Resolvers
const resolvers = {
  Query: {
    hello: () => "Hello, GraphQL!",
  },
  Subscription: {
    messageAdded: {
      subscribe: () => {
        // Create an async iterator that emits a message every 2 minutes
        return {
          [Symbol.asyncIterator]() {
            return {
              async next() {
                await new Promise((resolve) => setTimeout(resolve, 120_000));
                return {
                  value: {
                    messageAdded: `Message at ${new Date().toISOString()}`,
                  },
                  done: false,
                };
              },
            };
          },
        };
      },
    },
  },
};

async function startServer() {
  const app = express();
  const httpServer = createServer({ keepAlive: true }, app);

  // Create GraphQL schema
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // Create Apollo Server
  const server = new ApolloServer({
    schema,
  });

  await server.start();
  server.applyMiddleware({ app });

  // Create WebSocket server
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql",
  });

  const keepAlive = 30000;

  // Set up WebSocket server
  useServer(
    {
      schema,
      onConnect: async (ctx) => {
        console.log(`${new Date().toISOString()} Client connected`);
      },
      onDisconnect: async (ctx) => {
        console.log(`${new Date().toISOString()} Client disconnected`);
      },
      onComplete: async (ctx) => {
        console.log(`${new Date().toISOString()} Client completed`);
      },
      onClose: async (ctx) => {
        console.log(`${new Date().toISOString()} Client closed`);
      },
    },
    wsServer,
    keepAlive
  );

  // Start the server
  const PORT = 4000;
  httpServer.listen(PORT, () => {
    console.log(
      `🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`
    );
    console.log(
      `🚀 Subscriptions ready at ws://localhost:${PORT}${server.graphqlPath}`
    );
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
