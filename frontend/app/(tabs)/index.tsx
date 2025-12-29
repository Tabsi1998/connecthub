import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

interface DashboardData {
  upcoming_events: any[];
  unread_notifications: number;
  recent_notifications: any[];
  groups: any[];
  member_count: number;
  recent_documents: any[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async () => {
    try {
      const response = await api.get('/api/dashboard');
      setData(response.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd. MMM', { locale: de });
    } catch {
      return dateStr;
    }
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  const roleBadge = getRoleBadge(user?.role || 'mitglied');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Willkommen zurück,</Text>
            <Text style={styles.userName}>{user?.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications" size={24} color="#FFFFFF" />
            {(data?.unread_notifications || 0) > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{data?.unread_notifications}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Role Badge */}
        <View style={[styles.roleCard, { borderLeftColor: roleBadge.color }]}>
          <Ionicons name="shield-checkmark" size={20} color={roleBadge.color} />
          <Text style={styles.roleText}>Rolle: {roleBadge.label}</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={28} color="#3B82F6" />
            <Text style={styles.statNumber}>{data?.member_count || 0}</Text>
            <Text style={styles.statLabel}>Mitglieder</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="chatbubbles" size={28} color="#10B981" />
            <Text style={styles.statNumber}>{data?.groups?.length || 0}</Text>
            <Text style={styles.statLabel}>Gruppen</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={28} color="#F59E0B" />
            <Text style={styles.statNumber}>{data?.upcoming_events?.length || 0}</Text>
            <Text style={styles.statLabel}>Termine</Text>
          </View>
        </View>

        {/* Upcoming Events */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nächste Termine</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/events')}>
              <Text style={styles.seeAll}>Alle ansehen</Text>
            </TouchableOpacity>
          </View>
          {data?.upcoming_events && data.upcoming_events.length > 0 ? (
            data.upcoming_events.slice(0, 3).map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={() => router.push(`/event/${event.id}`)}
              >
                <View style={styles.eventDate}>
                  <Text style={styles.eventDateText}>{formatDate(event.date)}</Text>
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  {event.location && (
                    <View style={styles.eventLocation}>
                      <Ionicons name="location" size={14} color="#64748B" />
                      <Text style={styles.eventLocationText}>{event.location}</Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#64748B" />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={40} color="#64748B" />
              <Text style={styles.emptyText}>Keine anstehenden Termine</Text>
            </View>
          )}
        </View>

        {/* Recent Notifications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Neueste Benachrichtigungen</Text>
            <TouchableOpacity onPress={() => router.push('/notifications')}>
              <Text style={styles.seeAll}>Alle ansehen</Text>
            </TouchableOpacity>
          </View>
          {data?.recent_notifications && data.recent_notifications.length > 0 ? (
            data.recent_notifications.slice(0, 3).map((notification) => (
              <View
                key={notification.id}
                style={[
                  styles.notificationCard,
                  !notification.read && styles.notificationUnread,
                ]}
              >
                <View
                  style={[
                    styles.notificationIcon,
                    { backgroundColor: notification.read ? '#334155' : '#3B82F6' },
                  ]}
                >
                  <Ionicons
                    name={
                      notification.type === 'new_message'
                        ? 'chatbubble'
                        : notification.type === 'new_event'
                        ? 'calendar'
                        : 'notifications'
                    }
                    size={16}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={styles.notificationText}>{notification.message}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-outline" size={40} color="#64748B" />
              <Text style={styles.emptyText}>Keine Benachrichtigungen</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        {(user?.role === 'admin' || user?.role === 'trainer') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Schnellaktionen</Text>
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => router.push('/event/create')}
              >
                <Ionicons name="add-circle" size={24} color="#3B82F6" />
                <Text style={styles.quickActionText}>Termin erstellen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => router.push('/group/create')}
              >
                <Ionicons name="people-circle" size={24} color="#10B981" />
                <Text style={styles.quickActionText}>Gruppe erstellen</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  greeting: {
    fontSize: 14,
    color: '#64748B',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    gap: 8,
  },
  roleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    padding: 20,
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
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  seeAll: {
    fontSize: 14,
    color: '#3B82F6',
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  eventDate: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 8,
    marginRight: 12,
  },
  eventDateText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  eventLocationText: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#1E293B',
    borderRadius: 12,
  },
  emptyText: {
    color: '#64748B',
    marginTop: 8,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  notificationUnread: {
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  notificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
