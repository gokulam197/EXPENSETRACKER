import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { FontAwesome } from '@expo/vector-icons';

WebBrowser.maybeCompleteAuthSession(); 

export default function SettingsScreen() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    // Nerthe undakkiya pazhaya Web Client ID ivide iduka
    webClientId: '316217110559-crv25le02n132f4j2d1sk3gfm3443vdc.apps.googleusercontent.com', 
    
    // IPPOL Kittiye PUTHIA Android Client ID ivide iduka
    androidClientId: '316217110559-llhlu09fihfb7hdubi29n4tcevm3lbtp.apps.googleusercontent.com', 
    
    scopes: ['https://www.googleapis.com/auth/drive.file', 'profile', 'email'],
  });

  // Login kazhiyumbol token edukkan
  useEffect(() => {
    if (response?.type === 'success' && response.authentication) {
      const token = response.authentication.accessToken;
      setAccessToken(token);
      getUserInfo(token);
    } else if (response?.type === 'error') {
      Alert.alert('Login Failed', 'Google login pattiyilla');
    }
  }, [response]);

  // User-nte peru, photo edukkan
  const getUserInfo = async (token: string) => {
    try {
      const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = await res.json();
      setUserInfo(user);
    } catch (error) {
      console.error("User Info Error:", error);
    }
  };

  const handleLogout = () => {
    setAccessToken(null);
    setUserInfo(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings & Backup</Text>
      </View>

      <View style={styles.content}>
        {!userInfo ? (
          <View style={styles.loginCard}>
            <Text style={styles.descText}>Securely backup your expenses to your Google Drive.</Text>
            <TouchableOpacity 
              style={styles.googleBtn} 
              disabled={!request} 
              onPress={() => promptAsync()}
            >
              <FontAwesome name="google" size={20} color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.googleBtnText}>Sign in with Google</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.profileCard}>
            <Image source={{ uri: userInfo.picture }} style={styles.profileImage} />
            <Text style={styles.userName}>{userInfo.name}</Text>
            <Text style={styles.userEmail}>{userInfo.email}</Text>
            
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>

            <View style={styles.backupSection}>
              <Text style={styles.sectionTitle}>Data Backup</Text>
              
              <TouchableOpacity style={[styles.actionBtn, styles.backupBtn]}>
                <FontAwesome name="cloud-upload" size={20} color="#fff" style={{ marginRight: 10 }} />
                <Text style={styles.actionText}>Backup to Drive</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionBtn, styles.restoreBtn]}>
                <FontAwesome name="cloud-download" size={20} color="#fff" style={{ marginRight: 10 }} />
                <Text style={styles.actionText}>Restore from Drive</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { padding: 20, paddingTop: 50, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  content: { padding: 20 },
  
  loginCard: { backgroundColor: '#fff', padding: 30, borderRadius: 15, alignItems: 'center', elevation: 3 },
  descText: { textAlign: 'center', color: '#666', marginBottom: 20, fontSize: 16 },
  googleBtn: { flexDirection: 'row', backgroundColor: '#db4437', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center' },
  googleBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  profileCard: { backgroundColor: '#fff', padding: 20, borderRadius: 15, alignItems: 'center', elevation: 3 },
  profileImage: { width: 80, height: 80, borderRadius: 40, marginBottom: 10 },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  userEmail: { fontSize: 14, color: '#666', marginBottom: 15 },
  logoutBtn: { padding: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 5, paddingHorizontal: 15 },
  logoutText: { color: '#666' },

  backupSection: { marginTop: 30, width: '100%', borderTopWidth: 1, borderColor: '#eee', paddingTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  actionBtn: { flexDirection: 'row', padding: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  backupBtn: { backgroundColor: '#4caf50' },
  restoreBtn: { backgroundColor: '#2196f3' },
  actionText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});