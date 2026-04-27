import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView, Modal, TextInput, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next'; // LANGUAGE HOOK
import { useAppTheme } from '../context/ThemeContext';

// FIREBASE IMPORTS
import { doc, getDoc, collection, query, where, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../database/firebaseConfig';

export default function BookDetailsScreen() {
  const { isDarkMode } = useAppTheme();
  const { t } = useTranslation(); // INIT TRANSLATION

  const themeContainer = isDarkMode ? '#0F172A' : '#F8FAFC';
  const themeCard = isDarkMode ? '#1E293B' : '#FFFFFF';
  const themeText = isDarkMode ? '#F9FAFB' : '#0F172A';
  const themeSubText = isDarkMode ? '#9CA3AF' : '#64748B';
  const themeBorder = isDarkMode ? '#334155' : '#E2E8F0'; 
  const themeChip = isDarkMode ? '#334155' : '#E2E8F0';

  const colorIncome = isDarkMode ? '#34D399' : '#059669';
  const colorExpense = isDarkMode ? '#F87171' : '#DC2626';
  const brandPrimary = '#4154f1';

  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [bookName, setBookName] = useState('Book Details');
  const [allTransactions, setAllTransactions] = useState<any[]>([]); 
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]); 
  const [netBalance, setNetBalance] = useState(0);
  
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [newBudgetValue, setNewBudgetValue] = useState('');

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState(['All']);

  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [newBookName, setNewBookName] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (id) fetchBookDetails();
    }, [id])
  );

  const fetchBookDetails = async () => {
    const userUid = auth.currentUser?.uid;
    if (!userUid) return;

    try {
      const bookRef = doc(db, 'books', id as string);
      const bookSnap = await getDoc(bookRef);
      if (bookSnap.exists()) {
        if (bookSnap.data().userId !== userUid) {
          Alert.alert("Unauthorized");
          router.back();
          return;
        }
        setBookName(bookSnap.data().name);
        setMonthlyBudget(bookSnap.data().budget || 0); 
      }

      const q = query(collection(db, 'transactions'), where("book_id", "==", id as string));
      const txSnapshot = await getDocs(q);
      
      let txData = txSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      txData = txData.filter(tx => tx.userId === userUid);
      txData.sort((a, b) => b.timestamp - a.timestamp);

      setAllTransactions(txData);
      setFilteredTransactions(txData); 

      const uniqueCats = ['All', ...new Set(txData.map((item: any) => item.category))];
      setCategories(uniqueCats as string[]);

      let balance = 0;
      let expThisMonth = 0;
      
      const currentDate = new Date();
      const currentMonth = currentDate.toLocaleDateString('en-US', { month: 'short' });
      const currentYear = currentDate.getFullYear().toString();

      txData.forEach((tx: any) => {
        if (tx.type === 'Income') {
          balance += tx.amount;
        } else {
          balance -= tx.amount;
          if (tx.date.includes(currentMonth) && tx.date.includes(currentYear)) {
            expThisMonth += tx.amount;
          }
        }
      });
      setNetBalance(balance);
      setMonthlyExpense(expThisMonth);
      
    } catch (error) {
      console.error("Fetch Error:", error);
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

  const handleDelete = (txId: string) => {
    Alert.alert("Delete", "Delete this transaction?", [
      { text: t('cancel'), style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          try {
            await deleteDoc(doc(db, 'transactions', txId));
            fetchBookDetails(); 
          } catch (error) {
            console.error("Delete Error", error);
          }
        } 
      }
    ]);
  };

  const handleRenameBook = async () => {
    if (!newBookName.trim()) return;
    try {
      await updateDoc(doc(db, 'books', id as string), {
        name: newBookName,
        updated_at: new Date().getTime() 
      });
      setBookName(newBookName);
      setRenameModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to rename!');
    }
  };

  const handleSaveBudget = async () => {
    const parsedBudget = parseFloat(newBudgetValue);
    if (isNaN(parsedBudget)) return;
    try {
      await updateDoc(doc(db, 'books', id as string), { budget: parsedBudget });
      setMonthlyBudget(parsedBudget);
      setBudgetModalVisible(false);
      setNewBudgetValue('');
    } catch (error) {
      Alert.alert('Error', 'Failed to save budget!');
    }
  };

  const exportToPDF = async () => {
    if (allTransactions.length === 0) return;
    try {
      const totalInc = allTransactions.filter(t => t.type === 'Income').reduce((acc, curr) => acc + curr.amount, 0);
      const totalExp = allTransactions.filter(t => t.type === 'Expense').reduce((acc, curr) => acc + curr.amount, 0);
      
      const htmlContent = `
        <html>
          <body style="font-family: Helvetica, Arial, sans-serif; padding: 20px; color: #333;">
            <h1 style="text-align: center; color: ${brandPrimary}; text-transform: uppercase;">${bookName} - REPORT</h1>
            <p style="text-align: center; color: #666;">Generated on: ${new Date().toLocaleDateString()}</p>
            <div style="display: flex; justify-content: space-between; margin-top: 30px; margin-bottom: 30px; background: #f4f6f8; padding: 20px; border-radius: 12px;">
              <div style="text-align: center;">
                <p style="margin: 0; color: #666; font-size: 14px;">Total Income</p>
                <h2 style="margin: 5px 0 0; color: #10B981;">₹${totalInc.toFixed(2)}</h2>
              </div>
              <div style="text-align: center;">
                <p style="margin: 0; color: #666; font-size: 14px;">Total Expense</p>
                <h2 style="margin: 5px 0 0; color: #EF4444;">₹${totalExp.toFixed(2)}</h2>
              </div>
              <div style="text-align: center;">
                <p style="margin: 0; color: #666; font-size: 14px;">Net Balance</p>
                <h2 style="margin: 5px 0 0; color: ${netBalance >= 0 ? brandPrimary : '#EF4444'};">₹${Math.abs(netBalance).toFixed(2)}</h2>
              </div>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <thead>
                <tr style="background-color: ${brandPrimary}; color: white; text-align: left;">
                  <th style="padding: 12px; border-radius: 8px 0 0 8px;">Date</th>
                  <th style="padding: 12px;">Category</th>
                  <th style="padding: 12px;">Remark</th>
                  <th style="padding: 12px; text-align: right; border-radius: 0 8px 8px 0;">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${allTransactions.map((tx: any, index: number) => `
                  <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9f9f9'}; border-bottom: 1px solid #eee;">
                    <td style="padding: 12px; color: #555;">${tx.date}</td>
                    <td style="padding: 12px; font-weight: bold;">${tx.category}</td>
                    <td style="padding: 12px; color: #777;">${tx.note || '-'}</td>
                    <td style="padding: 12px; text-align: right; font-weight: bold; color: ${tx.type === 'Income' ? '#10B981' : '#EF4444'};">
                      ${tx.type === 'Income' ? '+' : '-'} ${tx.amount}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (error) {
      console.log(error);
    }
  };

  let budgetProgress = 0;
  if (monthlyBudget > 0) {
    budgetProgress = (monthlyExpense / monthlyBudget) * 100;
  }
  const isOverBudget = monthlyExpense > monthlyBudget;

  return (
    <View style={[styles.container, { backgroundColor: themeContainer }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{bookName}</Text>
          <TouchableOpacity onPress={() => { setNewBookName(bookName); setRenameModalVisible(true); }} style={{ marginLeft: 15, padding: 5 }}>
            <FontAwesome name="pencil" size={16} color="#e0e0e0" />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={() => { setNewBudgetValue(monthlyBudget ? monthlyBudget.toString() : ''); setBudgetModalVisible(true); }} style={[styles.downloadBtn, { marginRight: 10 }]}>
            <FontAwesome name="bullseye" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={exportToPDF} style={styles.downloadBtn}>
            <FontAwesome name="file-pdf-o" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.balanceCard, { backgroundColor: themeCard, borderColor: themeBorder }]}>
        <Text style={[styles.balanceLabel, { color: themeSubText }]}>{t('net_balance')}</Text>
        <Text style={[styles.balanceAmount, { color: netBalance >= 0 ? colorIncome : colorExpense }]}>
          ₹{Math.abs(netBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {netBalance >= 0 ? '' : '(Dr)'}
        </Text>
        
        {monthlyBudget > 0 && (
          <View style={styles.budgetContainer}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
              <Text style={{ fontSize: 12, color: themeSubText }}>Monthly Budget (₹{monthlyBudget})</Text>
              <Text style={{ fontSize: 12, color: isOverBudget ? colorExpense : themeText, fontWeight: 'bold' }}>
                ₹{monthlyExpense.toLocaleString('en-IN')} Spent
              </Text>
            </View>
            <View style={[styles.progressBarBg, { backgroundColor: themeBorder }]}>
              <View style={[styles.progressBarFill, { 
                width: `${Math.min(budgetProgress, 100)}%`, 
                backgroundColor: isOverBudget ? colorExpense : (budgetProgress > 80 ? '#F59E0B' : colorIncome) 
              }]} />
            </View>
          </View>
        )}
      </View>

      <View style={[styles.filterContainer, { backgroundColor: themeContainer, borderBottomColor: themeBorder }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {categories.map((cat: any, index) => (
            <TouchableOpacity 
              key={index} 
              style={[
                styles.filterChip, 
                selectedCategory === cat ? { backgroundColor: brandPrimary, borderColor: brandPrimary } : { backgroundColor: themeChip, borderColor: themeBorder }
              ]}
              onPress={() => handleFilter(cat)}
            >
              <Text style={[
                styles.filterText, 
                selectedCategory === cat ? { color: '#fff' } : { color: themeSubText }
              ]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item: any) => item.id.toString()}
        contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.txCard, { backgroundColor: themeCard, borderColor: themeBorder }]}
            onPress={() => router.push(`/book/addTx?bookId=${id}&type=${item.type}&txId=${item.id}`)}
          >
            <View style={styles.txLeft}>
              <View style={[styles.typeIndicator, { backgroundColor: item.type === 'Income' ? colorIncome : colorExpense }]} />
              <View>
                <Text style={[styles.categoryText, { color: themeText }]}>{item.category}</Text>
                <Text style={[styles.dateText, { color: themeSubText }]}>{item.date}</Text>
                {item.note ? <Text style={[styles.noteText, { color: themeSubText }]} numberOfLines={1}>{item.note}</Text> : null}
              </View>
            </View>
            <View style={styles.txRight}>
              <Text style={[styles.amountText, { color: item.type === 'Income' ? colorIncome : colorExpense }]}>
                {item.type === 'Income' ? '+' : '-'} ₹{item.amount.toLocaleString('en-IN')}
              </Text>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                <FontAwesome name="trash" size={18} color={colorExpense} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={[styles.emptyText, { color: themeSubText }]}>No transactions found.</Text>}
      />

      <View style={[styles.bottomBar, { backgroundColor: themeCard, borderTopColor: themeBorder }]}>
        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: colorExpense }]} 
          onPress={() => router.push(`/book/addTx?bookId=${id}&type=Expense`)}>
          <Text style={styles.actionText}>{t('gave')}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: colorIncome }]} 
          onPress={() => router.push(`/book/addTx?bookId=${id}&type=Income`)}>
          <Text style={styles.actionText}>{t('got')}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={renameModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeCard, borderColor: themeBorder }]}>
            <Text style={[styles.modalTitle, { color: themeText }]}>Rename Book</Text>
            <TextInput 
              style={[styles.input, { color: themeText, borderColor: themeBorder, backgroundColor: themeContainer }]} 
              placeholder={t('book_name')} 
              placeholderTextColor={themeSubText}
              value={newBookName} 
              onChangeText={setNewBookName} 
              autoFocus={true} 
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setRenameModalVisible(false)} style={styles.cancelBtn}>
                <Text style={[styles.cancelBtnText, { color: themeSubText }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRenameBook} style={[styles.saveBtn, { backgroundColor: brandPrimary }]}>
                <Text style={styles.saveBtnText}>{t('update')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={budgetModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeCard, borderColor: themeBorder }]}>
            <Text style={[styles.modalTitle, { color: themeText }]}>Set Monthly Budget</Text>
            <TextInput 
              style={[styles.input, { color: themeText, borderColor: themeBorder, backgroundColor: themeContainer }]} 
              placeholder="e.g. 5000" 
              placeholderTextColor={themeSubText}
              keyboardType="numeric"
              value={newBudgetValue} 
              onChangeText={setNewBudgetValue} 
              autoFocus={true} 
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setBudgetModalVisible(false)} style={styles.cancelBtn}>
                <Text style={[styles.cancelBtnText, { color: themeSubText }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveBudget} style={[styles.saveBtn, { backgroundColor: brandPrimary }]}>
                <Text style={styles.saveBtnText}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ... [styles object remains exactly same]
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#4154f1', padding: 20, paddingTop: Platform.OS === 'ios' ? 50 : 40, paddingBottom: 25 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  backButton: { marginRight: 15, padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', maxWidth: '75%' },
  downloadBtn: { padding: 8 },
  balanceCard: { margin: 15, padding: 25, borderRadius: 16, alignItems: 'center', borderWidth: 1, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, marginTop: -20 },
  balanceLabel: { fontSize: 14, marginBottom: 8, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  balanceAmount: { fontSize: 32, fontWeight: '800' },
  budgetContainer: { width: '100%', marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  progressBarBg: { height: 8, width: '100%', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  filterContainer: { paddingVertical: 12, borderBottomWidth: 1 },
  filterScroll: { paddingHorizontal: 15, gap: 10 },
  filterChip: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterText: { fontWeight: '600', fontSize: 13 },
  txCard: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  txLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  typeIndicator: { width: 4, height: '100%', borderRadius: 4, marginRight: 15 },
  categoryText: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  dateText: { fontSize: 12, fontWeight: '500' },
  noteText: { fontSize: 13, marginTop: 4, fontStyle: 'italic', maxWidth: '90%' },
  txRight: { flexDirection: 'row', alignItems: 'center' },
  amountText: { fontSize: 17, fontWeight: '800', marginRight: 15 },
  deleteBtn: { padding: 8 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 15 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 15, borderTopWidth: 1, gap: 15, paddingBottom: Platform.OS === 'ios' ? 30 : 15 },
  actionBtn: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  actionText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', borderRadius: 16, padding: 25, borderWidth: 1, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  input: { borderWidth: 1, padding: 15, borderRadius: 10, marginBottom: 25, fontSize: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 15 },
  cancelBtnText: { fontWeight: 'bold', fontSize: 16 },
  saveBtn: { paddingVertical: 12, paddingHorizontal: 25, borderRadius: 10 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});