import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const IS_WEB = Platform.OS === 'web';

export const db = IS_WEB ? null : SQLite.openDatabaseSync('expenses.db');

export const initDB = () => {
  if (IS_WEB) {
    console.log("Web browser-il SQLite work aavilla. Phone-il run cheyyuka.");
    return;
  }

  try {
    // 1. Books Table Create Cheyyunnu
    db?.execSync(`
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    // 2. Transactions Table Create Cheyyunnu (book_id foreign key aayi add cheythu)
    db?.execSync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        type TEXT NOT NULL, 
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        note TEXT,
        FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
      );
    `);
    
    console.log("Database updated with Books and Transactions tables!");
  } catch (error) {
    console.error("Error creating database", error);
  }
};