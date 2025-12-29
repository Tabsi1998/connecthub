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
import { useAuth } from '@/src/context/AuthContext';
import api from '@/src/services/api';

interface Group {
  id: string;
  name: string;
  description?: string;
  type: string;
  members: string[];
}

export default function Groups() {
  const { user } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadGroups = async () => {
    try {
      const response = await api.get('/api/groups');
      setGroups(response.data);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadGroups();
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      vorstand: 'shield',
      mitglieder: 'people',
      team: 'football',
      projekt: 'construct',
      events: 'calendar',
      allgemein: 'chatbubbles',
    };
    return icons[type] || 'chatbubbles';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      vorstand: '#EF4444',
      mitglieder: '#3B82F6',
      team: '#10B981',
      projekt: '#F59E0B',
      events: '#8B5CF6',
      allgemein: '#64748B',
    };
    return colors[type] || '#64748B';
  };

  const canCreateGroup = user?.role === 'admin' || user?.role === 'trainer';

  const renderGroup = ({ item }: { item: Group }) => (
    <TouchableOpacity
      style={styles.groupCard}
      onPress={() => router.push(`/group/${item.id}`)}
    >
      <View style={[styles.groupIcon, { backgroundColor: getTypeColor(item.type) }]}>
        <Ionicons name={getTypeIcon(item.type) as any} size={24} color="#FFFFFF" />
      </View>
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{item.name}</Text>
        {item.description && (
          <Text style={styles.groupDescription} numberOfLines={1}>
            {item.description}
          </Text>
        )}
        <View style={styles.groupMeta}>
          <Ionicons name="people-outline" size={14} color="#64748B" />
          <Text style={styles.memberCount}>{item.members?.length || 0} Mitglieder</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#64748B" />
    </TouchableOpacity>
  );

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
        <Text style={styles.title}>Gruppen</Text>
        {canCreateGroup && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/group/create')}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={groups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#64748B" />
            <Text style={styles.emptyTitle}>Keine Gruppen</Text>
            <Text style={styles.emptyText}>
              {canCreateGroup
                ? 'Erstelle deine erste Gruppe'
                : 'Du bist noch keiner Gruppe zugewiesen'}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  groupDescription: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 2,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  memberCount: {
    fontSize: 12,
    color: '#64748B',
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
