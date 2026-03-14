'use client';

import { Web3Provider } from "@/lib/web3/provider";
import { ClientOnly } from "@/components/client-only";
import { LanguageProvider } from "@/lib/i18n";

export default function Template({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClientOnly>
      <LanguageProvider>
        <Web3Provider>
          {children}
        </Web3Provider>
      </LanguageProvider>
    </ClientOnly>
  );
}
