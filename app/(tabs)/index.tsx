import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { db } from '../../database/db';

export default function HomeScreen() {
  const [books, setBooks] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newBookName, setNewBookName] = useState('');
  
  const router = useRouter();

  // Page open aakumpol books fetch cheyyan
  useFocusEffect(
    useCallback(() => {
      fetchBooks();
    }, [])
  );

  const fetchBooks = () => {
    try {
      // Books-um athile net balance-um orumichu edukkanulla SQL query
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
      console.error("Fetch Error:", error);
    }
  };

  const handleAddBook = () => {
    if (!newBookName.trim()) {
      Alert.alert('Error', 'Book name kodukkuka!');
      return;
    }

    try {
      // Current date format (eg: Oct 03 2025)
      const dateOpts = { month: 'short', day: '2-digit', year: 'numeric' };
      const formattedDate = new Date().toLocaleDateString('en-US', dateOpts);

      db?.runSync('INSERT INTO books (name, created_at) VALUES (?, ?)', newBookName, formattedDate);
      
      setNewBookName('');
      setModalVisible(false);
      fetchBooks(); // List refresh cheyyan
    } catch (error) {
      console.error("Insert Error:", error);
      Alert.alert('Error', 'Book create cheyyan pattiyilla');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Your Books</Text>
        <FontAwesome name="search" size={20} color="#4154f1" />
      </View>

      <FlatList
        data={books}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          // Book-il click cheyumbol athinte ullilekku povan (Phase 3-il ithu set cheyyum)
          <TouchableOpacity 
            style={styles.bookCard} 
            onPress={() => router.push(`/book/${item.id}`)}
          >
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
                {item.balance >= 0 ? '' : '-'}{Math.abs(item.balance)}
              </Text>
              <TouchableOpacity style={styles.moreIcon}>
                <FontAwesome name="ellipsis-v" size={20} color="#888" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No books created yet. Click '+' to add.</Text>}
      />

      {/* Floating Action Button (+) */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <FontAwesome name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Add Book Modal */}
      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Book</Text>
            <TextInput
              style={styles.input}
              placeholder="Book Name (eg: October month)"
              value={newBookName}
              onChangeText={setNewBookName}
              autoFocus={true}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
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
  container: { flex: 1, backgroundColor: '#fff' },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#666' },
  
  bookCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f9f9f9' },
  bookLeft: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4154f1', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  bookName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  bookDate: { fontSize: 12, color: '#888', marginTop: 2 },
  
  bookRight: { flexDirection: 'row', alignItems: 'center' },
  balance: { fontSize: 16, fontWeight: 'bold', marginRight: 15 },
  positiveBalance: { color: '#2e7d32' },
  negativeBalance: { color: '#d32f2f' },
  moreIcon: { padding: 5 },
  
  emptyText: { textAlign: 'center', marginTop: 50, color: '#888', fontSize: 16 },
  
  fab: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: '#4154f1', justifyContent: 'center', alignItems: 'center', right: 20, bottom: 20, elevation: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#fff', borderRadius: 10, padding: 20, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 20, fontSize: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15 },
  cancelBtn: { padding: 10 },
  cancelBtnText: { color: '#666', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#4154f1', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  saveBtnText: { color: '#fff', fontWeight: 'bold' }
});