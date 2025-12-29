import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/services/api';

const GROUP_TYPES = [
  { value: 'allgemein', label: 'Allgemein', icon: 'chatbubbles', color: '#64748B' },
  { value: 'vorstand', label: 'Vorstand', icon: 'shield', color: '#EF4444' },
  { value: 'mitglieder', label: 'Mitglieder', icon: 'people', color: '#3B82F6' },
  { value: 'team', label: 'Team/Mannschaft', icon: 'football', color: '#10B981' },
  { value: 'projekt', label: 'Projekt', icon: 'construct', color: '#F59E0B' },
  { value: 'events', label: 'Events', icon: 'calendar', color: '#8B5CF6' },
];

export default function CreateGroup() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('allgemein');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Gruppennamen ein');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/groups', {
        name: name.trim(),
        description: description.trim() || null,
        type,
      });
      Alert.alert('Erfolg', 'Gruppe erstellt', [
        { text: 'OK', onPress: () => router.replace(`/group/${response.data.id}`) },
      ]);
    } catch (error: any) {
      Alert.alert('Fehler', error.response?.data?.detail || 'Gruppe konnte nicht erstellt werden');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Neue Gruppe</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.field}>
            <Text style={styles.label}>Gruppenname *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="z.B. Trainingsgruppe A"
              placeholderTextColor="#64748B"
              maxLength={50}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Beschreibung</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Kurze Beschreibung der Gruppe..."
              placeholderTextColor="#64748B"
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Gruppentyp</Text>
            <View style={styles.typeGrid}>
              {GROUP_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[
                    styles.typeOption,
                    type === t.value && { borderColor: t.color, backgroundColor: `${t.color}20` },
                  ]}
                  onPress={() => setType(t.value)}
                >
                  <Ionicons name={t.icon as any} size={24} color={t.color} />
                  <Text style={[styles.typeLabel, type === t.value && { color: t.color }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.createButton, loading && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.createButtonText}>Gruppe erstellen</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#334155',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeOption: {
    width: '47%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 8,
  },
  createButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
