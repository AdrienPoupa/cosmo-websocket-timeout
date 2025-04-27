import { ApolloLink, FetchResult, Observable, Operation } from "@apollo/client";
import { EventEmitter } from "eventemitter3";
import { print } from "graphql";
import { Client, ClientOptions, createClient } from "graphql-ws";

function wait(delayMs: number) {
  return delayMs === 0
    ? Promise.resolve()
    : new Promise<void>((resolve) => setTimeout(resolve, delayMs));
}

export class GraphQLWsLink extends ApolloLink {
  constructor(private client: Client) {
    super();
  }

  public request(operation: Operation): Observable<FetchResult> {
    return new Observable((sink) => {
      return this.client.subscribe<FetchResult, Record<string, any>>(
        { ...operation, query: print(operation.query) },
        {
          next: sink.next.bind(sink),
          complete: sink.complete.bind(sink),
          error: sink.error.bind(sink),
        }
      );
    });
  }
}

export interface ClientWithOnReconnected extends Client {
  onReconnected(cb: () => void): () => void;
  retryNow(): void;
}

export function createClientWithOnReconnected(
  options: ClientOptions
): ClientWithOnReconnected {
  let abruptlyClosed = false;
  const events = new EventEmitter();

  const EMPTY_RETRY_NOW = () => {};
  let retryNow = EMPTY_RETRY_NOW;

  const client = createClient({
    ...options,
    retryWait: async function randomisedExponentialBackoff(retries) {
      let retryDelay = 1000; // start with 1s delay
      for (let i = 0; i < retries; i++) {
        retryDelay *= 2;
      }
      // add random timeout from 300ms to 3s
      retryDelay += Math.floor(Math.random() * (3000 - 300) + 300);
      const minDelayBeforeRetryNow = 10_000;
      if (retryDelay < minDelayBeforeRetryNow) {
        return await wait(retryDelay);
      }

      const resolveNowPromise = new Promise<void>((resolve) => {
        retryNow = () => {
          retryNow = EMPTY_RETRY_NOW;
          resolve();
        };
      });
      // This is to avoid burning our retry attempts too quickly if somehow the http server is up, but the subscription server is down
      // Make sure we always wait at least 10s before allowing to short-circuit the retry
      await wait(minDelayBeforeRetryNow);
      await Promise.race([
        wait(retryDelay - minDelayBeforeRetryNow),
        resolveNowPromise,
      ]);
      retryNow = EMPTY_RETRY_NOW;
    },
    on: {
      ...options.on,
      // https://the-guild.dev/graphql/ws/recipes#client-usage-with-reconnect-listener
      closed: (event) => {
        options.on?.closed?.(event);
        // non-1000 close codes are abrupt closes
        if ((event as CloseEvent).code !== 1000) {
          abruptlyClosed = true;
        }
      },
      connected: (...args) => {
        options.on?.connected?.(...args);
        // if the client abruptly closed, this is then a reconnect
        if (abruptlyClosed) {
          abruptlyClosed = false;
          events.emit("reconnected");
        }
      },
    },
  });

  return {
    ...client,
    onReconnected: (cb) => {
      events.on("reconnected", cb);
      return () => void events.off("reconnected", cb);
    },
    retryNow: () => retryNow(),
  };
}
