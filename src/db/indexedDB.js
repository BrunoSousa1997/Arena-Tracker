import { openDB } from "idb";

const DB_NAME = "arena-tracker";
const STORE = "games";

export const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE)) {
      db.createObjectStore(STORE, {
        keyPath: "id",
        autoIncrement: true,
      });
    }
  },
});

export async function getAllGames() {
  const db = await dbPromise;
  return db.getAll(STORE);
}

export async function addGame(game) {
  const db = await dbPromise;
  return db.add(STORE, game);
}

export async function clearGames() {
  const db = await dbPromise;
  return db.clear(STORE);
}