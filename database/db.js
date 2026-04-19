import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

// Web-il aano run cheyyunnathu ennu check cheyyunnu
const IS_WEB = Platform.OS === 'web';

// Web anenkil db open cheyyilla, allengil open cheyyum
export const db = IS_WEB ? null : SQLite.openDatabaseSync('expenses.db');

export const initDB = () => {
  if (IS_WEB) {
    console.log("Web browser-il SQLite work aavilla. Phone-il (Android/iOS) run cheyyuka.");
    return;
  }

  try {
    db?.execSync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL, 
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        note TEXT
      );
    `);
    console.log("Database & Table Setup Success!");
  } catch (error) {
    console.error("Error creating database", error);
  }
};