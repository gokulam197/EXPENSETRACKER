import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, Dimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import { db } from '../../database/db';

const screenWidth = Dimensions.get('window').width;

export default function HomeScreen() {
  const [books, setBooks] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newBookName, setNewBookName] = useState('');
  
  const [chartData, setChartData] = useState([]);
  const [topCategory, setTopCategory] = useState({ name: 'None', amount: 0 });
  const [totalMonthlyExpense, setTotalMonthlyExpense] = useState(0);

  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      fetchBooks();
      fetchMonthlyStats();
    }, [])
  );

  const fetchBooks = () => {
    try {
      const query = `
        SELECT books.id, books.name, books.created_at, 
        COALESCE(SUM(CASE WHEN transactions.type = 'Income' THEN transactions.amount ELSE -transactions.amount END), 0) as balance 
        FROM books 
        LEFT JOIN transactions ON books.id = transactions.book_id 
        GROUP BY books.id 
        ORDER BY books.id DESC
      `;
      const allBooks = db?.getAllSync(query) || [];
      setBooks(allBooks);
    } catch (error) {
      console.error("Fetch Books Error:", error);
    }
  };

  const fetchMonthlyStats = () => {
    try {
      // Date format matching update: Comma handling and proper month/year search
      const date = new Date();
      const currentMonth = date.toLocaleDateString('en-US', { month: 'short' }); // eg: "Apr"
      const currentYear = date.getFullYear().toString(); // eg: "2026"
      
      // Monthly transactions fetch logic updated
      const txData = db?.getAllSync(`
        SELECT * FROM transactions 
        WHERE type = 'Expense' 
        AND date LIKE ? AND date LIKE ?
      `, [`%${currentMonth}%`, `%${currentYear}%`]) || [];
      
      let totalExp = 0;
      let categoryMap: { [key: string]: number } = {};

      txData.forEach(tx => {
        totalExp += tx.amount;
        const cat = tx.category || 'Other';
        categoryMap[cat] = (categoryMap[cat] || 0) + tx.amount;
      });

      setTotalMonthlyExpense(totalExp);

      let topCatName = 'None';
      let topCatAmt = 0;
      let pieData: any = [];
      const colors = ['#f44336', '#2196f3', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4'];

      let colorIndex = 0;
      Object.entries(categoryMap).forEach(([key, value]) => {
        if (value > topCatAmt) {
          topCatAmt = value;
          topCatName = key;
        }
        
        pieData.push({
          name: key,
          amount: value,
          color: colors[colorIndex % colors.length],
          legendFontColor: '#7F7F7F',
          legendFontSize: 12
        });
        colorIndex++;
      });

      setTopCategory({ name: topCatName, amount: topCatAmt });
      setChartData(pieData);

    } catch (error) {
      console.error("Fetch Stats Error:", error);
    }
  };

  const handleAddBook = () => {
    if (!newBookName.trim()) {
      Alert.alert('Error', 'Book name kodukkuka!');
      return;
    }
    try {
      const dateOpts: any = { month: 'short', day: '2-digit', year: 'numeric' };
      const formattedDate = new Date().toLocaleDateString('en-US', dateOpts);
      db?.runSync('INSERT INTO books (name, created_at) VALUES (?, ?)', newBookName, formattedDate);
      setNewBookName('');
      setModalVisible(false);
      fetchBooks();
    } catch (error) {
      console.error("Insert Error:", error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Dashboard</Text>
      </View>

      <FlatList
        ListHeaderComponent={
          <View>
            <View style={styles.statsCard}>
              <View style={styles.statsHeader}>
                <Text style={styles.statsTitle}>This Month's Expense</Text>
                <Text style={styles.totalExpenseText}>₹{totalMonthlyExpense.toFixed(2)}</Text>
              </View>
              
              {chartData.length > 0 ? (
                <>
                  <PieChart
                    data={chartData}
                    width={screenWidth - 60}
                    height={180}
                    chartConfig={{
                      color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    }}
                    accessor={"amount"}
                    backgroundColor={"transparent"}
                    paddingLeft={"15"}
                    center={[10, 0]}
                    absolute
                  />
                  <View style={styles.topCatContainer}>
                    <Text style={styles.topCatLabel}>Highest Expense:</Text>
                    <Text style={styles.topCatValue}>{topCategory.name} (₹{topCategory.amount.toFixed(2)})</Text>
                  </View>
                </>
              ) : (
                <View style={styles.noDataContainer}>
                  <FontAwesome name="pie-chart" size={40} color="#ddd" />
                  <Text style={styles.noDataText}>No expenses recorded this month.</Text>
                </View>
              )}
            </View>
            <Text style={styles.sectionTitle}>Your Books</Text>
          </View>
        }
        data={books}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.bookCard} onPress={() => router.push(`/book/${item.id}`)}>
            <View style={styles.bookLeft}>
              <View style={styles.iconContainer}>
                <FontAwesome name="book" size={20} color="#fff" />
              </View>
              <View>
                <Text style={styles.bookName}>{item.name}</Text>
                <Text style={styles.bookDate}>Updated on {item.created_at}</Text>
              </View>
            </View>
            <View style={styles.bookRight}>
              <Text style={[styles.balance, item.balance >= 0 ? styles.positiveBalance : styles.negativeBalance]}>
                {item.balance >= 0 ? '' : '-'}{Math.abs(item.balance).toFixed(2)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <FontAwesome name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Book</Text>
            <TextInput style={styles.input} placeholder="Book Name" value={newBookName} onChangeText={setNewBookName} autoFocus={true} />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleAddBook} style={styles.saveBtn}><Text style={styles.saveBtnText}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  headerContainer: { padding: 20, paddingTop: 50, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  statsCard: { backgroundColor: '#fff', margin: 15, padding: 20, borderRadius: 15, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  statsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderColor: '#eee', paddingBottom: 10 },
  statsTitle: { fontSize: 16, color: '#666', fontWeight: 'bold' },
  totalExpenseText: { fontSize: 22, fontWeight: 'bold', color: '#f44336' },
  topCatContainer: { marginTop: 10, padding: 12, backgroundColor: '#fff3e0', borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between' },
  topCatLabel: { color: '#e65100', fontWeight: 'bold' },
  topCatValue: { color: '#e65100', fontWeight: 'bold' },
  noDataContainer: { alignItems: 'center', padding: 20 },
  noDataText: { textAlign: 'center', color: '#888', marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginLeft: 15, marginBottom: 10 },
  bookCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#fff', marginHorizontal: 15, marginBottom: 10, borderRadius: 10, elevation: 1 },
  bookLeft: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4154f1', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  bookName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  bookDate: { fontSize: 12, color: '#888', marginTop: 2 },
  bookRight: { flexDirection: 'row', alignItems: 'center' },
  balance: { fontSize: 16, fontWeight: 'bold' },
  positiveBalance: { color: '#2e7d32' },
  negativeBalance: { color: '#d32f2f' },
  fab: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: '#4154f1', justifyContent: 'center', alignItems: 'center', right: 20, bottom: 20, elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#fff', borderRadius: 10, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 20, fontSize: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15 },
  cancelBtn: { padding: 10 },
  cancelBtnText: { color: '#666', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#4154f1', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  saveBtnText: { color: '#fff', fontWeight: 'bold' }
});