import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { db } from '../../database/db';

export default function AddTransactionScreen() {
  const router = useRouter();
  
  // URL-il ninnu pass cheytha parameters edukkunnu
  // bookId: Ethu book-lekanu save cheyyendathu
  // type: 'Income' aano 'Expense' aano
  const { bookId, type } = useLocalSearchParams();

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');

  const isIncome = type === 'Income';

  const handleSave = () => {
    if (!amount || !category) {
      Alert.alert('Error', 'Amount and Category are required!');
      return;
    }

    try {
      // Date format (e.g., Apr 20, 2026 12:30 PM)
      const dateOpts = { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
      const formattedDate = new Date().toLocaleDateString('en-US', dateOpts);
      
      // Database-il data insert cheyyunnu (book_id parameter koodi pass cheyyunnu)
      db?.runSync(
        'INSERT INTO transactions (book_id, type, amount, category, date, note) VALUES (?, ?, ?, ?, ?, ?)',
        parseInt(bookId as string), type, parseFloat(amount), category, formattedDate, note
      );
      
      // Save aayal thirichu book details page-lekku pokan
      router.back();
    } catch (error) {
      console.error("Insert Error:", error);
      Alert.alert('Error', 'Failed to save transaction!');
    }
  };

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={[styles.header, isIncome ? styles.incomeHeader : styles.expenseHeader]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <FontAwesome name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add {type}</Text>
      </View>

      <View style={styles.formContainer}>
        {/* Amount Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount (₹)</Text>
          <TextInput
            style={[styles.input, styles.amountInput, isIncome ? styles.incomeText : styles.expenseText]}
            placeholder="0.00"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            autoFocus={true}
          />
        </View>

        {/* Category Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category</Text>
          <TextInput
            style={styles.input}
            placeholder={isIncome ? "e.g. Salary, Sales" : "e.g. Rent, Food"}
            value={category}
            onChangeText={setCategory}
          />
        </View>

        {/* Note Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Remarks (Optional)</Text>
          <TextInput
            style={[styles.input, styles.noteInput]}
            placeholder="Enter any details here..."
            value={note}
            onChangeText={setNote}
            multiline={true}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity 
          style={[styles.saveBtn, isIncome ? styles.incomeHeader : styles.expenseHeader]} 
          onPress={handleSave}
        >
          <Text style={styles.saveBtnText}>Save</Text>
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
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, color: '#666', marginBottom: 8, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 8, fontSize: 16, backgroundColor: '#fafafa' },
  
  amountInput: { fontSize: 24, fontWeight: 'bold', paddingVertical: 20, textAlign: 'center' },
  incomeText: { color: '#2e7d32' },
  expenseText: { color: '#d32f2f' },
  
  noteInput: { height: 80, textAlignVertical: 'top' },
  
  saveBtn: { padding: 18, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});