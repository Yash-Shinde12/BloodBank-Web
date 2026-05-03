import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: 'c:/Yash/Capstone/app/zip/lib/api-spec/openapi.yaml',
    output: {
      target: './src/lib/api.ts',
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      baseUrl: '/api',
      override: {
        mutator: {
          path: './src/lib/custom-fetch.ts',
          name: 'customFetch',
        },
        query: {
          useQuery: true,
          useInfinite: false,
          useInfiniteQueryParam: 'limit',
        },
      },
    },
  },
});