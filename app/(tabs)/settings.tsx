import { useState, useEffect } from 'react';
import { View, Share, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, Linking, Switch, Platform, Modal } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications'; 
import { useTranslation } from 'react-i18next'; // LANGUAGE HOOK
import AsyncStorage from '@react-native-async-storage/async-storage';

// FIREBASE IMPORTS
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../../database/firebaseConfig';

import { useAppTheme } from '../context/ThemeContext';

export default function SettingsScreen() {
  const router = useRouter();
  
  // LANGUAGE SETUP
  const { t, i18n } = useTranslation();
  const [langModalVisible, setLangModalVisible] = useState(false);

  const { isDarkMode, toggleTheme } = useAppTheme();

  // DYNAMIC COLORS
  const themeContainer = isDarkMode ? '#0F172A' : '#F8FAFC';
  const themeCard = isDarkMode ? '#1E293B' : '#FFFFFF';
  const themeText = isDarkMode ? '#F9FAFB' : '#0F172A';
  const themeSubText = isDarkMode ? '#9CA3AF' : '#64748B';
  const themeBorder = isDarkMode ? '#334155' : '#E2E8F0';
  const inputBg = isDarkMode ? '#334155' : '#F1F5F9';

  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);

  const CURRENT_APP_VERSION = "1.0.0";

  useEffect(() => {
    const checkNotificationStatus = async () => {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      setReminderEnabled(scheduled.length > 0);
    };
    checkNotificationStatus();
  }, []);

  const changeLanguage = async (lng: string) => {
    i18n.changeLanguage(lng);
    await AsyncStorage.setItem('appLanguage', lng);
    setLangModalVisible(false);
  };

  const toggleReminder = async (value: boolean) => {
    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Notification enable cheyyan permission aavashyamanu.');
        return;
      }
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('daily-reminder', {
            name: 'Daily Reminder',
            importance: Notifications.AndroidImportance.HIGH,
            sound: 'default',
          });
        }
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Daily Expense Tracker 💸",
            body: "Innathe chilavukal add cheytho? Marakkathe add cheyyu!",
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY, 
            hour: 21,
            minute: 0,
            repeats: true,
            channelId: Platform.OS === 'android' ? 'daily-reminder' : undefined, 
          },
        });
        setReminderEnabled(true);
        Alert.alert('Reminder Set', 'Daily reminder scheduled for 9:00 PM! 🌙');
      } catch (error) {
        console.error("Schedule Error: ", error);
        Alert.alert('Error', 'Notification schedule cheyyan pattiyilla.');
      }
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
      setReminderEnabled(false);
      Alert.alert('Reminder Off', 'Daily reminders turned off.');
    }
  };

  const submitFeedback = async () => {
    if (!feedback.trim()) {
      Alert.alert('Error', 'Feedback enthenkilum type cheyyuka!');
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'feedbacks'), {
        message: feedback,
        timestamp: new Date().getTime(),
        date: new Date().toLocaleDateString('en-US'),
        app_version: CURRENT_APP_VERSION,
        user: auth.currentUser?.email 
      });
      Alert.alert('Thank You!', 'Ningalude feedback success aayi send cheythu. 😊');
      setFeedback(''); 
    } catch (error) {
      console.error("Feedback Error:", error);
      Alert.alert('Error', 'Feedback send cheyyan pattiyilla.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onShare = async () => {
    try {
      await Share.share({
        message: 'Hey! Check out this Expense Tracker app. It helps me manage my daily expenses easily! 💸 \n\n[Download Link Here]',
      });
    } catch (error: any) {
      Alert.alert(error.message);
    }
  };

  const checkForUpdates = async () => {
    setIsCheckingUpdate(true);
    try {
      const docRef = doc(db, "app_settings", "update_info");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.latest_version !== CURRENT_APP_VERSION) {
          Alert.alert(
            "Update Available! 🚀",
            `Puthiya version (${data.latest_version}) vannittundu. Ippol thanne update cheyyano?`,
            [
              { text: "Later", style: "cancel" },
              { text: "Update Now", onPress: () => Linking.openURL(data.update_url) }
            ]
          );
        } else {
          Alert.alert("Up to Date! ✅", "Ningal ippol use cheyyunnathu latest version thanneyaanu.");
        }
      } else {
        Alert.alert("Notice", "Update info edukkan pattiyilla. (Firebase collection undakkiyittundo ennu check cheyyuka)");
      }
    } catch (error) {
      console.error("Update Check Error:", error);
      Alert.alert("Error", "Internet connection check cheyyuka.");
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "App-il ninnu purathu pokano?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: async () => {
          try {
            await signOut(auth);
            router.replace('/login');
          } catch (error) {
            console.error("Logout Error:", error);
          }
        } 
      }
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeContainer }]}>
      <View style={[styles.header, { backgroundColor: themeCard, borderBottomColor: themeBorder }]}>
        <Text style={[styles.headerTitle, { color: themeText }]}>{t('settings')}</Text>
      </View>

      <View style={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: themeCard, borderColor: themeBorder, borderWidth: 1 }]}>
          <FontAwesome name="rocket" size={40} color="#4154f1" style={{ marginBottom: 15 }} />
          <Text style={[styles.infoTitle, { color: themeText }]}>Expense Tracker</Text>
          <Text style={[styles.infoDesc, { color: themeSubText }]}>Cloud Sync ulla secure app. Data real-time aayi safe aayi save aavunnundu.</Text>
          <Text style={[styles.userEmail, { color: themeSubText }]}>Logged in as: {auth.currentUser?.email}</Text>
          <Text style={[styles.versionText, { color: themeSubText }]}>Version: {CURRENT_APP_VERSION}</Text>
        </View>

        {/* NOTIFICATION TOGGLE */}
        <View style={[styles.switchCard, { backgroundColor: themeCard, borderColor: themeBorder }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <FontAwesome name="bell" size={24} color="#4caf50" style={{ marginRight: 15 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoTitle, { color: themeText, fontSize: 16 }]}>Daily Reminder</Text>
              <Text style={[styles.infoDesc, { color: themeSubText, textAlign: 'left', fontSize: 12 }]}>Get notified at 9 PM to log expenses</Text>
            </View>
          </View>
          <Switch
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={reminderEnabled ? "#4154f1" : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={toggleReminder}
            value={reminderEnabled}
          />
        </View>

        {/* CHANGE LANGUAGE BUTTON */}
        <TouchableOpacity style={[styles.updateBtn, { backgroundColor: themeCard, borderColor: themeBorder }]} onPress={() => setLangModalVisible(true)}>
          <FontAwesome name="language" size={22} color="#9c27b0" style={{ marginRight: 10 }} />
          <Text style={[styles.updateBtnText, { color: themeText }]}>{t('language')}</Text>
        </TouchableOpacity>

        {/* LANGUAGE MODAL */}
        <Modal visible={langModalVisible} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: themeCard, borderColor: themeBorder, borderWidth: 1 }]}>
              <Text style={[styles.infoTitle, { color: themeText, marginBottom: 20 }]}>Select Language</Text>
              
              <TouchableOpacity style={styles.langOption} onPress={() => changeLanguage('en')}>
                <Text style={{ color: themeText, fontSize: 16, fontWeight: i18n.language === 'en' ? 'bold' : 'normal' }}>English (EN)</Text>
                {i18n.language === 'en' && <FontAwesome name="check" color="#4154f1" size={18} />}
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.langOption} onPress={() => changeLanguage('ml')}>
                <Text style={{ color: themeText, fontSize: 16, fontWeight: i18n.language === 'ml' ? 'bold' : 'normal' }}>മലയാളം (ML)</Text>
                {i18n.language === 'ml' && <FontAwesome name="check" color="#4154f1" size={18} />}
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.langOption} onPress={() => changeLanguage('mg')}>
                <Text style={{ color: themeText, fontSize: 16, fontWeight: i18n.language === 'mg' ? 'bold' : 'normal' }}>Manglish (MG)</Text>
                {i18n.language === 'mg' && <FontAwesome name="check" color="#4154f1" size={18} />}
              </TouchableOpacity>

              <TouchableOpacity style={{ marginTop: 20, alignItems: 'center' }} onPress={() => setLangModalVisible(false)}>
                <Text style={{ color: '#f44336', fontWeight: 'bold' }}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <TouchableOpacity style={[styles.updateBtn, { backgroundColor: themeCard, borderColor: themeBorder }]} onPress={checkForUpdates} disabled={isCheckingUpdate}>
          <FontAwesome name="refresh" size={20} color="#ff9800" style={{ marginRight: 10 }} />
          <Text style={[styles.updateBtnText, { color: themeText }]}>
            {isCheckingUpdate ? "Checking..." : "Check for Updates"}
          </Text>
        </TouchableOpacity>

        <View style={[styles.infoCard, { backgroundColor: themeCard, borderColor: themeBorder, borderWidth: 1 }]}>
          <FontAwesome name={isDarkMode ? "moon-o" : "sun-o"} size={35} color={isDarkMode ? "#fdd835" : "#ff9800"} style={{ marginBottom: 10 }} />
          <Text style={[styles.infoTitle, { color: themeText }]}>{t('appearance')}</Text>
          <Text style={[styles.infoDesc, { color: themeSubText, marginBottom: 15 }]}>
            Change your app theme manually.
          </Text>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeToggleBtn}>
            <Text style={styles.themeToggleText}>
              Switch to {isDarkMode ? 'Light' : 'Dark'} Mode
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.infoCard, { backgroundColor: themeCard, borderColor: themeBorder, borderWidth: 1 }]} onPress={onShare}>
          <FontAwesome name="share-alt" size={30} color="#4caf50" style={{ marginBottom: 10 }} />
          <Text style={[styles.infoTitle, { color: themeText }]}>{t('share_app')}</Text>
          <Text style={[styles.infoDesc, { color: themeSubText }]}>
            Ee app ningalkku upakarapradhamayittu thonniyengil koottukaarkkum share cheyyuka!
          </Text>
        </TouchableOpacity>

        <View style={[styles.feedbackSection, { backgroundColor: themeCard, borderColor: themeBorder, borderWidth: 1 }]}>
          <Text style={[styles.sectionTitle, { color: themeText }]}>{t('send_feedback')}</Text>
          <TextInput
            style={[styles.feedbackInput, { color: themeText, borderColor: themeBorder, backgroundColor: inputBg }]}
            placeholder="Type your suggestions, bugs..."
            placeholderTextColor={themeSubText}
            multiline={true}
            numberOfLines={5}
            textAlignVertical="top"
            value={feedback}
            onChangeText={setFeedback}
          />
          <TouchableOpacity style={[styles.submitBtn, isSubmitting && styles.disabledBtn]} onPress={submitFeedback} disabled={isSubmitting}>
            <FontAwesome name="paper-plane" size={18} color="#fff" style={{ marginRight: 10 }} />
            <Text style={styles.submitBtnText}>{isSubmitting ? "Sending..." : "Submit Feedback"}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <FontAwesome name="sign-out" size={20} color="#fff" style={{ marginRight: 10 }} />
          <Text style={styles.logoutBtnText}>{t('logout')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: Platform.OS === 'ios' ? 50 : 40, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  content: { padding: 20, paddingBottom: 40 },
  infoCard: { padding: 25, borderRadius: 15, alignItems: 'center', elevation: 2, marginBottom: 20 },
  infoTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  infoDesc: { textAlign: 'center', fontSize: 14, lineHeight: 22 },
  userEmail: { marginTop: 15, fontSize: 13, fontWeight: 'bold', fontStyle: 'italic' },
  versionText: { marginTop: 5, fontSize: 12, fontStyle: 'italic' },
  
  switchCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderRadius: 15, elevation: 2, marginBottom: 20, borderWidth: 1 },
  
  themeToggleBtn: { backgroundColor: '#4154f1', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 10 },
  themeToggleText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  
  updateBtn: { flexDirection: 'row', padding: 18, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, elevation: 2, marginBottom: 20 },
  updateBtnText: { fontWeight: 'bold', fontSize: 16 },

  langOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: '#ddd' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', borderRadius: 15, padding: 25, elevation: 5 },

  feedbackSection: { width: '100%', padding: 20, borderRadius: 15, elevation: 2, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  feedbackInput: { borderWidth: 1, padding: 15, borderRadius: 10, fontSize: 16, height: 120, marginBottom: 15 },
  submitBtn: { flexDirection: 'row', backgroundColor: '#4154f1', padding: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  disabledBtn: { backgroundColor: '#a0aaff' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  logoutBtn: { flexDirection: 'row', backgroundColor: '#f44336', padding: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  logoutBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});