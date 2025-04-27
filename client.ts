import { createClient } from "graphql-ws";
import WebSocket from "ws";
import {
  ApolloClient,
  defaultDataIdFromObject,
  InMemoryCache,
  NormalizedCacheObject,
  gql,
} from "@apollo/client";
import { createClientWithOnReconnected, GraphQLWsLink } from "./graphQLWsLink";
// Get port from command line arguments or use default
const port = process.argv[2] || 3002;

// create n clients
const clients: ApolloClient<NormalizedCacheObject>[] = [];
const nbClients = 1;
for (let i = 0; i < nbClients; i++) {
  const subscriptionClient = createClientWithOnReconnected({
    url: `ws://localhost:${port}/graphql`,
    connectionParams: () => {
      const params = {
        authToken: "123",
        platform: "WEB",
        clientVersion: "1.0.0",
        organizationId: "123",
        oktaAuthTokenUuid: "123",
        locale: "en",
      };
      return params;
    },
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
        console.log(`${i} ${new Date().toISOString()} Subscription closed`);
      },
      connected: () => {
        console.log(`${i} ${new Date().toISOString()} Subscription connected`);
      },
    },
  });
  const cache = new InMemoryCache({});
  const wsLink = new GraphQLWsLink(subscriptionClient);
  const client = new ApolloClient({
    cache,
    assumeImmutableResults: true,
    link: wsLink,
    defaultOptions: {
      query: { errorPolicy: "all" },
      watchQuery: { fetchPolicy: "cache-and-network", errorPolicy: "all" },
    },
  });
  clients.push(client);
}

// Process clients sequentially instead of all at once
async function processClientsSequentially() {
  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];
    // loop through all the subscriptions
    for (let j = 1; j < 10; j++) {
      const subscription = gql`
        subscription {
          messageAdded${j}
        }
      `;

      // Use the modern observable subscription pattern
      const observable = client.subscribe({
        query: subscription,
      });

      // Subscribe to the observable
      const subscription_handle = observable.subscribe({
        next: (data) => {
          console.log(`${i}-${j} ${new Date().toISOString()} Received:`, data);
        },
        error: (error) =>
          console.error(
            `${i}-${j} ${new Date().toISOString()} Subscription error:`,
            error
          ),
        complete: () =>
          console.log(
            `${i}-${j} ${new Date().toISOString()} Subscription completed`
          ),
      });

      // You can store the subscription handle if you need to unsubscribe later
      // subscription_handle.unsubscribe();
    }
    // Add delay between clients
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

// Start the sequential processing
processClientsSequentially();
