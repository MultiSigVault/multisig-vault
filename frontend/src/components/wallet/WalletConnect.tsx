'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { 
  isFreighterInstalled, 
  getFreighterPublicKey, 
  signTransaction,
  getNetwork,
  setNetwork
} from '@/lib/stellar/freighter';
import { Loader2, Wallet, LogOut, AlertCircle, CheckCircle } from 'lucide-react';

interface WalletConnectProps {
  onConnect?: (publicKey: string) => void;
  onDisconnect?: () => void;
}

export function WalletConnect({ onConnect, onDisconnect }: WalletConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [network, setNetworkState] = useState<string>('');

  useEffect(() => {
    checkConnection();
    checkNetwork();
  }, []);

  const checkConnection = async () => {
    try {
      if (isFreighterInstalled()) {
        const key = await getFreighterPublicKey();
        if (key) {
          setPublicKey(key);
          localStorage.setItem('walletPublicKey', key);
          onConnect?.(key);
        }
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const checkNetwork = async () => {
    try {
      const currentNetwork = await getNetwork();
      setNetworkState(currentNetwork);
    } catch (error) {
      console.error('Error getting network:', error);
    }
  };

  const handleConnect = async () => {
    if (!isFreighterInstalled()) {
      setError('Freighter wallet is not installed. Please install it first.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const key = await getFreighterPublicKey();
      if (key) {
        setPublicKey(key);
        localStorage.setItem('walletPublicKey', key);
        onConnect?.(key);
        
        // Check network
        const currentNetwork = await getNetwork();
        setNetworkState(currentNetwork);
        
        if (currentNetwork !== 'PUBLIC') {
          setError('Please switch to Public Network in Freighter');
        }
      }
    } catch (err: any) {
      console.error('Connection error:', err);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setPublicKey(null);
    localStorage.removeItem('walletPublicKey');
    onDisconnect?.();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (publicKey) {
    return (
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-700">
            {formatAddress(publicKey)}
          </span>
        </div>
        <Button
          variant="outline"
          onClick={handleDisconnect}
          className="flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        onClick={handleConnect}
        disabled={isConnecting}
        className="flex items-center gap-2"
      >
        {isConnecting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Wallet className="w-4 h-4" />
            Connect Wallet
          </>
        )}
      </Button>
      
      {error && (
        <div className="absolute top-full mt-2 right-0 z-10 bg-red-50 border border-red-200 rounded-lg p-3 min-w-[240px]">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      )}

      {!isFreighterInstalled() && (
        <div className="absolute top-full mt-2 right-0 z-10 bg-yellow-50 border border-yellow-200 rounded-lg p-3 min-w-[240px]">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-700">
              Freighter not installed. 
              <a 
                href="https://www.freighter.app/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline ml-1"
              >
                Install Freighter
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}