import { useState, useEffect } from 'react';
import { NextUIProvider } from '@nextui-org/react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from './utils/web3Config';
import App from './App';
import './index.css';

const queryClient = new QueryClient();

function Root() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <NextUIProvider>
          <App />
        </NextUIProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default Root;
