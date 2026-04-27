import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker'; 
import { useAppTheme } from '../context/ThemeContext';

// FIREBASE IMPORTS
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../database/firebaseConfig'; 

export default function AddTransactionScreen() {
  const { isDarkMode } = useAppTheme();

  // --- PREMIUM FINTECH COLOR PALETTE ---
  const themeContainer = isDarkMode ? '#0F172A' : '#F3F4F6';
  const themeCard = isDarkMode ? '#1E293B' : '#FFFFFF';
  const themeText = isDarkMode ? '#F9FAFB' : '#111827';
  const themeSubText = isDarkMode ? '#9CA3AF' : '#6B7280';
  const themeBorder = isDarkMode ? '#334155' : '#E5E7EB';
  
  const colorIncome = isDarkMode ? '#34D399' : '#10B981';
  const colorExpense = isDarkMode ? '#F87171' : '#EF4444';

  const router = useRouter();
  const { bookId, type, txId } = useLocalSearchParams();
  const isIncome = type === 'Income';

  // Header and Button colors based on type
  const activeColor = isIncome ? colorIncome : colorExpense;

  const expenseCategories = ['Food & Dining', 'Rent', 'Travel', 'Fuel', 'Shopping', 'Medical', 'Utilities', 'Other Expense'];
  const incomeCategories = ['Salary', 'Sales', 'Business', 'Bonus', 'Other Income'];
  const availableCategories = isIncome ? incomeCategories : expenseCategories;

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(availableCategories[0]); 
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  
  const [mode, setMode] = useState<'date' | 'time'>('date');
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (txId) {
      const fetchTransaction = async () => {
        try {
          const docRef = doc(db, 'transactions', txId as string);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setAmount(data.amount.toString());
            setCategory(data.category);
            setNote(data.note || '');
            
            const parsedDate = new Date(data.date);
            if (!isNaN(parsedDate.getTime())) {
              setDate(parsedDate);
            }
          }
        } catch (error) {
          console.error("Fetch Tx Error:", error);
        }
      };
      fetchTransaction();
    }
  }, [txId]);

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowPicker(Platform.OS === 'ios'); 
    if (selectedDate) setDate(selectedDate);
  };

  const showMode = (currentMode: 'date' | 'time') => {
    setShowPicker(true);
    setMode(currentMode);
  };

  const handleSave = async () => {
    if (!amount) {
      Alert.alert('Error', 'Amount is required!');
      return;
    }

    const userUid = auth.currentUser?.uid;
    if (!userUid) {
      Alert.alert('Error', 'Login cheythittilla!');
      return;
    }

    try {
      const dateOpts: any = { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
      const formattedDate = date.toLocaleDateString('en-US', dateOpts);
      
      const txData = {
        amount: parseFloat(amount),
        category: category,
        date: formattedDate,
        note: note,
        userId: userUid,
      };

      if (txId) {
        await updateDoc(doc(db, 'transactions', txId as string), txData);
      } else {
        await addDoc(collection(db, 'transactions'), {
          ...txData,
          book_id: bookId as string, 
          type: type,
          timestamp: new Date().getTime() 
        });
      }
      
      router.back();
    } catch (error) {
      console.error("Firebase Insert/Update Error:", error);
      Alert.alert('Error', 'Failed to save transaction!');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
      style={[styles.container, { backgroundColor: themeContainer }]}
    >
      <View style={[styles.header, { backgroundColor: activeColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <FontAwesome name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{txId ? 'Edit' : 'Add'} {type} Entry</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.formContainer}
        keyboardShouldPersistTaps="handled" 
      >
        <View style={styles.dateTimeRow}>
          <TouchableOpacity style={[styles.dateBox, { backgroundColor: themeCard, borderColor: themeBorder }]} onPress={() => showMode('date')}>
            <FontAwesome name="calendar" size={16} color={themeSubText} style={{ marginRight: 8 }} />
            <Text style={[styles.dateText, { color: themeText }]}>{date.toLocaleDateString('en-GB')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.dateBox, { backgroundColor: themeCard, borderColor: themeBorder }]} onPress={() => showMode('time')}>
            <FontAwesome name="clock-o" size={16} color={themeSubText} style={{ marginRight: 8 }} />
            <Text style={[styles.dateText, { color: themeText }]}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </TouchableOpacity>
        </View>

        {showPicker && (
          <DateTimePicker
            value={date}
            mode={mode}
            is24Hour={false}
            display="default"
            onChange={onChangeDate}
          />
        )}

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: themeSubText }]}>Amount (₹) *</Text>
          <TextInput
            style={[styles.input, styles.amountInput, { backgroundColor: themeCard, borderColor: themeBorder, color: activeColor }]}
            placeholder="0.00"
            placeholderTextColor={themeSubText}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            autoFocus={!txId}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: themeSubText }]}>Category</Text>
          <View style={[styles.pickerContainer, { backgroundColor: themeCard, borderColor: themeBorder }]}>
            <Picker
              key={isDarkMode ? 'dark' : 'light'} 
              selectedValue={category}
              onValueChange={(itemValue) => setCategory(itemValue)}
              style={[styles.picker, { color: themeText, backgroundColor: themeCard }]}
              dropdownIconColor={themeText}
              themeVariant={isDarkMode ? 'dark' : 'light'} 
              mode="dropdown" 
            >
              {availableCategories.map((cat, index) => (
                <Picker.Item 
                  key={index} 
                  label={cat} 
                  value={cat} 
                  color={isDarkMode ? '#ffffff' : '#000000'} 
                  style={{ backgroundColor: themeCard }} 
                />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: themeSubText }]}>Remark</Text>
          <TextInput
            style={[styles.input, styles.noteInput, { backgroundColor: themeCard, borderColor: themeBorder, color: themeText }]}
            placeholder="Enter details here..."
            placeholderTextColor={themeSubText}
            value={note}
            onChangeText={setNote}
          />
        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, { backgroundColor: activeColor }]} 
          onPress={handleSave}
        >
          <Text style={styles.saveBtnText}>{txId ? 'UPDATE TRANSACTION' : 'SAVE TRANSACTION'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'ios' ? 50 : 40, paddingBottom: 25 },
  backBtn: { padding: 5, marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', letterSpacing: 0.5 },
  
  formContainer: { padding: 20, paddingBottom: 40 },
  dateTimeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25, gap: 12 },
  dateBox: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, padding: 15, borderRadius: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  dateText: { fontSize: 15, fontWeight: '600' },
  
  inputGroup: { marginBottom: 25 },
  label: { fontSize: 13, marginBottom: 8, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, padding: 16, borderRadius: 12, fontSize: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  pickerContainer: { borderWidth: 1, borderRadius: 12, overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  picker: { height: 55, width: '100%' },
  
  amountInput: { fontSize: 32, fontWeight: '800', paddingVertical: 20, textAlign: 'left' },
  noteInput: { textAlignVertical: 'top', minHeight: 100 },
  
  saveBtn: { padding: 18, borderRadius: 14, alignItems: 'center', marginTop: 15, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 1 }
});