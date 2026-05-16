'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { Loader2, Search, ArrowUpRight, ArrowDownLeft, Filter } from 'lucide-react';
import Link from 'next/link';

interface Transaction {
  id: string;
  hash: string;
  vaultId: string;
  vaultName: string;
  type: 'send' | 'receive';
  destination: string;
  source?: string;
  amount: string;
  asset: string;
  status: 'pending' | 'approved' | 'executed' | 'rejected';
  approvals: number;
  totalSigners: number;
  createdAt: string;
  executedAt?: string;
}

export default function TransactionsPage() {
  const { isConnected, publicKey } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  
  const itemsPerPage = 15;

  useEffect(() => {
    if (isConnected && publicKey) {
      fetchTransactions();
    }
  }, [isConnected, publicKey]);

  useEffect(() => {
    filterTransactions();
  }, [searchTerm, statusFilter, typeFilter, transactions]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/transactions?userAddress=${publicKey}`);
      const data = await response.json();
      setTransactions(data.transactions);
      setFilteredTransactions(data.transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = [...transactions];
    
    if (searchTerm) {
      filtered = filtered.filter(tx =>
        tx.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.vaultName && tx.vaultName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status === statusFilter);
    }
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(tx => tx.type === typeFilter);
    }
    
    setFilteredTransactions(filtered);
    setCurrentPage(1);
  };

  const getPaginatedTransactions = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredTransactions.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'executed':
        return 'bg-green-100 text-green-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (type: string) => {
    return type === 'send' ? (
      <ArrowUpRight className="w-5 h-5 text-red-500" />
    ) : (
      <ArrowDownLeft className="w-5 h-5 text-green-500" />
    );
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Connect Your Wallet</h2>
          <p className="text-gray-600">Please connect your wallet to view transaction history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Transaction History</h1>
        <p className="text-gray-600 mt-2">Track all transactions across your vaults</p>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search by transaction hash, address, or vault name..."
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="executed">Executed</option>
                  <option value="rejected">Rejected</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Type
                </label>
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="send">Sent</option>
                  <option value="receive">Received</option>
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
      ) : filteredTransactions.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-600">No transactions found</p>
          {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setTypeFilter('all');
              }}
              className="mt-4"
            >
              Clear Filters
            </Button>
          )}
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {getPaginatedTransactions().map((tx) => (
              <Link key={tx.id} href={`/vaults/${tx.vaultId}?tx=${tx.id}`}>
                <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        {getStatusIcon(tx.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getStatusColor(tx.status)}>
                            {tx.status.toUpperCase()}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {tx.vaultName}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm">
                            <span className="font-medium">
                              {tx.type === 'send' ? 'To:' : 'From:'}
                            </span>{' '}
                            <code className="text-xs">
                              {tx.type === 'send' ? tx.destination : tx.source}
                            </code>
                          </p>
                          <p className="text-lg font-semibold">
                            {tx.type === 'send' ? '-' : '+'}{tx.amount} {tx.asset}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Hash: {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}</span>
                            <span>•</span>
                            <span>{new Date(tx.createdAt).toLocaleString()}</span>
                            {tx.status === 'pending' && (
                              <>
                                <span>•</span>
                                <span>Approvals: {tx.approvals}/{tx.totalSigners}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
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