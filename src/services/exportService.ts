import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';
import { supabase } from './supabase';
import { useSprintyChatStore } from '../store/sprintyChatStore';

/**
 * RGPD portability: server data (edge function export_data) plus what only lives on this phone
 * (the Sprinty conversations), shared as a .json file.
 */
export async function exportMyData(): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke('export_data');
  if (error) throw error;

  const payload = {
    ...data,
    sprinty_conversations_on_this_device: useSprintyChatStore.getState().conversations,
  };
  const json = JSON.stringify(payload, null, 2);

  if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) {
    await Share.share({ title: 'Mes données Sprintys', message: json });
    return true;
  }
  const date = new Date().toISOString().slice(0, 10);
  const uri = `${FileSystem.cacheDirectory}sprintys-donnees-${date}.json`;
  await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Mes données Sprintys', UTI: 'public.json' });
  return true;
}
