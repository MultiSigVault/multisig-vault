'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWalletStore } from '@/store/walletStore';
import { WalletConnect } from '@/components/wallet/WalletConnect';
import { VaultCard } from '@/components/vault/VaultCard';
import { Button } from '@/components/ui/Button';
import { ArrowRightIcon, ShieldCheckIcon, ClockIcon, UsersIcon, DocumentTextIcon, KeyIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const features = [
  {
    name: 'Multi-Signature Security',
    description: 'Require multiple approvals before any funds can be moved. Configurable thresholds from 2-of-3 to 10-of-10.',
    icon: ShieldCheckIcon,
  },
  {
    name: 'Spending Policies',
    description: 'Set daily, weekly, and monthly spending limits per signer. Enforce treasury discipline automatically.',
    icon: ClockIcon,
  },
  {
    name: 'Team Management',
    description: 'Add or remove signers dynamically. Perfect for evolving team structures and DAO governance.',
    icon: UsersIcon,
  },
  {
    name: 'Audit Trail',
    description: 'Immutable IPFS-backed audit logs for all transactions. Full transparency and compliance ready.',
    icon: DocumentTextIcon,
  },
  {
    name: 'Social Recovery',
    description: 'Guardian-based key recovery. Never lose access to your treasury with decentralized recovery.',
    icon: KeyIcon,
  },
];

export default function HomePage() {
  const { isConnected, walletAddress, connect } = useWalletStore();
  const [recentVaults, setRecentVaults] = useState([]);
  const [stats, setStats] = useState({
    totalVaults: 0,
    totalVolume: 0,
    activeSigners: 0,
  });

  useEffect(() => {
    if (isConnected && walletAddress) {
      fetchUserVaults();
      fetchStats();
    }
  }, [isConnected, walletAddress]);

  const fetchUserVaults = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/vaults`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setRecentVaults(data.data?.slice(0, 3) || []);
      }
    } catch (error) {
      console.error('Failed to fetch vaults:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/vaults/stats`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="container-custom py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <ShieldCheckIcon className="h-8 w-8 text-primary-600" />
            <span className="text-xl font-bold gradient-text">MultiSig Vault</span>
          </div>
          <div className="flex items-center space-x-4">
            {isConnected ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                </span>
                <Link href="/vaults">
                  <Button variant="outline" size="sm">Dashboard</Button>
                </Link>
              </div>
            ) : (
              <WalletConnect />
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container-custom py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          Secure Treasury{' '}
          <span className="gradient-text">Management</span>
          <br />
          on Stellar Soroban
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Multi-signature vaults for DAOs and teams. Require multiple approvals,
          set spending limits, and maintain full transparency.
        </p>
        <div className="flex justify-center space-x-4">
          {!isConnected ? (
            <WalletConnect />
          ) : (
            <Link href="/vaults">
              <Button size="lg">
                Go to Dashboard
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          )}
          <Link href="https://docs.multisigvault.com">
            <Button variant="outline" size="lg">Documentation</Button>
          </Link>
        </div>
      </section>

      {/* Stats Section */}
      {isConnected && (
        <section className="container-custom py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-gray-100">
              <div className="text-3xl font-bold text-primary-600">{stats.totalVaults}</div>
              <div className="text-gray-600 mt-1">Total Vaults</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-gray-100">
              <div className="text-3xl font-bold text-primary-600">
                {(stats.totalVolume / 10000000).toLocaleString()} XLM
              </div>
              <div className="text-gray-600 mt-1">Total Volume</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-gray-100">
              <div className="text-3xl font-bold text-primary-600">{stats.activeSigners}</div>
              <div className="text-gray-600 mt-1">Active Signers</div>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="container-custom py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Enterprise-Grade Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.name}
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 card-hover"
            >
              <feature.icon className="h-10 w-10 text-primary-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">{feature.name}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Vaults */}
      {isConnected && recentVaults.length > 0 && (
        <section className="container-custom py-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Your Recent Vaults</h2>
            <Link href="/vaults" className="text-primary-600 hover:text-primary-700">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentVaults.map((vault: any) => (
              <VaultCard key={vault.id} vault={vault} />
            ))}
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="bg-primary-600 text-white py-16 mt-16">
        <div className="container-custom text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Secure Your Treasury?</h2>
          <p className="text-lg mb-8 opacity-90">
            Join the future of decentralized treasury management on Stellar Soroban.
          </p>
          {!isConnected ? (
            <WalletConnect />
          ) : (
            <Link href="/vaults/create">
              <Button variant="secondary" size="lg">
                Create Your First Vault
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="container-custom py-8 text-center text-gray-500 text-sm">
        <p>© 2024 MultiSig Vault. Built on Stellar Soroban.</p>
        <div className="flex justify-center space-x-6 mt-4">
          <Link href="/terms" className="hover:text-gray-700">Terms</Link>
          <Link href="/privacy" className="hover:text-gray-700">Privacy</Link>
          <Link href="https://github.com/MultiSigVault" className="hover:text-gray-700">GitHub</Link>
          <Link href="https://docs.multisigvault.com" className="hover:text-gray-700">Docs</Link>
        </div>
      </footer>
    </div>
  );
}