import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, Dimensions, Platform } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

// FIREBASE IMPORTS
import { collection, getDocs, addDoc, query, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../database/firebaseConfig';

const screenWidth = Dimensions.get('window').width;

export default function HomeScreen() {
  const { isDarkMode } = useAppTheme();

  // --- PREMIUM FINTECH COLOR PALETTE ---
  const themeContainer = isDarkMode ? '#0F172A' : '#F8FAFC';
  const themeCard = isDarkMode ? '#1E293B' : '#FFFFFF';
  const themeText = isDarkMode ? '#F9FAFB' : '#0F172A';
  const themeSubText = isDarkMode ? '#9CA3AF' : '#64748B';
  const themeBorder = isDarkMode ? '#334155' : '#E2E8F0';
  
  const colorIncome = isDarkMode ? '#34D399' : '#059669';
  const colorExpense = isDarkMode ? '#F87171' : '#DC2626';
  const brandPrimary = '#4154f1';
  
  // --- SOFT PASTEL COLORS FOR CHARTS IN DARK MODE ---
  const chartLineColor = isDarkMode ? '#818CF8' : brandPrimary; // Soft Indigo for Dark Mode
  const pieColorsDark = ['#FCA5A5', '#93C5FD', '#6EE7B7', '#FDE047', '#C4B5FD', '#5EEAD4']; // Soft Muted Colors
  const pieColorsLight = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#14B8A6']; // Vibrant Colors

  const [books, setBooks] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newBookName, setNewBookName] = useState('');
  
  // ACTIONS MODAL STATE (3 Dots Click)
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedBook, setSelectedBook] = useState<{id: string, name: string} | null>(null);
  
  // RENAME MODAL STATE
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [editBookName, setEditBookName] = useState('');

  const [chartData, setChartData] = useState<any[]>([]);
  const [lineChartData, setLineChartData] = useState<any>(null); 
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
      let booksList = booksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      // SORTING: Ettavum puthiya/update cheytha book mukalil varan
      booksList.sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));

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

      setBooks(booksWithBalance);

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
      const pieColors = isDarkMode ? pieColorsDark : pieColorsLight;

      let colorIndex = 0;
      Object.entries(categoryMap).forEach(([key, value]) => {
        if (value > topCatAmt) {
          topCatAmt = value;
          topCatName = key;
        }
        pieData.push({
          name: key,
          amount: value,
          color: pieColors[colorIndex % pieColors.length],
          legendFontColor: isDarkMode ? '#E2E8F0' : '#475569',
          legendFontSize: 12
        });
        colorIndex++;
      });

      setTopCategory({ name: topCatName, amount: topCatAmt });
      setChartData(pieData);

      const last6Months = [];
      const currentDate = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        last6Months.push({
          label: d.toLocaleDateString('en-US', { month: 'short' }), 
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
        userId: userUid,
        updated_at: new Date().getTime()
      });
      
      setNewBookName('');
      setModalVisible(false);
      fetchDashboardData(); 
    } catch (error) {
      console.error("Insert Error:", error);
      Alert.alert('Error', 'Book add cheyyan pattiyilla!');
    }
  };

  const openBookActions = (book: any) => {
    setSelectedBook({ id: book.id, name: book.name });
    setActionModalVisible(true);
  };

  const handleDeletePress = () => {
    setActionModalVisible(false);
    if (!selectedBook) return;
    Alert.alert("Delete Book", `"${selectedBook.name}" ഡിലീറ്റ് ചെയ്യണോ? ഇതിലെ എല്ലാ ട്രാൻസാക്ഷൻസും നഷ്ടപ്പെടും.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          try {
            await deleteDoc(doc(db, 'books', selectedBook.id));
            const q = query(collection(db, 'transactions'), where("book_id", "==", selectedBook.id));
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

  const handleRenamePress = () => {
    setActionModalVisible(false);
    if (!selectedBook) return;
    setEditBookName(selectedBook.name);
    setRenameModalVisible(true);
  };

  const submitRenameBook = async () => {
    if (!editBookName.trim() || !selectedBook) {
      Alert.alert('Error', 'Book name kodukkuka!');
      return;
    }
    try {
      await updateDoc(doc(db, 'books', selectedBook.id), {
        name: editBookName,
        updated_at: new Date().getTime() 
      });
      setRenameModalVisible(false);
      fetchDashboardData();
    } catch (error) {
      console.error("Rename Error:", error);
      Alert.alert('Error', 'Rename cheyyan pattiyilla!');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeContainer }]}>
      <View style={[styles.headerContainer, { backgroundColor: themeCard, borderBottomColor: themeBorder }]}>
        <Text style={[styles.headerTitle, { color: themeText }]}>Dashboard</Text>
      </View>

      <FlatList
        ListHeaderComponent={(
          <Text style={[styles.sectionTitle, { color: themeText, marginTop: 15 }]}>Your Books</Text>
        )}
        data={books}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.bookCard, { backgroundColor: themeCard, borderColor: themeBorder }]} 
            onPress={() => router.push({ pathname: '/book/[id]', params: { id: item.id } })}
            onLongPress={() => openBookActions(item)}
          >
            <View style={styles.bookLeft}>
              <View style={[styles.iconContainer, { backgroundColor: brandPrimary }]}>
                <FontAwesome name="book" size={20} color="#fff" />
              </View>
              <View>
                <Text style={[styles.bookName, { color: themeText }]}>{item.name}</Text>
                <Text style={[styles.bookDate, { color: themeSubText }]}>Updated on {item.created_at}</Text>
              </View>
            </View>
            
            <View style={styles.bookRight}>
              <Text style={[styles.balance, { color: item.balance >= 0 ? colorIncome : colorExpense }]}>
                {item.balance >= 0 ? '' : '-'}{Math.abs(item.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
              <TouchableOpacity onPress={() => openBookActions(item)} style={styles.dotsBtn}>
                <FontAwesome name="ellipsis-v" size={22} color={themeSubText} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        
        ListFooterComponent={(
          <View style={{ marginTop: 20 }}>
            <View style={[styles.statsCard, { backgroundColor: themeCard, borderColor: themeBorder }]}>
              <View style={[styles.statsHeader, { borderBottomColor: themeBorder }]}>
                <Text style={[styles.statsTitle, { color: themeSubText }]}>This Month's Expense</Text>
                <Text style={[styles.totalExpenseText, { color: colorExpense }]}>₹{totalMonthlyExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
              </View>
              
              {chartData.length > 0 ? (
                <>
                  <PieChart
                    data={chartData}
                    width={screenWidth - 60}
                    height={180}
                    chartConfig={{ 
                      color: (opacity = 1) => `rgba(${isDarkMode ? '249, 250, 251' : '17, 24, 39'}, ${opacity})`
                    }}
                    accessor={"amount"}
                    backgroundColor={"transparent"}
                    paddingLeft={"15"}
                    center={[10, 0]}
                    absolute
                  />
                  <View style={[styles.topCatContainer, { backgroundColor: isDarkMode ? '#334155' : '#FEF3C7' }]}>
                    <Text style={[styles.topCatLabel, { color: isDarkMode ? '#FDE047' : '#D97706' }]}>Highest Expense:</Text>
                    <Text style={[styles.topCatValue, { color: isDarkMode ? '#FDE047' : '#D97706' }]}>{topCategory.name} (₹{topCategory.amount.toLocaleString('en-IN')})</Text>
                  </View>
                </>
              ) : (
                <View style={styles.noDataContainer}>
                  <FontAwesome name="pie-chart" size={40} color={themeBorder} />
                  <Text style={[styles.noDataText, { color: themeSubText }]}>No expenses recorded this month.</Text>
                </View>
              )}
            </View>

            {lineChartData && (
              <View style={[styles.statsCard, { backgroundColor: themeCard, borderColor: themeBorder, marginTop: 0 }]}>
                <View style={[styles.statsHeader, { borderBottomColor: themeBorder, paddingBottom: 15 }]}>
                  <Text style={[styles.statsTitle, { color: themeText }]}>6-Month Expense Trend</Text>
                  <FontAwesome name="line-chart" size={18} color={chartLineColor} />
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
                    color: (opacity = 1) => isDarkMode ? `rgba(129, 140, 248, ${opacity})` : `rgba(65, 84, 241, ${opacity})`, 
                    labelColor: (opacity = 1) => themeSubText,
                    style: { borderRadius: 16 },
                    propsForDots: { r: "5", strokeWidth: "2", stroke: chartLineColor },
                    propsForBackgroundLines: { stroke: themeBorder, strokeDasharray: "4" } // ഗ്രിഡ് ലൈനുകൾ സോഫ്റ്റ് ആക്കി
                  }}
                  bezier 
                  style={{ marginVertical: 10, borderRadius: 16, alignSelf: 'center' }}
                  onDataPointClick={(data) => {
                    const month = lineChartData.labels[data.index];
                    Alert.alert(`${month} Expense`, `₹ ${data.value.toLocaleString('en-IN')}`);
                  }}
                />
              </View>
            )}
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 20 }}>
            <Text style={{ color: themeSubText }}>No books found. Click '+' to create one.</Text>
          </View>
        }
      />

      <TouchableOpacity style={[styles.fab, { backgroundColor: brandPrimary }]} onPress={() => setModalVisible(true)}>
        <FontAwesome name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      {/* CREATE BOOK MODAL */}
      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeCard, borderColor: themeBorder }]}>
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
              <TouchableOpacity onPress={handleAddBook} style={[styles.saveBtn, { backgroundColor: brandPrimary }]}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* RENAME BOOK MODAL */}
      <Modal visible={renameModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeCard, borderColor: themeBorder }]}>
            <Text style={[styles.modalTitle, { color: themeText }]}>Rename Book</Text>
            <TextInput 
              style={[styles.input, { color: themeText, borderColor: themeBorder, backgroundColor: themeContainer }]} 
              placeholder="Book Name" 
              placeholderTextColor={themeSubText}
              value={editBookName} 
              onChangeText={setEditBookName} 
              autoFocus={true} 
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setRenameModalVisible(false)} style={styles.cancelBtn}>
                <Text style={[styles.cancelBtnText, { color: themeSubText }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitRenameBook} style={[styles.saveBtn, { backgroundColor: brandPrimary }]}>
                <Text style={styles.saveBtnText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ACTION BOTTOM SHEET / MODAL FOR 3 DOTS */}
      <Modal visible={actionModalVisible} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActionModalVisible(false)}>
          <View style={[styles.actionModal, { backgroundColor: themeCard, borderColor: themeBorder }]}>
            <Text style={[styles.actionTitle, { color: themeSubText }]}>{selectedBook?.name}</Text>
            
            <TouchableOpacity style={styles.actionItem} onPress={handleRenamePress}>
              <FontAwesome name="pencil" size={20} color={themeText} style={styles.actionIcon} />
              <Text style={[styles.actionText, { color: themeText }]}>Rename Book</Text>
            </TouchableOpacity>
            
            <View style={{ height: 1, backgroundColor: themeBorder }} />
            
            <TouchableOpacity style={styles.actionItem} onPress={handleDeletePress}>
              <FontAwesome name="trash-o" size={20} color={colorExpense} style={styles.actionIcon} />
              <Text style={[styles.actionText, { color: colorExpense }]}>Delete Book</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { padding: 20, paddingTop: Platform.OS === 'ios' ? 50 : 40, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 15, marginBottom: 15 },
  
  bookCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, marginHorizontal: 15, marginBottom: 10, borderRadius: 12, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  bookLeft: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  bookName: { fontSize: 16, fontWeight: '700' },
  bookDate: { fontSize: 12, marginTop: 4, fontWeight: '500' },
  bookRight: { flexDirection: 'row', alignItems: 'center' },
  balance: { fontSize: 17, fontWeight: '800', marginRight: 10 },
  dotsBtn: { padding: 5, paddingHorizontal: 10 },

  statsCard: { margin: 15, padding: 20, borderRadius: 16, borderWidth: 1, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
  statsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, paddingBottom: 10 },
  statsTitle: { fontSize: 16, fontWeight: 'bold' },
  totalExpenseText: { fontSize: 24, fontWeight: '800' },
  topCatContainer: { marginTop: 10, padding: 12, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between' },
  topCatLabel: { fontWeight: '700' },
  topCatValue: { fontWeight: '700' },
  noDataContainer: { alignItems: 'center', padding: 20 },
  noDataText: { textAlign: 'center', marginTop: 10 },
  
  fab: { position: 'absolute', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', right: 20, bottom: 20, elevation: 5, shadowColor: '#4154f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', borderRadius: 16, padding: 25, borderWidth: 1, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, padding: 15, borderRadius: 10, marginBottom: 25, fontSize: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 15 },
  cancelBtnText: { fontWeight: 'bold', fontSize: 16 },
  saveBtn: { paddingVertical: 12, paddingHorizontal: 25, borderRadius: 10 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  actionModal: { width: '85%', borderRadius: 16, paddingVertical: 15, borderWidth: 1, elevation: 10 },
  actionTitle: { textAlign: 'center', fontSize: 14, fontStyle: 'italic', marginBottom: 10, paddingHorizontal: 15 },
  actionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20 },
  actionIcon: { width: 30, textAlign: 'center', marginRight: 10 },
  actionText: { fontSize: 16, fontWeight: 'bold' }
});