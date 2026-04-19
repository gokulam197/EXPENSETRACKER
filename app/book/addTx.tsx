import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker'; // Puthiyathayi import cheythu
import { db } from '../../database/db';

export default function AddTransactionScreen() {
  const router = useRouter();
  const { bookId, type } = useLocalSearchParams();
  const isIncome = type === 'Income';

  // Default Categories set cheyyunnu
  const expenseCategories = ['Food & Dining', 'Rent', 'Travel', 'Fuel', 'Shopping', 'Medical', 'Utilities', 'Other Expense'];
  const incomeCategories = ['Salary', 'Sales', 'Business', 'Bonus', 'Other Income'];
  const availableCategories = isIncome ? incomeCategories : expenseCategories;

  const [amount, setAmount] = useState('');
  // Dropdown-le aadyathe item default aayi set cheyyunnu
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

  const handleSave = () => {
    if (!amount) {
      Alert.alert('Error', 'Amount is required!');
      return;
    }

    try {
      const dateOpts: any = { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
      const formattedDate = date.toLocaleDateString('en-US', dateOpts);
      
      db?.runSync(
        'INSERT INTO transactions (book_id, type, amount, category, date, note) VALUES (?, ?, ?, ?, ?, ?)',
        parseInt(bookId as string), type, parseFloat(amount), category, formattedDate, note
      );
      
      router.back();
    } catch (error) {
      console.error("Insert Error:", error);
      Alert.alert('Error', 'Failed to save transaction!');
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, isIncome ? styles.incomeHeader : styles.expenseHeader]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <FontAwesome name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add {type} Entry</Text>
      </View>

      <View style={styles.formContainer}>
        
        <View style={styles.dateTimeRow}>
          <TouchableOpacity style={styles.dateBox} onPress={() => showMode('date')}>
            <FontAwesome name="calendar" size={16} color="#666" style={{ marginRight: 8 }} />
            <Text style={styles.dateText}>{date.toLocaleDateString('en-GB')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.dateBox} onPress={() => showMode('time')}>
            <FontAwesome name="clock-o" size={16} color="#666" style={{ marginRight: 8 }} />
            <Text style={styles.dateText}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
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
          <Text style={styles.label}>Amount (₹) *</Text>
          <TextInput
            style={[styles.input, styles.amountInput, isIncome ? styles.incomeText : styles.expenseText]}
            placeholder="0.00"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            autoFocus={true}
          />
        </View>

        {/* Category Dropdown (Picker) */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={category}
              onValueChange={(itemValue) => setCategory(itemValue)}
              style={styles.picker}
            >
              {availableCategories.map((cat, index) => (
                <Picker.Item key={index} label={cat} value={cat} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Remark</Text>
          <TextInput
            style={[styles.input, styles.noteInput]}
            placeholder="Enter details here..."
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
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 50 },
  incomeHeader: { backgroundColor: '#4caf50' },
  expenseHeader: { backgroundColor: '#f44336' },
  backBtn: { padding: 5, marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  
  formContainer: { padding: 20 },
  
  dateTimeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 10 },
  dateBox: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, backgroundColor: '#fafafa' },
  dateText: { fontSize: 16, color: '#333' },

  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, color: '#666', marginBottom: 8, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 8, fontSize: 16, backgroundColor: '#fff' },
  
  // Picker Styles
  pickerContainer: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fff', overflow: 'hidden' },
  picker: { height: 55, width: '100%' },

  amountInput: { fontSize: 24, fontWeight: 'bold', paddingVertical: 15 },
  incomeText: { color: '#2e7d32' },
  expenseText: { color: '#d32f2f' },
  
  noteInput: { textAlignVertical: 'top' },
  
  saveBtn: { padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  incomeBtn: { backgroundColor: '#4caf50' },
  expenseBtn: { backgroundColor: '#4154f1' }, 
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});