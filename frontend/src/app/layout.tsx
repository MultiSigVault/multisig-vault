import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers/Providers';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MultiSig Vault | Secure Treasury Management on Stellar Soroban',
  description: 'Multi-signature treasury vault for DAOs and teams on Stellar Soroban. Secure, transparent, and decentralized fund management.',
  keywords: 'multisig, vault, stellar, soroban, dao, treasury, blockchain',
  authors: [{ name: 'MultiSigVault Team' }],
  openGraph: {
    title: 'MultiSig Vault',
    description: 'Secure multi-signature treasury management on Stellar Soroban',
    url: 'https://multisigvault.com',
    siteName: 'MultiSig Vault',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MultiSig Vault',
    description: 'Secure multi-signature treasury management on Stellar Soroban',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}