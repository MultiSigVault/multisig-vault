'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { VaultCard } from '@/components/vault/VaultCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { Loader2, Plus, Search, Filter } from 'lucide-react';
import Link from 'next/link';

interface Vault {
  id: string;
  address: string;
  name: string;
  description: string;
  threshold: number;
  signers: string[];
  totalSigners: number;
  balance: string;
  status: 'active' | 'pending' | 'archived';
  createdAt: string;
}

export default function VaultsPage() {
  const { isConnected, publicKey } = useWallet();
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [filteredVaults, setFilteredVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  
  const itemsPerPage = 10;

  useEffect(() => {
    if (isConnected && publicKey) {
      fetchVaults();
    }
  }, [isConnected, publicKey]);

  useEffect(() => {
    filterVaults();
  }, [searchTerm, statusFilter, vaults]);

  const fetchVaults = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/vaults?userAddress=${publicKey}`);
      const data = await response.json();
      setVaults(data.vaults);
      setFilteredVaults(data.vaults);
    } catch (error) {
      console.error('Error fetching vaults:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterVaults = () => {
    let filtered = [...vaults];
    
    if (searchTerm) {
      filtered = filtered.filter(vault =>
        vault.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vault.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (vault.description && vault.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(vault => vault.status === statusFilter);
    }
    
    setFilteredVaults(filtered);
    setCurrentPage(1);
  };

  const getPaginatedVaults = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredVaults.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredVaults.length / itemsPerPage);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Connect Your Wallet</h2>
          <p className="text-gray-600">Please connect your Freighter wallet to view your vaults</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Vaults</h1>
          <p className="text-gray-600 mt-2">Manage and monitor all your multi-signature vaults</p>
        </div>
        <Link href="/vaults/create">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create New Vault
          </Button>
        </Link>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search vaults by name, address, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>

        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="archived">Archived</option>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredVaults.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No vaults found</p>
          {searchTerm || statusFilter !== 'all' ? (
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="mt-4"
            >
              Clear Filters
            </Button>
          ) : (
            <Link href="/vaults/create">
              <Button variant="outline" className="mt-4">
                Create Your First Vault
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getPaginatedVaults().map((vault) => (
              <VaultCard key={vault.id} vault={vault} />
            ))}
          </div>
          
          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}