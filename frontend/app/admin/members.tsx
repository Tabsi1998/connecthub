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

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  position?: string;
}

export default function MemberManagement() {
  const { user } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMembers = async () => {
    try {
      const response = await api.get('/api/users');
      setMembers(response.data);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMembers();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadMembers();
  };

  const changeRole = (member: User) => {
    const roles = ['admin', 'trainer', 'mitglied', 'gast'];
    Alert.alert(
      'Rolle ändern',
      `Aktuelle Rolle: ${member.role}`,
      [
        ...roles.map((role) => ({
          text: role.charAt(0).toUpperCase() + role.slice(1),
          onPress: async () => {
            try {
              await api.put(`/api/users/${member.id}/role?role=${role}`);
              loadMembers();
            } catch (error: any) {
              Alert.alert('Fehler', error.response?.data?.detail || 'Rolle konnte nicht geändert werden');
            }
          },
        })),
        { text: 'Abbrechen', style: 'cancel' },
      ]
    );
  };

  const getRoleBadge = (role: string) => {
    const roles: Record<string, { label: string; color: string }> = {
      admin: { label: 'Admin', color: '#EF4444' },
      trainer: { label: 'Trainer', color: '#F59E0B' },
      mitglied: { label: 'Mitglied', color: '#3B82F6' },
      gast: { label: 'Gast', color: '#64748B' },
    };
    return roles[role] || roles.mitglied;
  };

  const renderMember = ({ item }: { item: User }) => {
    const badge = getRoleBadge(item.role);
    const isCurrentUser = item.id === user?.id;

    return (
      <TouchableOpacity
        style={styles.memberCard}
        onPress={() => !isCurrentUser && changeRole(item)}
        disabled={isCurrentUser}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>
            {item.name} {isCurrentUser && '(Du)'}
          </Text>
          <Text style={styles.memberEmail}>{item.email}</Text>
          {item.position && (
            <Text style={styles.memberPosition}>{item.position}</Text>
          )}
        </View>
        <View style={[styles.roleBadge, { backgroundColor: badge.color }]}>
          <Text style={styles.roleText}>{badge.label}</Text>
        </View>
      </TouchableOpacity>
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
        <Text style={styles.title}>Mitgliederverwaltung</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{members.length}</Text>
          <Text style={styles.statLabel}>Gesamt</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {members.filter((m) => m.role === 'admin').length}
          </Text>
          <Text style={styles.statLabel}>Admins</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {members.filter((m) => m.role === 'trainer').length}
          </Text>
          <Text style={styles.statLabel}>Trainer</Text>
        </View>
      </View>

      <Text style={styles.hint}>Tippe auf ein Mitglied um die Rolle zu ändern</Text>

      <FlatList
        data={members}
        renderItem={renderMember}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
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
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  hint: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 8,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  memberEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  memberPosition: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
