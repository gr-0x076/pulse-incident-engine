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
              background: '#0E0E11',
              color: '#F4F4F6',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.7), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              fontSize: '0.8125rem',
              fontFamily: 'Inter, -apple-system, sans-serif',
              cursor: 'pointer',
              padding: '10px 14px',
            },
            success: {
              iconTheme: {
                primary: '#10B981',
                secondary: '#0E0E11',
              },
            },
            error: {
              iconTheme: {
                primary: '#F43F5E',
                secondary: '#0E0E11',
              },
            },
          }}
        />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
