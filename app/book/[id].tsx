import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { db } from '../../database/db';

export default function BookDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [bookName, setBookName] = useState('Book Details');
  const [allTransactions, setAllTransactions] = useState([]); 
  const [filteredTransactions, setFilteredTransactions] = useState([]); 
  const [netBalance, setNetBalance] = useState(0);
  
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState(['All']);

  useFocusEffect(
    useCallback(() => {
      fetchBookDetails();
    }, [id])
  );

  const fetchBookDetails = () => {
    try {
      // 1. Book name fetch cheyyunnu
      const bookData = db?.getFirstSync('SELECT name FROM books WHERE id = ?', id) as any;
      if (bookData) setBookName(bookData.name);

      // 2. Aa book-le transactions fetch cheyyunnu
      const txData = db?.getAllSync('SELECT * FROM transactions WHERE book_id = ? ORDER BY id DESC', id) || [];
      setAllTransactions(txData);
      setFilteredTransactions(txData); 

      // 3. Unique categories filter options-nu vendi edukkunnu
      const uniqueCats = ['All', ...new Set(txData.map((item: any) => item.category))];
      setCategories(uniqueCats);

      // 4. Net Balance calculate cheyyunnu
      let balance = 0;
      txData.forEach((tx: any) => {
        if (tx.type === 'Income') balance += tx.amount;
        else balance -= tx.amount;
      });
      setNetBalance(balance);
      
    } catch (error) {
      console.error("Fetch Details Error:", error);
    }
  };

  const handleFilter = (cat: string) => {
    setSelectedCategory(cat);
    if (cat === 'All') {
      setFilteredTransactions(allTransactions);
    } else {
      const filtered = allTransactions.filter((item: any) => item.category === cat);
      setFilteredTransactions(filtered);
    }
  };

  const handleDelete = (txId: number) => {
    Alert.alert("Delete", "Are you sure you want to delete this transaction?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => {
          try {
            db?.runSync('DELETE FROM transactions WHERE id = ?', txId);
            fetchBookDetails(); 
          } catch (error) {
            console.error("Delete Error", error);
          }
        } 
      }
    ]);
  };

  // EXPORT TO EXCEL/CSV FUNCTION (FIXED)
  const exportToCSV = async () => {
    if (allTransactions.length === 0) {
      Alert.alert('No Data', 'Export cheyyan transactions onnumilla!');
      return;
    }

    try {
      let csvContent = "Date,Type,Category,Amount(Rs),Remark\n";
      
      allTransactions.forEach((tx: any) => {
        const cleanNote = tx.note ? tx.note.replace(/,/g, ' ') : '';
        const cleanCategory = tx.category ? tx.category.replace(/,/g, ' ') : '';
        csvContent += `${tx.date},${tx.type},${cleanCategory},${tx.amount},${cleanNote}\n`;
      });

      const fileName = `${bookName.replace(/\s+/g, '_')}_Transactions.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;

      // Encoding paramter fix cheythu
      await FileSystem.writeAsStringAsync(fileUri, csvContent);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Download or Share your Book',
        });
      } else {
        Alert.alert('Error', 'Sharing feature is not available on this device');
      }
    } catch (error) {
      console.error("Export Error:", error);
      Alert.alert('Error', 'Export failed!');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{bookName}</Text>
        </View>
        
        <TouchableOpacity onPress={exportToCSV} style={styles.downloadBtn}>
          <FontAwesome name="download" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Balance Summary */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Net Balance</Text>
        <Text style={[styles.balanceAmount, netBalance >= 0 ? styles.positiveText : styles.negativeText]}>
          ₹{Math.abs(netBalance).toFixed(2)} {netBalance >= 0 ? '' : '(Dr)'}
        </Text>
      </View>

      {/* Horizontal Category Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {categories.map((cat: any, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.filterChip, selectedCategory === cat && styles.activeChip]}
              onPress={() => handleFilter(cat)}
            >
              <Text style={[styles.filterText, selectedCategory === cat && styles.activeFilterText]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Transactions List */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item: any) => item.id.toString()}
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
        ListEmptyComponent={<Text style={styles.emptyText}>No transactions found for this category.</Text>}
      />

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#4154f1', padding: 20, paddingTop: 50 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 15, padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  downloadBtn: { padding: 8 },
  
  balanceCard: { backgroundColor: '#fff', margin: 15, padding: 20, borderRadius: 10, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  balanceLabel: { fontSize: 14, color: '#666', marginBottom: 5 },
  balanceAmount: { fontSize: 28, fontWeight: 'bold' },
  positiveText: { color: '#2e7d32' },
  negativeText: { color: '#d32f2f' },

  filterContainer: { backgroundColor: '#fff', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' },
  filterScroll: { paddingHorizontal: 15, gap: 10 },
  filterChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#ddd' },
  activeChip: { backgroundColor: '#4154f1', borderColor: '#4154f1' },
  filterText: { color: '#666', fontWeight: 'bold' },
  activeFilterText: { color: '#fff' },
  
  txCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 1 },
  txLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  typeIndicator: { width: 5, height: '100%', borderRadius: 3, marginRight: 15 },
  indicatorInc: { backgroundColor: '#4caf50' },
  indicatorExp: { backgroundColor: '#f44336' },
  categoryText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  dateText: { fontSize: 11, color: '#888', marginTop: 2 },
  noteText: { fontSize: 12, color: '#555', marginTop: 4, fontStyle: 'italic' },
  txRight: { flexDirection: 'row', alignItems: 'center' },
  amountText: { fontSize: 16, fontWeight: 'bold', marginRight: 15 },
  deleteBtn: { padding: 5 },
  
  emptyText: { textAlign: 'center', marginTop: 40, color: '#888' },
  
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 15, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee', gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 15, borderRadius: 8, alignItems: 'center' },
  expenseBtn: { backgroundColor: '#f44336' },
  incomeBtn: { backgroundColor: '#4caf50' },
  actionText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});