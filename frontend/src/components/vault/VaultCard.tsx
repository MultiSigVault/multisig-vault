'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Users, Shield, Calendar, ArrowRight, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface Vault {
  id: string;
  address: string;
  name: string;
  description?: string;
  threshold: number;
  signers: string[];
  totalSigners: number;
  balance: string;
  status: 'active' | 'pending' | 'archived';
  createdAt: string;
}

interface VaultCardProps {
  vault: Vault;
  onCopyAddress?: (address: string) => void;
}

export function VaultCard({ vault, onCopyAddress }: VaultCardProps) {
  const [copied, setCopied] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(vault.address);
    setCopied(true);
    onCopyAddress?.(vault.address);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300 overflow-hidden group">
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-1">
              {vault.name}
            </h3>
            <div className="flex items-center gap-2">
              <code className="text-sm text-gray-500 bg-gray-50 px-2 py-1 rounded">
                {formatAddress(vault.address)}
              </code>
              <button
                onClick={handleCopyAddress}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Copy address"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <Badge className={getStatusColor(vault.status)}>
            {getStatusText(vault.status)}
          </Badge>
        </div>

        {vault.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {vault.description}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-gray-600">Balance</span>
            </div>
            <div className="text-lg font-bold text-gray-900">
              {vault.balance} XLM
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-gray-600">Signatures</span>
            </div>
            <div className="text-lg font-bold text-gray-900">
              {vault.threshold}/{vault.totalSigners}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>Created {new Date(vault.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <Link href={`/vaults/${vault.id}`}>
          <Button variant="outline" className="w-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
            View Details
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}