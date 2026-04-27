import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform, useColorScheme } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker'; 

// FIREBASE IMPORTS
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../../database/firebaseConfig'; // auth add cheythu

export default function AddTransactionScreen() {
  const systemTheme = useColorScheme();
  const isDarkMode = systemTheme === 'dark';

  // DYNAMIC COLORS
  const themeContainer = isDarkMode ? '#121212' : '#ffffff';
  const themeText = isDarkMode ? '#ffffff' : '#333333';
  const themeSubText = isDarkMode ? '#aaaaaa' : '#666666';
  const themeBorder = isDarkMode ? '#333333' : '#dddddd';
  const inputBg = isDarkMode ? '#1e1e1e' : '#ffffff';
  const dateBoxBg = isDarkMode ? '#1e1e1e' : '#fafafa';

  const router = useRouter();
  const { bookId, type } = useLocalSearchParams();
  const isIncome = type === 'Income';

  const expenseCategories = ['Food & Dining', 'Rent', 'Travel', 'Fuel', 'Shopping', 'Medical', 'Utilities', 'Other Expense'];
  const incomeCategories = ['Salary', 'Sales', 'Business', 'Bonus', 'Other Income'];
  const availableCategories = isIncome ? incomeCategories : expenseCategories;

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(availableCategories[0]); 
  const [note, setNote] = useState('');
  
  const [date, setDate] = useState(new Date());
  const [mode, setMode] = useState<'date' | 'time'>('date');
  const [showPicker, setShowPicker] = useState(false);

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
      
      await addDoc(collection(db, 'transactions'), {
        book_id: bookId as string, 
        userId: userUid, // Ee transaction aaraanu add cheythathu ennu save cheyyunnu
        type: type,
        amount: parseFloat(amount),
        category: category,
        date: formattedDate,
        note: note,
        timestamp: new Date().getTime() 
      });
      
      router.back();
    } catch (error) {
      console.error("Firebase Insert Error:", error);
      Alert.alert('Error', 'Failed to save transaction!');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeContainer }]}>
      <View style={[styles.header, isIncome ? styles.incomeHeader : styles.expenseHeader]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <FontAwesome name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add {type} Entry</Text>
      </View>

      <View style={styles.formContainer}>
        
        <View style={styles.dateTimeRow}>
          <TouchableOpacity style={[styles.dateBox, { backgroundColor: dateBoxBg, borderColor: themeBorder }]} onPress={() => showMode('date')}>
            <FontAwesome name="calendar" size={16} color={themeSubText} style={{ marginRight: 8 }} />
            <Text style={[styles.dateText, { color: themeText }]}>{date.toLocaleDateString('en-GB')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.dateBox, { backgroundColor: dateBoxBg, borderColor: themeBorder }]} onPress={() => showMode('time')}>
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
            style={[styles.input, styles.amountInput, { backgroundColor: inputBg, borderColor: themeBorder, color: isIncome ? '#4caf50' : '#f44336' }]}
            placeholder="0.00"
            placeholderTextColor={themeSubText}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            autoFocus={true}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: themeSubText }]}>Category</Text>
          <View style={[styles.pickerContainer, { backgroundColor: inputBg, borderColor: themeBorder }]}>
            <Picker
              selectedValue={category}
              onValueChange={(itemValue) => setCategory(itemValue)}
              style={[styles.picker, { color: themeText }]}
              dropdownIconColor={themeText}
            >
              {availableCategories.map((cat, index) => (
                <Picker.Item key={index} label={cat} value={cat} color={isDarkMode ? '#ffffff' : '#000000'} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: themeSubText }]}>Remark</Text>
          <TextInput
            style={[styles.input, styles.noteInput, { backgroundColor: inputBg, borderColor: themeBorder, color: themeText }]}
            placeholder="Enter details here..."
            placeholderTextColor={themeSubText}
            value={note}
            onChangeText={setNote}
          />
        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, isIncome ? styles.incomeBtn : styles.expenseBtn]} 
          onPress={handleSave}
        >
          <Text style={styles.saveBtnText}>SAVE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 50 },
  incomeHeader: { backgroundColor: '#4caf50' },
  expenseHeader: { backgroundColor: '#f44336' },
  backBtn: { padding: 5, marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  formContainer: { padding: 20 },
  dateTimeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 10 },
  dateBox: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, padding: 12, borderRadius: 8 },
  dateText: { fontSize: 16 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, marginBottom: 8, fontWeight: 'bold' },
  input: { borderWidth: 1, padding: 15, borderRadius: 8, fontSize: 16 },
  pickerContainer: { borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  picker: { height: 55, width: '100%' },
  amountInput: { fontSize: 24, fontWeight: 'bold', paddingVertical: 15 },
  noteInput: { textAlignVertical: 'top' },
  saveBtn: { padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  incomeBtn: { backgroundColor: '#4caf50' },
  expenseBtn: { backgroundColor: '#4154f1' }, 
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});