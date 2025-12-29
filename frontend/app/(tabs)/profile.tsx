import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import api from '@/src/services/api';

export default function Profile() {
  const { user, logout, updateUser } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    position: user?.position || '',
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await api.put(`/api/users/${user?.id}`, formData);
      updateUser(response.data);
      setEditing(false);
      Alert.alert('Erfolg', 'Profil aktualisiert');
    } catch (error: any) {
      Alert.alert('Fehler', error.response?.data?.detail || 'Aktualisierung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Abmelden',
      'Möchtest du dich wirklich abmelden?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Abmelden',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/auth/login');
          },
        },
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

  const roleBadge = getRoleBadge(user?.role || 'mitglied');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Profil</Text>
          {!editing && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setEditing(true)}
            >
              <Ionicons name="pencil" size={20} color="#3B82F6" />
            </TouchableOpacity>
          )}
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: roleBadge.color }]}>
            <Text style={styles.roleText}>{roleBadge.label}</Text>
          </View>
        </View>

        {/* Profile Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Persönliche Daten</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Dein Name"
                placeholderTextColor="#64748B"
              />
            ) : (
              <Text style={styles.value}>{user?.name}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>E-Mail</Text>
            <Text style={styles.value}>{user?.email}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Telefon</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="Deine Telefonnummer"
                placeholderTextColor="#64748B"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.value}>{user?.phone || 'Nicht angegeben'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Funktion im Verein</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={formData.position}
                onChangeText={(text) => setFormData({ ...formData, position: text })}
                placeholder="z.B. Trainer, Vorstand, etc."
                placeholderTextColor="#64748B"
              />
            ) : (
              <Text style={styles.value}>{user?.position || 'Nicht angegeben'}</Text>
            )}
          </View>

          {editing && (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setEditing(false);
                  setFormData({
                    name: user?.name || '',
                    phone: user?.phone || '',
                    position: user?.position || '',
                  });
                }}
              >
                <Text style={styles.cancelButtonText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, loading && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Speichern</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Admin Section */}
        {user?.role === 'admin' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Administration</Text>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/admin/members')}
            >
              <Ionicons name="people" size={22} color="#3B82F6" />
              <Text style={styles.menuItemText}>Mitgliederverwaltung</Text>
              <Ionicons name="chevron-forward" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
        )}

        {/* Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Einstellungen</Text>
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications" size={22} color="#F59E0B" />
            <Text style={styles.menuItemText}>Benachrichtigungen</Text>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/documents')}
          >
            <Ionicons name="document-text" size={22} color="#10B981" />
            <Text style={styles.menuItemText}>Dokumente</Text>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out" size={22} color="#EF4444" />
            <Text style={styles.logoutText}>Abmelden</Text>
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
  scrollView: {
    flex: 1,
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
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  field: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  input: {
    fontSize: 16,
    color: '#FFFFFF',
    padding: 0,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '600',
  },
});
