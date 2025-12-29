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
import { format } from 'date-fns';

export default function CreateEvent() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Titel ein');
      return;
    }
    if (!date.trim()) {
      Alert.alert('Fehler', 'Bitte gib ein Datum ein (Format: JJJJ-MM-TT)');
      return;
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      Alert.alert('Fehler', 'Ungültiges Datumsformat. Bitte verwende JJJJ-MM-TT');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/events', {
        title: title.trim(),
        description: description.trim() || null,
        date: date.trim(),
        time: time.trim() || null,
        location: location.trim() || null,
        max_participants: maxParticipants ? parseInt(maxParticipants) : null,
      });
      Alert.alert('Erfolg', 'Termin erstellt', [
        { text: 'OK', onPress: () => router.replace(`/event/${response.data.id}`) },
      ]);
    } catch (error: any) {
      Alert.alert('Fehler', error.response?.data?.detail || 'Termin konnte nicht erstellt werden');
    } finally {
      setLoading(false);
    }
  };

  const setToday = () => {
    setDate(format(new Date(), 'yyyy-MM-dd'));
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
          <Text style={styles.headerTitle}>Neuer Termin</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.field}>
            <Text style={styles.label}>Titel *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="z.B. Mannschaftstraining"
              placeholderTextColor="#64748B"
              maxLength={100}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Beschreibung</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Details zum Termin..."
              placeholderTextColor="#64748B"
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Datum * (JJJJ-MM-TT)</Text>
              <TouchableOpacity onPress={setToday}>
                <Text style={styles.todayButton}>Heute</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="z.B. 2025-07-15"
              placeholderTextColor="#64748B"
              keyboardType="numbers-and-punctuation"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Uhrzeit</Text>
            <TextInput
              style={styles.input}
              value={time}
              onChangeText={setTime}
              placeholder="z.B. 18:00"
              placeholderTextColor="#64748B"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Ort</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="z.B. Sporthalle München"
              placeholderTextColor="#64748B"
              maxLength={100}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Max. Teilnehmer (optional)</Text>
            <TextInput
              style={styles.input}
              value={maxParticipants}
              onChangeText={setMaxParticipants}
              placeholder="z.B. 20"
              placeholderTextColor="#64748B"
              keyboardType="number-pad"
            />
          </View>

          <TouchableOpacity
            style={[styles.createButton, loading && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.createButtonText}>Termin erstellen</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
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
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  todayButton: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
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
