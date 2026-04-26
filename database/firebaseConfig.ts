import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// Puthiya Auth imports
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// NINGALUDE ORIGINAL FIREBASE CONFIG KEYS IVIDE KODUKKUKA
const firebaseConfig = {
  apiKey: "AIzaSyCpBLhm50iPw40eujNr3WRxP0_C9BqzMmo",
  authDomain: "expensetracker-2de56.firebaseapp.com",
  projectId: "expensetracker-2de56",
  storageBucket: "expensetracker-2de56.firebasestorage.app",
  messagingSenderId: "457329567872",
  appId: "1:457329567872:web:0ef490ddc628876766de65",
  measurementId: "G-32WYXH168W"
};

const app = initializeApp(firebaseConfig);

// Database export cheyyunnu
export const db = getFirestore(app);

// Authentication export cheyyunnu (User login cheythittundo ennu save cheythu vekkan)
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});