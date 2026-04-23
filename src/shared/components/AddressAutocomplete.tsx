import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';

interface Suggestion {
  place_id: number;
  display_name: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (address: string) => void;
  placeholder?: string;
}

const AddressAutocomplete = ({
  value,
  onChangeText,
  onSelect,
  placeholder = 'SAISIR UNE ADRESSE...',
}: AddressAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (value.length > 3 && showDropdown) {
        searchAddress(value);
      } else {
        setSuggestions([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [value, showDropdown]);

  const searchAddress = async (query: string) => {
    try {
      setLoading(true);
      const encodedValue = encodeURIComponent(query);
      const url = `https://nominatim.openstreetmap.org/search?q=${encodedValue}&format=json&addressdetails=1&limit=5`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SprintysApp/1.0',
        },
      });
      
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error('Nominatim error:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item: Suggestion) => {
    onSelect(item.display_name);
    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleTextChange = (text: string) => {
    onChangeText(text);
    setShowDropdown(true);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={handleTextChange}
        placeholder={placeholder}
        placeholderTextColor="#555"
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
      />
      
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color="#00E5FF" />
        </View>
      )}

      {showDropdown && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          <BlurView intensity={90} tint="dark" style={styles.dropdownBlur}>
            {suggestions.map((item) => (
              <TouchableOpacity
                key={item.place_id}
                style={styles.suggestionItem}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.suggestionText} numberOfLines={2}>
                  {item.display_name}
                </Text>
              </TouchableOpacity>
            ))}
          </BlurView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    zIndex: 1000,
    position: 'relative',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  loader: {
    position: 'absolute',
    right: 12,
    top: 14,
  },
  dropdown: {
    position: 'absolute',
    top: 55,
    left: 0,
    right: 0,
    zIndex: 2000,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#00E5FF',
    backgroundColor: '#111',
  },
  dropdownBlur: {
    padding: 4,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  suggestionText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default AddressAutocomplete;
