import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { db } from '../../database/db';

export default function BookDetailsScreen() {
  // URL-il ninnu book id edukkunnu
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [bookName, setBookName] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [netBalance, setNetBalance] = useState(0);

  useFocusEffect(
    useCallback(() => {
      fetchBookDetails();
    }, [id])
  );

  const fetchBookDetails = () => {
    try {
      // 1. Book name edukkunnu
      const bookData = db?.getFirstSync('SELECT name FROM books WHERE id = ?', id);
      if (bookData) setBookName(bookData.name);

      // 2. Transactions edukkunnu
      const txData = db?.getAllSync('SELECT * FROM transactions WHERE book_id = ? ORDER BY id DESC', id) || [];
      setTransactions(txData);

      // 3. Net Balance calculate cheyyunnu
      let balance = 0;
      txData.forEach(tx => {
        if (tx.type === 'Income') balance += tx.amount;
        else balance -= tx.amount;
      });
      setNetBalance(balance);
      
    } catch (error) {
      console.error("Fetch Details Error:", error);
    }
  };

  const handleDelete = (txId) => {
    Alert.alert("Delete", "Are you sure you want to delete this transaction?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => {
          try {
            db?.runSync('DELETE FROM transactions WHERE id = ?', txId);
            fetchBookDetails(); // Refresh list after delete
          } catch (error) {
            console.error("Delete Error", error);
          }
        } 
      }
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{bookName}</Text>
      </View>

      {/* Net Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Net Balance</Text>
        <Text style={[styles.balanceAmount, netBalance >= 0 ? styles.positiveText : styles.negativeText]}>
          ₹{Math.abs(netBalance).toFixed(2)} {netBalance >= 0 ? '' : '(Dr)'}
        </Text>
      </View>

      {/* Transactions List */}
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View style={styles.txCard}>
            <View style={styles.txLeft}>
              <View style={[styles.typeIndicator, item.type === 'Income' ? styles.indicatorInc : styles.indicatorExp]} />
              <View>
                <Text style={styles.categoryText}>{item.category}</Text>
                <Text style={styles.dateText}>{item.date}</Text>
                {item.note ? <Text style={styles.noteText}>{item.note}</Text> : null}
              </View>
            </View>
            
            <View style={styles.txRight}>
              <Text style={[styles.amountText, item.type === 'Income' ? styles.positiveText : styles.negativeText]}>
                {item.type === 'Income' ? '+' : '-'} ₹{item.amount}
              </Text>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                <FontAwesome name="trash" size={18} color="#f44336" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No entries yet.</Text>}
      />

      {/* Bottom Action Buttons (Add Income & Add Expense) */}
      <View style={styles.bottomBar}>
        {/* Router-il poyal query string vazhi book id pass cheyyunnu */}
        <TouchableOpacity 
          style={[styles.actionBtn, styles.expenseBtn]} 
          onPress={() => router.push(`/book/addTx?bookId=${id}&type=Expense`)}>
          <Text style={styles.actionText}>- GAVE ₹</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionBtn, styles.incomeBtn]} 
          onPress={() => router.push(`/book/addTx?bookId=${id}&type=Income`)}>
          <Text style={styles.actionText}>+ GOT ₹</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4154f1', padding: 20, paddingTop: 50 },
  backButton: { marginRight: 15, padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  
  balanceCard: { backgroundColor: '#fff', margin: 15, padding: 20, borderRadius: 10, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  balanceLabel: { fontSize: 14, color: '#666', marginBottom: 5 },
  balanceAmount: { fontSize: 28, fontWeight: 'bold' },
  positiveText: { color: '#2e7d32' },
  negativeText: { color: '#d32f2f' },
  
  txCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 1 },
  txLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  typeIndicator: { width: 5, height: '100%', borderRadius: 3, marginRight: 15 },
  indicatorInc: { backgroundColor: '#4caf50' },
  indicatorExp: { backgroundColor: '#f44336' },
  categoryText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  dateText: { fontSize: 12, color: '#888', marginTop: 2 },
  noteText: { fontSize: 13, color: '#555', marginTop: 4, fontStyle: 'italic' },
  
  txRight: { flexDirection: 'row', alignItems: 'center' },
  amountText: { fontSize: 16, fontWeight: 'bold', marginRight: 15 },
  deleteBtn: { padding: 5 },
  
  emptyText: { textAlign: 'center', marginTop: 30, color: '#888' },
  
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 15, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee', gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 15, borderRadius: 8, alignItems: 'center' },
  expenseBtn: { backgroundColor: '#f44336' },
  incomeBtn: { backgroundColor: '#4caf50' },
  actionText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});