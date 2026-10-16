import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { secureAuthStorage } from '../secureAuthStorage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  isAvailableAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const asyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const secureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('secureAuthStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('recopie une ancienne session dans le coffre puis l’efface', async () => {
    secureStore.isAvailableAsync.mockResolvedValue(true);
    secureStore.getItemAsync.mockImplementation(async (key: string) => (key.endsWith('.n') ? null : null));
    asyncStorage.getItem.mockResolvedValue('session-ancienne');

    await expect(secureAuthStorage.getItem('sb-auth-token')).resolves.toBe('session-ancienne');

    expect(secureStore.setItemAsync).toHaveBeenCalledWith('sb-auth-token.0', 'session-ancienne');
    expect(secureStore.setItemAsync).toHaveBeenCalledWith('sb-auth-token.n', '1');
    expect(asyncStorage.removeItem).toHaveBeenCalledWith('sb-auth-token');
  });

  it('découpe une longue session pour rester dans le coffre', async () => {
    secureStore.isAvailableAsync.mockResolvedValue(true);
    secureStore.getItemAsync.mockResolvedValue(null);
    const value = 'a'.repeat(1801);

    await secureAuthStorage.setItem('sb-auth-token', value);

    expect(secureStore.setItemAsync).toHaveBeenCalledWith('sb-auth-token.0', 'a'.repeat(1800));
    expect(secureStore.setItemAsync).toHaveBeenCalledWith('sb-auth-token.1', 'a');
    expect(secureStore.setItemAsync).toHaveBeenCalledWith('sb-auth-token.n', '2');
  });

  it('utilise le stockage habituel quand le coffre n’existe pas', async () => {
    secureStore.isAvailableAsync.mockResolvedValue(false);
    asyncStorage.getItem.mockResolvedValue('session-web');

    await expect(secureAuthStorage.getItem('sb-auth-token')).resolves.toBe('session-web');
    expect(secureStore.getItemAsync).not.toHaveBeenCalled();
  });
});
