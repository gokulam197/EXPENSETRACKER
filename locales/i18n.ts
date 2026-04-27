import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- TRANSLATIONS ---
const resources = {
  en: {
    translation: {
      dashboard: "Dashboard",
      your_books: "Your Books",
      net_balance: "Net Balance",
      this_month_exp: "This Month's Expense",
      highest_exp: "Highest Expense",
      six_month_trend: "6-Month Expense Trend",
      no_books: "No books found. Click '+' to create one.",
      create_book: "Create New Book",
      book_name: "Book Name",
      cancel: "Cancel",
      save: "Save",
      update: "Update",
      gave: "- GAVE ₹",
      got: "+ GOT ₹",
      settings: "Settings & Info",
      appearance: "Appearance",
      language: "Language",
      share_app: "Invite Friends",
      send_feedback: "Send Feedback",
      logout: "Logout",
    }
  },
  ml: {
    translation: {
      dashboard: "ഡാഷ്ബോർഡ്",
      your_books: "നിങ്ങളുടെ ബുക്കുകൾ",
      net_balance: "മൊത്തം ബാലൻസ്",
      this_month_exp: "ഈ മാസത്തെ ചിലവ്",
      highest_exp: "ഏറ്റവും വലിയ ചിലവ്",
      six_month_trend: "6 മാസത്തെ ചിലവുകൾ",
      no_books: "ബുക്കുകൾ ഒന്നുമില്ല. പുതിയത് ഉണ്ടാക്കാൻ '+' അമർത്തുക.",
      create_book: "പുതിയ ബുക്ക് ഉണ്ടാക്കുക",
      book_name: "ബുക്കിന്റെ പേര്",
      cancel: "ക്യാൻസൽ",
      save: "സേവ് ചെയ്യുക",
      update: "അപ്ഡേറ്റ് ചെയ്യുക",
      gave: "- കൊടുത്തു ₹",
      got: "+ കിട്ടി ₹",
      settings: "സെറ്റിങ്സ്",
      appearance: "തീം മാറ്റുക",
      language: "ഭാഷ (Language)",
      share_app: "കൂട്ടുകാർക്ക് അയക്കുക",
      send_feedback: "അഭിപ്രായങ്ങൾ അറിയിക്കുക",
      logout: "ലോഗ് ഔട്ട്",
    }
  },
  mg: {
    translation: {
      dashboard: "Dashboard",
      your_books: "Ningalude Bookukal",
      net_balance: "Net Balance",
      this_month_exp: "Ee Masathe Chilavu",
      highest_exp: "Ettavum Valiya Chilavu",
      six_month_trend: "6 Masathe Chilavukal",
      no_books: "Bookukal onnumilla. Puthiyathu undakkan '+' amarthuka.",
      create_book: "Puthiya Book Undakkuka",
      book_name: "Bookinte Peru",
      cancel: "Cancel",
      save: "Save Cheyyuka",
      update: "Update Cheyyuka",
      gave: "- Koduthu ₹",
      got: "+ Kitti ₹",
      settings: "Settings",
      appearance: "Theme Maattuka",
      language: "Language",
      share_app: "Koottukarkku Ayakkuka",
      send_feedback: "Abhiprayangal Ariyikkuka",
      logout: "Logout",
    }
  }
};

const initI18n = async () => {
  let savedLanguage = 'en';
  try {
    const lng = await AsyncStorage.getItem('appLanguage');
    if (lng) savedLanguage = lng;
  } catch (error) {
    console.error('Error loading language', error);
  }

  i18n
    .use(initReactI18next)
    .init({
      compatibilityJSON: 'v3',
      resources,
      lng: savedLanguage,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
    });
};

initI18n();

export default i18n;