import { useState } from 'react';
import { View, Share, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, Linking } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// FIREBASE IMPORTS
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../../database/firebaseConfig';

// നമ്മുടെ പുതിയ തീം ഹുക്ക്
import { useAppTheme } from '../context/ThemeContext';

export default function SettingsScreen() {
  const router = useRouter();
  
  // സിസ്റ്റം തീമിന് പകരം നമ്മുടെ ആപ്പ് തീം ഉപയോഗിക്കുന്നു!
  const { isDarkMode, toggleTheme } = useAppTheme();

  // DYNAMIC COLORS
  const themeContainer = isDarkMode ? '#121212' : '#f4f6f8';
  const themeCard = isDarkMode ? '#1e1e1e' : '#ffffff';
  const themeText = isDarkMode ? '#ffffff' : '#333333';
  const themeSubText = isDarkMode ? '#aaaaaa' : '#666666';
  const themeBorder = isDarkMode ? '#333333' : '#eeeeee';
  const inputBg = isDarkMode ? '#2c2c2c' : '#fafafa';

  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  // CURRENT APP VERSION (ഇത് പുതിയ അപ്ഡേറ്റ് വരുമ്പോൾ 1.0.1 എന്നൊക്കെ ആക്കി മാറ്റണം)
  const CURRENT_APP_VERSION = "1.0.0";

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

  // app share cheyyan
  const onShare = async () => {
    try {
      await Share.share({
        message: 'Hey! Check out this Expense Tracker app. It helps me manage my daily expenses easily! 💸 \n\n[Download Link Here]',
      });
    } catch (error: any) {
      Alert.alert(error.message);
    }
  };

  // --- CHECK FOR UPDATES FUNCTION ---
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
        <Text style={[styles.headerTitle, { color: themeText }]}>Settings & Info</Text>
      </View>

      <View style={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: themeCard }]}>
          <FontAwesome name="rocket" size={40} color="#4154f1" style={{ marginBottom: 15 }} />
          <Text style={[styles.infoTitle, { color: themeText }]}>Expense Tracker (Beta)</Text>
          <Text style={[styles.infoDesc, { color: themeSubText }]}>Cloud Sync ulla secure app. Data real-time aayi safe aayi save aavunnundu.</Text>
          <Text style={[styles.userEmail, { color: themeSubText }]}>Logged in as: {auth.currentUser?.email}</Text>
          <Text style={[styles.versionText, { color: themeSubText }]}>Version: {CURRENT_APP_VERSION}</Text>
        </View>

        {/* CHECK FOR UPDATES BUTTON */}
        <TouchableOpacity 
          style={[styles.updateBtn, { backgroundColor: themeCard, borderColor: themeBorder }]} 
          onPress={checkForUpdates} 
          disabled={isCheckingUpdate}
        >
          <FontAwesome name="refresh" size={20} color="#ff9800" style={{ marginRight: 10 }} />
          <Text style={[styles.updateBtnText, { color: themeText }]}>
            {isCheckingUpdate ? "Checking..." : "Check for Updates"}
          </Text>
        </TouchableOpacity>

        {/* THEME TOGGLE BUTTON */}
        <View style={[styles.infoCard, { backgroundColor: themeCard }]}>
          <FontAwesome name={isDarkMode ? "moon-o" : "sun-o"} size={35} color={isDarkMode ? "#fdd835" : "#ff9800"} style={{ marginBottom: 10 }} />
          <Text style={[styles.infoTitle, { color: themeText }]}>Appearance</Text>
          <Text style={[styles.infoDesc, { color: themeSubText, marginBottom: 15 }]}>
            Change your app theme manually.
          </Text>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeToggleBtn}>
            <Text style={styles.themeToggleText}>
              Switch to {isDarkMode ? 'Light' : 'Dark'} Mode
            </Text>
          </TouchableOpacity>
        </View>

        {/* SHARE APP BUTTON */}
        <TouchableOpacity style={[styles.infoCard, { backgroundColor: themeCard }]} onPress={onShare}>
          <FontAwesome name="share-alt" size={30} color="#4caf50" style={{ marginBottom: 10 }} />
          <Text style={[styles.infoTitle, { color: themeText }]}>Invite Friends</Text>
          <Text style={[styles.infoDesc, { color: themeSubText }]}>
            Ee app ningalkku upakarapradhamayittu thonniyengil koottukaarkkum share cheyyuka!
          </Text>
        </TouchableOpacity>

        <View style={[styles.feedbackSection, { backgroundColor: themeCard }]}>
          <Text style={[styles.sectionTitle, { color: themeText }]}>Send Feedback</Text>
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
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 50, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  content: { padding: 20, paddingBottom: 40 },
  infoCard: { padding: 25, borderRadius: 15, alignItems: 'center', elevation: 2, marginBottom: 20 },
  infoTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  infoDesc: { textAlign: 'center', fontSize: 14, lineHeight: 22 },
  userEmail: { marginTop: 15, fontSize: 13, fontWeight: 'bold', fontStyle: 'italic' },
  versionText: { marginTop: 5, fontSize: 12, fontStyle: 'italic' },
  themeToggleBtn: { backgroundColor: '#4154f1', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 10 },
  themeToggleText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  
  updateBtn: { flexDirection: 'row', padding: 18, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, elevation: 2, marginBottom: 20 },
  updateBtnText: { fontWeight: 'bold', fontSize: 16 },

  feedbackSection: { width: '100%', padding: 20, borderRadius: 15, elevation: 2, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  feedbackInput: { borderWidth: 1, padding: 15, borderRadius: 10, fontSize: 16, height: 120, marginBottom: 15 },
  submitBtn: { flexDirection: 'row', backgroundColor: '#4154f1', padding: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  disabledBtn: { backgroundColor: '#a0aaff' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  logoutBtn: { flexDirection: 'row', backgroundColor: '#f44336', padding: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  logoutBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});