import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,       // 30 seconds
      gcTime: 5 * 60 * 1000,      // 5 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 2200,
            style: {
              background: '#111114',
              color: '#F4F3EF',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.7), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              fontSize: '0.8125rem',
              fontFamily: 'Inter, -apple-system, sans-serif',
              cursor: 'pointer',
              padding: '10px 14px',
            },
            success: {
              iconTheme: {
                primary: '#6EE7B7',
                secondary: '#111114',
              },
            },
            error: {
              iconTheme: {
                primary: '#E5C185',
                secondary: '#111114',
              },
            },
          }}
        />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
