import { Transaction, SorobanRpc, Address, xdr } from '@stellar/stellar-sdk';

declare global {
  interface Window {
    freighter: any;
  }
}

export const isFreighterInstalled = (): boolean => {
  return typeof window !== 'undefined' && !!window.freighter;
};

export const getFreighterPublicKey = async (): Promise<string> => {
  if (!isFreighterInstalled()) {
    throw new Error('Freighter is not installed');
  }

  try {
    const publicKey = await window.freighter.getPublicKey();
    return publicKey;
  } catch (error) {
    console.error('Error getting public key:', error);
    throw new Error('Failed to get public key from Freighter');
  }
};

export const signTransaction = async (
  transaction: Transaction,
  networkPassphrase: string
): Promise<string> => {
  if (!isFreighterInstalled()) {
    throw new Error('Freighter is not installed');
  }

  try {
    const signedXDR = await window.freighter.signTransaction(
      transaction.toXDR(),
      networkPassphrase
    );
    return signedXDR;
  } catch (error) {
    console.error('Error signing transaction:', error);
    throw new Error('Failed to sign transaction');
  }
};

export const signAuthEntry = async (
  authEntry: xdr.SorobanAuthorizationEntry,
  networkPassphrase: string
): Promise<xdr.SorobanAuthorizationEntry> => {
  if (!isFreighterInstalled()) {
    throw new Error('Freighter is not installed');
  }

  try {
    const signedAuthEntry = await window.freighter.signAuthEntry(
      authEntry.toXDR(),
      networkPassphrase
    );
    return xdr.SorobanAuthorizationEntry.fromXDR(signedAuthEntry, 'base64');
  } catch (error) {
    console.error('Error signing auth entry:', error);
    throw new Error('Failed to sign authorization entry');
  }
};

export const getNetwork = async (): Promise<string> => {
  if (!isFreighterInstalled()) {
    throw new Error('Freighter is not installed');
  }

  try {
    const network = await window.freighter.getNetwork();
    return network;
  } catch (error) {
    console.error('Error getting network:', error);
    throw new Error('Failed to get network from Freighter');
  }
};

export const setNetwork = async (network: 'PUBLIC' | 'TESTNET' | 'STANDALONE'): Promise<void> => {
  if (!isFreighterInstalled()) {
    throw new Error('Freighter is not installed');
  }

  try {
    await window.freighter.setNetwork(network);
  } catch (error) {
    console.error('Error setting network:', error);
    throw new Error('Failed to set network');
  }
};

export const isAllowed = async (): Promise<boolean> => {
  if (!isFreighterInstalled()) {
    return false;
  }

  try {
    const allowed = await window.freighter.isAllowed();
    return allowed;
  } catch (error) {
    console.error('Error checking if allowed:', error);
    return false;
  }
};

export const requestAccess = async (): Promise<boolean> => {
  if (!isFreighterInstalled()) {
    throw new Error('Freighter is not installed');
  }

  try {
    await window.freighter.requestAccess();
    return true;
  } catch (error) {
    console.error('Error requesting access:', error);
    return false;
  }
};

export const getNetworkDetails = async (): Promise<{
  network: string;
  networkPassphrase: string;
  sorobanRpcUrl: string;
}> => {
  const network = await getNetwork();
  
  const networkConfigs = {
    PUBLIC: {
      network: 'PUBLIC',
      networkPassphrase: 'Public Global Stellar Network ; September 2015',
      sorobanRpcUrl: 'https://soroban-rpc.stellar.org'
    },
    TESTNET: {
      network: 'TESTNET',
      networkPassphrase: 'Test SDF Network ; September 2015',
      sorobanRpcUrl: 'https://soroban-testnet.stellar.org'
    },
    STANDALONE: {
      network: 'STANDALONE',
      networkPassphrase: 'Standalone Network ; February 2017',
      sorobanRpcUrl: 'http://localhost:8000/soroban/rpc'
    }
  };

  return networkConfigs[network as keyof typeof networkConfigs] || networkConfigs.TESTNET;
};

export const signBlob = async (blob: string): Promise<string> => {
  if (!isFreighterInstalled()) {
    throw new Error('Freighter is not installed');
  }

  try {
    const signature = await window.freighter.signBlob(blob);
    return signature;
  } catch (error) {
    console.error('Error signing blob:', error);
    throw new Error('Failed to sign blob');
  }
};

export const getAddress = async (): Promise<string> => {
  if (!isFreighterInstalled()) {
    throw new Error('Freighter is not installed');
  }

  try {
    const address = await window.freighter.getAddress();
    return address;
  } catch (error) {
    console.error('Error getting address:', error);
    throw new Error('Failed to get address');
  }
};

export const getPublicKey = async (): Promise<string> => {
  return getFreighterPublicKey();
};

export default {
  isFreighterInstalled,
  getFreighterPublicKey,
  signTransaction,
  signAuthEntry,
  getNetwork,
  setNetwork,
  isAllowed,
  requestAccess,
  getNetworkDetails,
  signBlob,
  getAddress,
  getPublicKey,
};