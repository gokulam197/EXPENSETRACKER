import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, Dimensions } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

// FIREBASE IMPORTS
import { collection, getDocs, addDoc, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../database/firebaseConfig';

const screenWidth = Dimensions.get('window').width;

export default function HomeScreen() {
  const { isDarkMode } = useAppTheme();

  // DYNAMIC COLORS
  const themeContainer = isDarkMode ? '#121212' : '#f4f6f8';
  const themeCard = isDarkMode ? '#1e1e1e' : '#fff';
  const themeText = isDarkMode ? '#ffffff' : '#333333';
  const themeSubText = isDarkMode ? '#aaaaaa' : '#666666';
  const themeBorder = isDarkMode ? '#333333' : '#eeeeee';
  const chartTextColor = isDarkMode ? 255 : 0;

  const [books, setBooks] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newBookName, setNewBookName] = useState('');
  
  const [chartData, setChartData] = useState<any[]>([]);
  const [lineChartData, setLineChartData] = useState<any>(null); // Puthiya Line Chart State
  const [topCategory, setTopCategory] = useState({ name: 'None', amount: 0 });
  const [totalMonthlyExpense, setTotalMonthlyExpense] = useState(0);

  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [isDarkMode]) 
  );

  const fetchDashboardData = async () => {
    const userUid = auth.currentUser?.uid;
    if (!userUid) return;

    try {
      const qBooks = query(collection(db, 'books'), where("userId", "==", userUid));
      const booksSnapshot = await getDocs(qBooks);
      const booksList = booksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      const qTx = query(collection(db, 'transactions'), where("userId", "==", userUid));
      const txSnapshot = await getDocs(qTx);
      const txList = txSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      const booksWithBalance = booksList.map(book => {
        const bookTxs = txList.filter(tx => tx.book_id === book.id);
        const balance = bookTxs.reduce((acc, tx) => {
          return tx.type === 'Income' ? acc + tx.amount : acc - tx.amount;
        }, 0);
        return { ...book, balance };
      });

      setBooks(booksWithBalance.reverse());

      const date = new Date();
      const currentMonth = date.toLocaleDateString('en-US', { month: 'short' });
      const currentYear = date.getFullYear().toString();
      
      const monthlyTx = txList.filter(tx => 
        tx.type === 'Expense' && 
        tx.date.includes(currentMonth) && 
        tx.date.includes(currentYear)
      );
      
      let totalExp = 0;
      let categoryMap: { [key: string]: number } = {};

      monthlyTx.forEach(tx => {
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
          legendFontColor: isDarkMode ? '#aaaaaa' : '#7F7F7F',
          legendFontSize: 12
        });
        colorIndex++;
      });

      setTopCategory({ name: topCatName, amount: topCatAmt });
      setChartData(pieData);

      // --- PUTHIYA LINE CHART LOGIC (Last 6 Months Trend) ---
      const last6Months = [];
      const currentDate = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        last6Months.push({
          label: d.toLocaleDateString('en-US', { month: 'short' }), // eg: "Jan"
          year: d.getFullYear().toString()
        });
      }

      const monthlyTrend = last6Months.map(m => {
        return txList
          .filter(tx => tx.type === 'Expense' && tx.date.includes(m.label) && tx.date.includes(m.year))
          .reduce((acc, curr) => acc + curr.amount, 0);
      });

      setLineChartData({
        labels: last6Months.map(m => m.label),
        datasets: [{ data: monthlyTrend.length > 0 ? monthlyTrend : [0,0,0,0,0,0] }]
      });

    } catch (error) {
      console.error("Firebase fetch error:", error);
    }
  };

  const handleAddBook = async () => {
    if (!newBookName.trim()) {
      Alert.alert('Error', 'Book name kodukkuka!');
      return;
    }
    try {
      const userUid = auth.currentUser?.uid;
      const dateOpts: any = { month: 'short', day: '2-digit', year: 'numeric' };
      const formattedDate = new Date().toLocaleDateString('en-US', dateOpts);
      
      await addDoc(collection(db, 'books'), {
        name: newBookName,
        created_at: formattedDate,
        userId: userUid 
      });
      
      setNewBookName('');
      setModalVisible(false);
      fetchDashboardData(); 
    } catch (error) {
      console.error("Insert Error:", error);
      Alert.alert('Error', 'Book add cheyyan pattiyilla!');
    }
  };

  const handleDeleteBook = (bookId: string, bookName: string) => {
    Alert.alert("Delete Book", `"${bookName}" ഡിലീറ്റ് ചെയ്യണോ? ഇതിലെ എല്ലാ ട്രാൻസാക്ഷൻസും നഷ്ടപ്പെടും.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          try {
            await deleteDoc(doc(db, 'books', bookId));
            const q = query(collection(db, 'transactions'), where("book_id", "==", bookId));
            const txSnap = await getDocs(q);
            txSnap.forEach(async (tDoc) => {
              await deleteDoc(doc(db, 'transactions', tDoc.id));
            });
            fetchDashboardData(); 
          } catch (error) {
            console.error("Delete Error:", error);
            Alert.alert("Error", "Book delete cheyyan pattiyilla.");
          }
        }
      }
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: themeContainer }]}>
      <View style={[styles.headerContainer, { backgroundColor: themeCard, borderBottomColor: themeBorder }]}>
        <Text style={[styles.headerTitle, { color: themeText }]}>Dashboard</Text>
      </View>

      <FlatList
        ListHeaderComponent={(
          <View>
            {/* 1. PIE CHART CARD */}
            <View style={[styles.statsCard, { backgroundColor: themeCard }]}>
              <View style={[styles.statsHeader, { borderBottomColor: themeBorder }]}>
                <Text style={[styles.statsTitle, { color: themeSubText }]}>This Month's Expense</Text>
                <Text style={styles.totalExpenseText}>₹{totalMonthlyExpense.toFixed(2)}</Text>
              </View>
              
              {chartData.length > 0 ? (
                <>
                  <PieChart
                    data={chartData}
                    width={screenWidth - 60}
                    height={180}
                    chartConfig={{
                      color: (opacity = 1) => `rgba(${chartTextColor}, ${chartTextColor}, ${chartTextColor}, ${opacity})`,
                    }}
                    accessor={"amount"}
                    backgroundColor={"transparent"}
                    paddingLeft={"15"}
                    center={[10, 0]}
                    absolute
                  />
                  <View style={[styles.topCatContainer, { backgroundColor: isDarkMode ? '#3e2723' : '#fff3e0' }]}>
                    <Text style={styles.topCatLabel}>Highest Expense:</Text>
                    <Text style={styles.topCatValue}>{topCategory.name} (₹{topCategory.amount.toFixed(2)})</Text>
                  </View>
                </>
              ) : (
                <View style={styles.noDataContainer}>
                  <FontAwesome name="pie-chart" size={40} color={themeBorder} />
                  <Text style={[styles.noDataText, { color: themeSubText }]}>No expenses recorded this month.</Text>
                </View>
              )}
            </View>

{/* 2. PUTHIYA LINE CHART CARD (Expense Trend) */}
{lineChartData && (
              <View style={[styles.statsCard, { backgroundColor: themeCard, marginTop: 0 }]}>
                <View style={[styles.statsHeader, { borderBottomColor: themeBorder, paddingBottom: 15 }]}>
                  <Text style={[styles.statsTitle, { color: themeText }]}>6-Month Expense Trend</Text>
                  <FontAwesome name="line-chart" size={18} color="#4154f1" />
                </View>
                <LineChart
                  data={lineChartData}
                  width={screenWidth - 70} 
                  height={200}
                  yAxisLabel="₹"
                  yAxisSuffix=""
                  chartConfig={{
                    backgroundColor: themeCard,
                    backgroundGradientFrom: themeCard,
                    backgroundGradientTo: themeCard,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(65, 84, 241, ${opacity})`, 
                    labelColor: (opacity = 1) => themeSubText,
                    style: { borderRadius: 16 },
                    propsForDots: { r: "5", strokeWidth: "2", stroke: "#4154f1" }
                  }}
                  bezier 
                  style={{ marginVertical: 10, borderRadius: 16, alignSelf: 'center' }}
                  
                  // --- IVIDE AANU NAMMAL CLICK ACTION ADD CHEYYUNNATHU ---
                  onDataPointClick={(data) => {
                    // ഏത് മാസമാണ് ക്ലിക്ക് ചെയ്തത് എന്ന് കണ്ടുപിടിക്കുന്നു
                    const month = lineChartData.labels[data.index];
                    // ആ മാസത്തെ ചിലവ് പോപ്പ്-അപ്പ് ആയി കാണിക്കുന്നു
                    Alert.alert(`${month} Expense`, `₹ ${data.value}`);
                  }}
                />
              </View>
            )}
            
            <Text style={[styles.sectionTitle, { color: themeText }]}>Your Books</Text>
          </View>
        )}
        data={books}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.bookCard, { backgroundColor: themeCard }]} 
            onPress={() => router.push({ pathname: '/book/[id]', params: { id: item.id } })}
          >
            <View style={styles.bookLeft}>
              <View style={styles.iconContainer}>
                <FontAwesome name="book" size={20} color="#fff" />
              </View>
              <View>
                <Text style={[styles.bookName, { color: themeText }]}>{item.name}</Text>
                <Text style={[styles.bookDate, { color: themeSubText }]}>Updated on {item.created_at}</Text>
              </View>
            </View>
            
            <View style={styles.bookRight}>
              <Text style={[styles.balance, item.balance >= 0 ? styles.positiveBalance : styles.negativeBalance]}>
                {item.balance >= 0 ? '' : '-'}{Math.abs(item.balance).toFixed(2)}
              </Text>
              <TouchableOpacity onPress={() => handleDeleteBook(item.id, item.name)} style={{ marginLeft: 15, padding: 5 }}>
                <FontAwesome name="trash-o" size={20} color="#f44336" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 20 }}>
            <Text style={{ color: themeSubText }}>No books found. Click '+' to create one.</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <FontAwesome name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeCard }]}>
            <Text style={[styles.modalTitle, { color: themeText }]}>Create New Book</Text>
            <TextInput 
              style={[styles.input, { color: themeText, borderColor: themeBorder, backgroundColor: themeContainer }]} 
              placeholder="Book Name" 
              placeholderTextColor={themeSubText}
              value={newBookName} 
              onChangeText={setNewBookName} 
              autoFocus={true} 
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                <Text style={[styles.cancelBtnText, { color: themeSubText }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddBook} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { padding: 20, paddingTop: 50, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  statsCard: { margin: 15, padding: 20, borderRadius: 15, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  statsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, paddingBottom: 10 },
  statsTitle: { fontSize: 16, fontWeight: 'bold' },
  totalExpenseText: { fontSize: 22, fontWeight: 'bold', color: '#f44336' },
  topCatContainer: { marginTop: 10, padding: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between' },
  topCatLabel: { color: '#ff9800', fontWeight: 'bold' },
  topCatValue: { color: '#ff9800', fontWeight: 'bold' },
  noDataContainer: { alignItems: 'center', padding: 20 },
  noDataText: { textAlign: 'center', marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 15, marginBottom: 10 },
  bookCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, marginHorizontal: 15, marginBottom: 10, borderRadius: 10, elevation: 1 },
  bookLeft: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4154f1', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  bookName: { fontSize: 16, fontWeight: 'bold' },
  bookDate: { fontSize: 12, marginTop: 2 },
  bookRight: { flexDirection: 'row', alignItems: 'center' },
  balance: { fontSize: 16, fontWeight: 'bold' },
  positiveBalance: { color: '#4caf50' },
  negativeBalance: { color: '#f44336' },
  fab: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: '#4154f1', justifyContent: 'center', alignItems: 'center', right: 20, bottom: 20, elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', borderRadius: 10, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  input: { borderWidth: 1, padding: 10, borderRadius: 8, marginBottom: 20, fontSize: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15 },
  cancelBtn: { padding: 10 },
  cancelBtnText: { fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#4154f1', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  saveBtnText: { color: '#fff', fontWeight: 'bold' }
});