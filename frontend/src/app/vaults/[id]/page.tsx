'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Loader2, Copy, Check, Settings, Users, History, Shield } from 'lucide-react';
import Link from 'next/link';

interface VaultDetail {
  id: string;
  address: string;
  name: string;
  description: string;
  threshold: number;
  signers: string[];
  balance: string;
  status: string;
  createdAt: string;
  policies: {
    dailyLimit?: string;
    allowedAssets?: string[];
    requireAllSigners?: boolean;
  };
}

interface Transaction {
  id: string;
  hash: string;
  destination: string;
  amount: string;
  asset: string;
  status: 'pending' | 'approved' | 'executed' | 'rejected';
  approvals: string[];
  rejections: string[];
  createdAt: string;
  executedAt?: string;
}

export default function VaultDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isConnected, publicKey } = useWallet();
  const [vault, setVault] = useState<VaultDetail | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [activeTab, setActiveTab] = useState('transactions');

  useEffect(() => {
    if (isConnected && publicKey) {
      fetchVaultDetails();
      fetchTransactions();
    }
  }, [isConnected, publicKey, params.id]);

  const fetchVaultDetails = async () => {
    try {
      const response = await fetch(`/api/vaults/${params.id}`);
      const data = await response.json();
      setVault(data);
    } catch (error) {
      console.error('Error fetching vault details:', error);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/vaults/${params.id}/transactions`);
      const data = await response.json();
      setTransactions(data.transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

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

  const getTxStatusColor = (status: string) => {
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

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Connect Your Wallet</h2>
          <p className="text-gray-600">Please connect your wallet to view vault details</p>
        </div>
      </div>
    );
  }

  if (!vault) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isSigner = publicKey && vault.signers.includes(publicKey);
  const hasApproved = (tx: Transaction) => tx.approvals.includes(publicKey!);
  const hasRejected = (tx: Transaction) => tx.rejections.includes(publicKey!);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/vaults" className="text-blue-600 hover:text-blue-700">
          ← Back to Vaults
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{vault.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                {vault.address.slice(0, 10)}...{vault.address.slice(-8)}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(vault.address)}
              >
                {copiedAddress ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Badge className={getStatusColor(vault.status)}>
                {vault.status.charAt(0).toUpperCase() + vault.status.slice(1)}
              </Badge>
            </div>
          </div>
          {isSigner && (
            <Button onClick={() => router.push(`/vaults/${params.id}/create-transaction`)}>
              New Transaction
            </Button>
          )}
        </div>

        {vault.description && (
          <p className="text-gray-600 mt-2">{vault.description}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Total Balance</div>
            <div className="text-2xl font-bold text-gray-900">{vault.balance} XLM</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Threshold</div>
            <div className="text-2xl font-bold text-gray-900">{vault.threshold}</div>
            <div className="text-sm text-gray-500">of {vault.signers.length} signers</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Signers</div>
            <div className="text-2xl font-bold text-gray-900">{vault.signers.length}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Created</div>
            <div className="text-lg font-medium text-gray-900">
              {new Date(vault.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="signers" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Signers
          </TabsTrigger>
          <TabsTrigger value="policies" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Policies
          </TabsTrigger>
          {isSigner && (
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="transactions">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : transactions.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-gray-600">No transactions yet</p>
              {isSigner && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push(`/vaults/${params.id}/create-transaction`)}
                >
                  Create First Transaction
                </Button>
              )}
            </Card>
          ) : (
            <div className="space-y-4">
              {transactions.map((tx) => (
                <Card key={tx.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getTxStatusColor(tx.status)}>
                          {tx.status.toUpperCase()}
                        </Badge>
                        <code className="text-xs text-gray-500">
                          {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                        </code>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm">
                          <span className="font-medium">To:</span>{' '}
                          <code className="text-xs">{tx.destination}</code>
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Amount:</span>{' '}
                          {tx.amount} {tx.asset}
                        </p>
                        <p className="text-xs text-gray-500">
                          Created: {new Date(tx.createdAt).toLocaleString()}
                        </p>
                        {tx.executedAt && (
                          <p className="text-xs text-gray-500">
                            Executed: {new Date(tx.executedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    {isSigner && tx.status === 'pending' && (
                      <div className="flex gap-2">
                        {!hasApproved(tx) && !hasRejected(tx) && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {/* Handle approval */}}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {/* Handle rejection */}}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {hasApproved(tx) && (
                          <Badge className="bg-green-100 text-green-800">
                            Approved
                          </Badge>
                        )}
                        {hasRejected(tx) && (
                          <Badge className="bg-red-100 text-red-800">
                            Rejected
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="border-t pt-4 mt-2">
                    <div className="text-sm font-medium mb-2">
                      Approvals: {tx.approvals.length}/{vault.threshold}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tx.approvals.map((signer) => (
                        <Badge key={signer} variant="outline" className="bg-green-50">
                          {signer.slice(0, 6)}...{signer.slice(-4)}
                        </Badge>
                      ))}
                    </div>
                    {tx.rejections.length > 0 && (
                      <>
                        <div className="text-sm font-medium mt-3 mb-2 text-red-600">
                          Rejections:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {tx.rejections.map((signer) => (
                            <Badge key={signer} variant="outline" className="bg-red-50">
                              {signer.slice(0, 6)}...{signer.slice(-4)}
                            </Badge>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="signers">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Multi-Signature Signers</h3>
            <div className="space-y-3">
              {vault.signers.map((signer, index) => (
                <div key={signer} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">Signer {index + 1}</span>
                    <code className="block text-sm text-gray-600 mt-1">{signer}</code>
                  </div>
                  {signer === publicKey && (
                    <Badge className="bg-blue-100 text-blue-800">You</Badge>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ This vault requires {vault.threshold} out of {vault.signers.length} signatures
                to execute any transaction.
              </p>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="policies">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Security Policies</h3>
            <div className="space-y-4">
              {vault.policies.dailyLimit && (
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Daily Transaction Limit</span>
                  <span className="text-gray-900">{vault.policies.dailyLimit} XLM</span>
                </div>
              )}
              {vault.policies.allowedAssets && vault.policies.allowedAssets.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium block mb-2">Allowed Assets</span>
                  <div className="flex flex-wrap gap-2">
                    {vault.policies.allowedAssets.map((asset) => (
                      <Badge key={asset}>{asset}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {vault.policies.requireAllSigners && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="font-medium">Require All Signers</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Critical operations require unanimous approval from all signers
                  </p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {isSigner && (
          <TabsContent value="settings">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Vault Settings</h3>
              <div className="space-y-4">
                <Button variant="outline" className="w-full" onClick={() => {/* Handle threshold change */}}>
                  Change Signature Threshold
                </Button>
                <Button variant="outline" className="w-full" onClick={() => {/* Handle add signer */}}>
                  Add New Signer
                </Button>
                <Button variant="destructive" className="w-full" onClick={() => {/* Handle remove signer */}}>
                  Remove Signer
                </Button>
              </div>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}