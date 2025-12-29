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
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import api from '../../src/services/api';

export default function UploadDocument() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile(file);
        if (!name) {
          setName(file.name || 'Dokument');
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Fehler', 'Datei konnte nicht ausgewählt werden');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('Fehler', 'Bitte wähle eine Datei aus');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Namen ein');
      return;
    }

    setLoading(true);
    try {
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(selectedFile.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await api.post('/api/documents', {
        name: name.trim(),
        content: base64,
        file_type: selectedFile.mimeType || 'application/octet-stream',
      });

      Alert.alert('Erfolg', 'Dokument hochgeladen', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Fehler', error.response?.data?.detail || 'Upload fehlgeschlagen');
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
          <Text style={styles.headerTitle}>Dokument hochladen</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.uploadArea} onPress={pickDocument}>
            {selectedFile ? (
              <>
                <Ionicons name="document-text" size={48} color="#3B82F6" />
                <Text style={styles.fileName}>{selectedFile.name}</Text>
                <Text style={styles.fileSize}>
                  {((selectedFile.size || 0) / 1024).toFixed(1)} KB
                </Text>
                <Text style={styles.changeText}>Tippen um zu ändern</Text>
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={48} color="#64748B" />
                <Text style={styles.uploadText}>Datei auswählen</Text>
                <Text style={styles.uploadHint}>PDF, Bilder, Dokumente</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.field}>
            <Text style={styles.label}>Dokumentname</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Name des Dokuments"
              placeholderTextColor="#64748B"
              maxLength={100}
            />
          </View>

          <TouchableOpacity
            style={[styles.uploadButton, loading && styles.buttonDisabled]}
            onPress={handleUpload}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
                <Text style={styles.uploadButtonText}>Hochladen</Text>
              </>
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
  uploadArea: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
    padding: 40,
    alignItems: 'center',
    marginBottom: 24,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 12,
    textAlign: 'center',
  },
  fileSize: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  changeText: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 8,
  },
  uploadText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 12,
  },
  uploadHint: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
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
  uploadButton: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
