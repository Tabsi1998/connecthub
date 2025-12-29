import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import api from '../src/services/api';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

interface Document {
  id: string;
  name: string;
  file_type: string;
  uploaded_by: string;
  uploader_name: string;
  created_at: string;
  group_id?: string;
}

export default function Documents() {
  const { user } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDocuments = async () => {
    try {
      const response = await api.get('/api/documents');
      setDocuments(response.data);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDocuments();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadDocuments();
  };

  const deleteDocument = (doc: Document) => {
    Alert.alert(
      'Dokument löschen',
      `Möchtest du "${doc.name}" wirklich löschen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/documents/${doc.id}`);
              loadDocuments();
            } catch (error) {
              Alert.alert('Fehler', 'Dokument konnte nicht gelöscht werden');
            }
          },
        },
      ]
    );
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return { name: 'document-text', color: '#EF4444' };
    if (fileType.includes('image')) return { name: 'image', color: '#10B981' };
    if (fileType.includes('word') || fileType.includes('doc')) return { name: 'document', color: '#3B82F6' };
    if (fileType.includes('excel') || fileType.includes('sheet')) return { name: 'grid', color: '#10B981' };
    return { name: 'document-attach', color: '#64748B' };
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd. MMM yyyy', { locale: de });
    } catch {
      return dateStr;
    }
  };

  const canManage = user?.role === 'admin' || user?.role === 'trainer';

  const renderDocument = ({ item }: { item: Document }) => {
    const icon = getFileIcon(item.file_type);
    return (
      <View style={styles.documentCard}>
        <View style={[styles.fileIcon, { backgroundColor: `${icon.color}20` }]}>
          <Ionicons name={icon.name as any} size={24} color={icon.color} />
        </View>
        <View style={styles.documentInfo}>
          <Text style={styles.documentName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.documentMeta}>
            Von {item.uploader_name} • {formatDate(item.created_at)}
          </Text>
        </View>
        {canManage && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteDocument(item)}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Dokumente</Text>
        {canManage && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/document/upload')}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={documents}
        renderItem={renderDocument}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color="#64748B" />
            <Text style={styles.emptyTitle}>Keine Dokumente</Text>
            <Text style={styles.emptyText}>
              {canManage
                ? 'Lade das erste Dokument hoch'
                : 'Es wurden noch keine Dokumente geteilt'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  fileIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  documentMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
});
