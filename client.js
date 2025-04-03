const { createClient } = require("graphql-ws");
const WebSocket = require("ws");

// Get port from command line arguments or use default
const port = process.argv[2] || 3002;

const client = createClient({
  url: `ws://localhost:${port}/graphql`,
  webSocketImpl: WebSocket,
  lazy: true,
  shouldRetry: () => true,
  retryAttempts: 20,
  // Server is 30000
  connectionAckWaitTimeout: 40000,
  lazyCloseTimeout: 40000,
  keepAlive: 40000,
  on: {
    closed: () => {
      console.log(`${new Date().toISOString()} Subscription closed`);
    },
    connected: () => {
      console.log(`${new Date().toISOString()} Subscription connected`);
    },
  },
});

// Subscribe to the messageAdded subscription
const onNext = (data) => {
  console.log(`${new Date().toISOString()} Received:`, data);
};

client.subscribe(
  {
    query: `
      subscription {
        messageAdded
      }
    `,
  },
  {
    next: onNext,
    error: (error) =>
      console.error(`${new Date().toISOString()} Subscription error:`, error),
    complete: () =>
      console.log(`${new Date().toISOString()} Subscription completed`),
  }
);
