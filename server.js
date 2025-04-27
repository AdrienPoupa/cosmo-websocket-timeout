const express = require("express");
const { createServer } = require("http");
const { WebSocketServer } = require("ws");
const { useServer } = require("graphql-ws/lib/use/ws");
const { ApolloServer } = require("@apollo/server");
const {
  ApolloServerPluginDrainHttpServer,
} = require("@apollo/server/plugin/drainHttpServer");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const fs = require("fs");
const path = require("path");

// Read GraphQL schema from file
const typeDefs = fs.readFileSync(
  path.join(__dirname, "schema.graphql"),
  "utf8"
);

const messageAddedResolver = (index) => {
  return {
    subscribe: () => {
      // Create an async iterator that emits a message with a random delay between 1 and 5 seconds
      return {
        [Symbol.asyncIterator]() {
          return {
            async next() {
              await new Promise((resolve) =>
                setTimeout(resolve, Math.floor(Math.random() * 4000) + 120000)
              );
              return {
                value: {
                  [`messageAdded${index}`]: `Message at ${new Date().toISOString()}`,
                },
                done: false,
              };
            },
          };
        },
      };
    },
  };
};

// Resolvers
const resolvers = {
  Query: {
    hello: () => "Hello, GraphQL!",
  },
  Subscription: {
    // add 9 messageAdded subscriptions
    messageAdded1: messageAddedResolver(1),
    messageAdded2: messageAddedResolver(2),
    messageAdded3: messageAddedResolver(3),
    messageAdded4: messageAddedResolver(4),
    messageAdded5: messageAddedResolver(5),
    messageAdded6: messageAddedResolver(6),
    messageAdded7: messageAddedResolver(7),
    messageAdded8: messageAddedResolver(8),
    messageAdded9: messageAddedResolver(9),
  },
};

const getSubscriptionCleanPlugin = (subscriptionServer) => {
  return {
    serverWillStart: async () => {
      return {
        drainServer: async () => {
          await subscriptionServer.dispose();
        },
      };
    },
  };
};

async function startServer() {
  const app = express();
  app.enable("trust proxy");
  const httpServer = createServer({ keepAlive: true }, app);

  // Create GraphQL schema
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // Create WebSocket server
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql",
  });

  const keepAlive = 30000;

  // Set up WebSocket server
  const subscriptionServer = useServer(
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
      onError: async (ctx, message) => {
        console.log(`${new Date().toISOString()} Client error:`, message);
      },
      onSubscribe: async (ctx, message) => {
        console.log(`${new Date().toISOString()} Client subscribed:`, message);
      },
      // onOperation: async (ctx, message, args, result) => {
      //   console.log(
      //     `${new Date().toISOString()} Client operation:`,
      //     message,
      //     args,
      //     result
      //   );
      // },
      // onNext: async (ctx, message) => {
      //   console.log(`${new Date().toISOString()} Client next:`, message);
      // },
    },
    wsServer,
    keepAlive
  );

  // Create Apollo Server
  const server = new ApolloServer({
    schema,
    plugins: [
      // ApolloServerPluginDrainHttpServer({ httpServer }),
      getSubscriptionCleanPlugin(subscriptionServer),
    ],
  });

  await server.start();

  // Start the server
  const PORT = 4000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
    console.log(`🚀 Subscriptions ready at ws://localhost:${PORT}/graphql`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
