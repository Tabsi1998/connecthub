import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import api from '@/src/services/api';
import { format, parseISO } from 'date-fns';
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
  created_by: string;
}

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadEvent();
  }, [id]);

  const loadEvent = async () => {
    try {
      const response = await api.get(`/api/events/${id}`);
      setEvent(response.data);
    } catch (error) {
      console.error('Error loading event:', error);
      Alert.alert('Fehler', 'Termin konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const handleAttend = async () => {
    setActionLoading(true);
    try {
      const response = await api.post(`/api/events/${id}/attend`);
      setEvent(response.data);
    } catch (error: any) {
      Alert.alert('Fehler', error.response?.data?.detail || 'Aktion fehlgeschlagen');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    setActionLoading(true);
    try {
      const response = await api.post(`/api/events/${id}/decline`);
      setEvent(response.data);
    } catch (error: any) {
      Alert.alert('Fehler', error.response?.data?.detail || 'Aktion fehlgeschlagen');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Termin löschen',
      'Möchtest du diesen Termin wirklich löschen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/events/${id}`);
              router.back();
            } catch (error) {
              Alert.alert('Fehler', 'Termin konnte nicht gelöscht werden');
            }
          },
        },
      ]
    );
  };

  const formatEventDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'EEEE, dd. MMMM yyyy', { locale: de });
    } catch {
      return dateStr;
    }
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

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Termin nicht gefunden</Text>
          <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
            <Text style={styles.backLinkText}>Zurück</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isAttending = event.attendees?.includes(user?.id || '');
  const isDeclined = event.declined?.includes(user?.id || '');
  const canEdit = user?.role === 'admin' || user?.role === 'trainer';
  const spotsLeft = event.max_participants
    ? event.max_participants - (event.attendees?.length || 0)
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Termindetails</Text>
        {canEdit && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.eventTitle}>{event.title}</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
            <Text style={styles.infoText}>{formatEventDate(event.date)}</Text>
          </View>
          {event.time && (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color="#3B82F6" />
              <Text style={styles.infoText}>{event.time} Uhr</Text>
            </View>
          )}
          {event.location && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color="#3B82F6" />
              <Text style={styles.infoText}>{event.location}</Text>
            </View>
          )}
        </View>

        {event.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Beschreibung</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Teilnehmer</Text>
          <View style={styles.attendanceStats}>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#10B981' }]}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.statNumber}>{event.attendees?.length || 0}</Text>
              <Text style={styles.statLabel}>Zusagen</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#EF4444' }]}>
                <Ionicons name="close" size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.statNumber}>{event.declined?.length || 0}</Text>
              <Text style={styles.statLabel}>Absagen</Text>
            </View>
            {spotsLeft !== null && (
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: '#F59E0B' }]}>
                  <Ionicons name="people" size={16} color="#FFFFFF" />
                </View>
                <Text style={styles.statNumber}>{spotsLeft}</Text>
                <Text style={styles.statLabel}>Frei</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.attendButton,
              isAttending && styles.activeButton,
            ]}
            onPress={handleAttend}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>
                  {isAttending ? 'Zugesagt' : 'Zusagen'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.declineButton,
              isDeclined && styles.activeDeclineButton,
            ]}
            onPress={handleDecline}
            disabled={actionLoading}
          >
            <Ionicons name="close-circle" size={22} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>
              {isDeclined ? 'Abgesagt' : 'Absagen'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  backLink: {
    marginTop: 16,
  },
  backLinkText: {
    color: '#3B82F6',
    fontSize: 16,
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
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  eventTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
  },
  attendanceStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
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
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  attendButton: {
    backgroundColor: '#334155',
  },
  declineButton: {
    backgroundColor: '#334155',
  },
  activeButton: {
    backgroundColor: '#10B981',
  },
  activeDeclineButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
