import { PropsWithChildren, useState } from 'react';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { captureFrontendException } from '../../observability/sentry';

function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => captureFrontendException(error, 'query'),
    }),
    mutationCache: new MutationCache({
      onError: (error) => captureFrontendException(error, 'mutation'),
    }),
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          const status = (error as { status?: number } | null)?.status;
          return status !== undefined && status >= 500 && failureCount < 1;
        },
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(createQueryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
