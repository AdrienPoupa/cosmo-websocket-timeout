# GraphQL WebSocket Subscription Example

This is a simple example of a GraphQL server with WebSocket subscriptions using Node.js, Express, and Apollo Server.

## Features

- GraphQL server with HTTP and WebSocket support
- Simple subscription that emits messages every 2 seconds
- Client example to test the subscription
- Support for connecting to both Apollo Server and Router

## Installation

```bash
npm install
```

Add the router bin to the root of the repo.

## Running the Server

```bash
npm start
```

The server will start on http://localhost:4000/graphql

## Running the Client

In a separate terminal, you can run the client in different modes:

### Apollo Server Client

```bash
npm run client:apollo-server
```

This will explicitly connect to the Apollo Server on port 4000.

### Router Client

Run the router first `./router`

```bash
npm run client:cosmo-router
```

This will connect to the Router on port 3002.

The client will connect to the WebSocket server and display messages as they are emitted.

## Problem

When running Apollo Server: it receives the first message 2 minutes after subscribing

```
> websocket-timeout@1.0.0 client:apollo-server
> node client.js 4000

2025-04-03T20:26:08.277Z Subscription connected
2025-04-03T20:28:08.280Z Received: { data: { messageAdded: 'Message at 2025-04-03T20:28:08.278Z' } }
```

When running Cosmo Router: it times out before the first message is sent, after 1 minute

```
> websocket-timeout@1.0.0 client:cosmo-router
> node client.js 3002

2025-04-03T20:24:48.193Z Subscription connected
2025-04-03T20:25:48.536Z Subscription completed
```

This is happening with the same server (subgraph).
