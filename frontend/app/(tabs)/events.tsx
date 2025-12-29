import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import api from '@/src/services/api';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';
import { de } from 'date-fns/locale';

interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  location?: string;
  attendees: string[];
  declined: string[];
  max_participants?: number;
}

export default function Events() {
  const { user } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEvents = async () => {
    try {
      const response = await api.get('/api/events');
      setEvents(response.data);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadEvents();
  };

  const formatEventDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      if (isToday(date)) return 'Heute';
      if (isTomorrow(date)) return 'Morgen';
      return format(date, 'EEEE, dd. MMMM', { locale: de });
    } catch {
      return dateStr;
    }
  };

  const getAttendanceStatus = (event: Event) => {
    if (event.attendees?.includes(user?.id || '')) return 'attending';
    if (event.declined?.includes(user?.id || '')) return 'declined';
    return 'pending';
  };

  const canCreateEvent = user?.role === 'admin' || user?.role === 'trainer';

  const renderEvent = ({ item }: { item: Event }) => {
    const status = getAttendanceStatus(item);
    const isPastEvent = isPast(parseISO(item.date));
    const spotsLeft = item.max_participants
      ? item.max_participants - (item.attendees?.length || 0)
      : null;

    return (
      <TouchableOpacity
        style={[styles.eventCard, isPastEvent && styles.pastEventCard]}
        onPress={() => router.push(`/event/${item.id}`)}
      >
        <View style={styles.eventHeader}>
          <View style={styles.dateContainer}>
            <Text style={styles.eventDate}>{formatEventDate(item.date)}</Text>
            {item.time && <Text style={styles.eventTime}>{item.time} Uhr</Text>}
          </View>
          <View
            style={[
              styles.statusBadge,
              status === 'attending' && styles.statusAttending,
              status === 'declined' && styles.statusDeclined,
            ]}
          >
            <Text style={styles.statusText}>
              {status === 'attending'
                ? 'Zugesagt'
                : status === 'declined'
                ? 'Abgesagt'
                : 'Offen'}
            </Text>
          </View>
        </View>

        <Text style={styles.eventTitle}>{item.title}</Text>
        
        {item.description && (
          <Text style={styles.eventDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.eventFooter}>
          {item.location && (
            <View style={styles.eventMeta}>
              <Ionicons name="location-outline" size={16} color="#64748B" />
              <Text style={styles.eventMetaText}>{item.location}</Text>
            </View>
          )}
          <View style={styles.eventMeta}>
            <Ionicons name="people-outline" size={16} color="#64748B" />
            <Text style={styles.eventMetaText}>
              {item.attendees?.length || 0} Zusagen
              {spotsLeft !== null && ` (${spotsLeft} Plätze frei)`}
            </Text>
          </View>
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
        <Text style={styles.title}>Termine</Text>
        {canCreateEvent && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/event/create')}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#64748B" />
            <Text style={styles.emptyTitle}>Keine Termine</Text>
            <Text style={styles.emptyText}>
              {canCreateEvent
                ? 'Erstelle deinen ersten Termin'
                : 'Aktuell gibt es keine geplanten Termine'}
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
  eventCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  pastEventCard: {
    opacity: 0.6,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dateContainer: {
    flex: 1,
  },
  eventDate: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  eventTime: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  statusAttending: {
    backgroundColor: '#10B981',
  },
  statusDeclined: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 12,
  },
  eventFooter: {
    gap: 8,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventMetaText: {
    fontSize: 13,
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
