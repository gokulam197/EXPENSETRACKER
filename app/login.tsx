import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, useColorScheme, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next'; // LANGUAGE HOOK

// FIREBASE IMPORTS
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../database/firebaseConfig';

export default function LoginScreen() {
  const router = useRouter();
  const systemTheme = useColorScheme();
  const isDarkMode = systemTheme === 'dark';
  const { t } = useTranslation();

  const themeContainer = isDarkMode ? '#121212' : '#f4f6f8';
  const themeCard = isDarkMode ? '#1e1e1e' : '#ffffff';
  const themeText = isDarkMode ? '#ffffff' : '#333333';
  const themeSubText = isDarkMode ? '#aaaaaa' : '#666666';
  const themeBorder = isDarkMode ? '#333333' : '#dddddd';
  const inputBg = isDarkMode ? '#2c2c2c' : '#fafafa';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('error'), t('err_email_pass'));
      return;
    }
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/(tabs)'); 
    } catch (error: any) {
      Alert.alert('Login Failed', t('err_login'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert(t('error'), t('err_email_pass'));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('error'), t('err_pass_len'));
      return;
    }
    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      Alert.alert(t('success'), t('succ_acc'));
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert(t('error'), t('err_email_in_use'));
      } else {
        Alert.alert(t('error'), t('err_acc_create'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert(t('notice'), t('req_email_reset'));
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Link Sent!', t('succ_reset'));
    } catch (error: any) {
      Alert.alert(t('error'), t('err_reset'));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeContainer }]}>
      <View style={[styles.card, { backgroundColor: themeCard, borderColor: themeBorder }]}>
        
        <View style={styles.logoContainer}>
          <View style={styles.iconCircle}>
          <FontAwesome name="money" size={40} color="#fff" />
          </View>
          <Text style={[styles.title, { color: themeText }]}>{t('login_title')}</Text>
          <Text style={[styles.subtitle, { color: themeSubText }]}>{t('login_sub')}</Text>
        </View>

        <View style={styles.inputContainer}>
          <FontAwesome name="envelope" size={20} color={themeSubText} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: themeText, backgroundColor: inputBg, borderColor: themeBorder }]}
            placeholder={t('email_ph')}
            placeholderTextColor={themeSubText}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputContainer}>
          <FontAwesome name="lock" size={24} color={themeSubText} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: themeText, backgroundColor: inputBg, borderColor: themeBorder }]}
            placeholder={t('pass_ph')}
            placeholderTextColor={themeSubText}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity style={styles.forgotBtn} onPress={handleForgotPassword}>
          <Text style={styles.forgotBtnText}>{t('forgot_pass')}</Text>
        </TouchableOpacity>

        {isLoading ? (
          <ActivityIndicator size="large" color="#4154f1" style={{ marginVertical: 20 }} />
        ) : (
          <>
            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
              <Text style={styles.loginBtnText}>{t('login_btn')}</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={[styles.line, { backgroundColor: themeBorder }]} />
              <Text style={[styles.orText, { color: themeSubText }]}>{t('or')}</Text>
              <View style={[styles.line, { backgroundColor: themeBorder }]} />
            </View>

            <TouchableOpacity style={[styles.signupBtn, { borderColor: '#4154f1' }]} onPress={handleSignUp}>
              <Text style={styles.signupBtnText}>{t('create_acc')}</Text>
            </TouchableOpacity>
          </>
        )}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 400, padding: 30, borderRadius: 20, borderWidth: 1, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#4154f1', justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 3 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  subtitle: { fontSize: 14 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, position: 'relative' },
  inputIcon: { position: 'absolute', left: 15, zIndex: 1 },
  input: { flex: 1, borderWidth: 1, padding: 15, paddingLeft: 45, borderRadius: 12, fontSize: 16 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotBtnText: { color: '#4154f1', fontWeight: 'bold' },
  loginBtn: { backgroundColor: '#4154f1', padding: 15, borderRadius: 12, alignItems: 'center' },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 25 },
  line: { flex: 1, height: 1 },
  orText: { marginHorizontal: 15, fontSize: 14, fontWeight: 'bold' },
  signupBtn: { borderWidth: 2, padding: 15, borderRadius: 12, alignItems: 'center' },
  signupBtnText: { color: '#4154f1', fontSize: 16, fontWeight: 'bold' }
});