import React from 'react';
import { Stack } from 'expo-router';

/** Accès IA: its own stack (keys, creation, guide, notes, activity) inside the athlete tabs */
export default function AiAccessLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />;
}
