import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import api from '@/src/services/api';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  created_at: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  type: string;
  members: string[];
}

export default function GroupChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadData();
    // Poll for new messages every 5 seconds
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const loadData = async () => {
    try {
      const [groupRes, messagesRes] = await Promise.all([
        api.get(`/api/groups/${id}`),
        api.get(`/api/groups/${id}/messages`),
      ]);
      setGroup(groupRes.data);
      setMessages(messagesRes.data);
    } catch (error) {
      console.error('Error loading group:', error);
      Alert.alert('Fehler', 'Gruppe konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await api.get(`/api/groups/${id}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const response = await api.post(`/api/groups/${id}/messages`, {
        content: newMessage.trim(),
      });
      setMessages([...messages, response.data]);
      setNewMessage('');
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      Alert.alert('Fehler', error.response?.data?.detail || 'Nachricht konnte nicht gesendet werden');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'HH:mm', { locale: de });
    } catch {
      return '';
    }
  };

  const formatMessageDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd. MMM yyyy', { locale: de });
    } catch {
      return '';
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwn = item.sender_id === user?.id;
    const showDate =
      index === 0 ||
      formatMessageDate(item.created_at) !== formatMessageDate(messages[index - 1]?.created_at);

    return (
      <View>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>{formatMessageDate(item.created_at)}</Text>
          </View>
        )}
        <View style={[styles.messageContainer, isOwn && styles.ownMessageContainer]}>
          {!isOwn && <Text style={styles.senderName}>{item.sender_name}</Text>}
          <View style={[styles.messageBubble, isOwn && styles.ownMessageBubble]}>
            <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>
              {item.content}
            </Text>
            <Text style={[styles.messageTime, isOwn && styles.ownMessageTime]}>
              {formatTime(item.created_at)}
            </Text>
          </View>
        </View>
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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{group?.name}</Text>
          <Text style={styles.headerSubtitle}>{group?.members?.length || 0} Mitglieder</Text>
        </View>
        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => router.push(`/group/${id}/info`)}
        >
          <Ionicons name="information-circle-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color="#64748B" />
              <Text style={styles.emptyText}>Noch keine Nachrichten</Text>
              <Text style={styles.emptySubtext}>Starte die Unterhaltung!</Text>
            </View>
          }
        />

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Nachricht schreiben..."
            placeholderTextColor="#64748B"
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  headerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  infoButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateSeparatorText: {
    fontSize: 12,
    color: '#64748B',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
  },
  senderName: {
    fontSize: 12,
    color: '#3B82F6',
    marginBottom: 4,
    marginLeft: 12,
  },
  messageBubble: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: 12,
  },
  ownMessageBubble: {
    backgroundColor: '#3B82F6',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  ownMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#FFFFFF',
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#334155',
  },
});
