/**
 * Web stub: native SQLite storage is not used on web (see WebStorage).
 * This file exists so Metro does not bundle expo-sqlite for the web target.
 */

import type { Item, Room } from '../types/models';
import { IStorage, StorageError } from '../types/storage';

async function notAvailable(): Promise<never> {
    throw new StorageError(
        'NativeStorage is not available on web; use WebStorage.'
    );
}

export class NativeStorage implements IStorage {
    open() {
        return notAvailable();
    }
    insertItem(_item: Item) {
        return notAvailable();
    }
    updateItem(_id: string, _updates: Partial<Item>) {
        return notAvailable();
    }
    deleteItem(_id: string) {
        return notAvailable();
    }
    getItem(_id: string) {
        return notAvailable();
    }
    getAllItems() {
        return notAvailable();
    }
    getItemsBatch(_offset: number, _limit: number) {
        return notAvailable();
    }
    getItemsCount() {
        return notAvailable();
    }
    searchItems(_query: string) {
        return notAvailable();
    }
    insertRoom(_room: Room) {
        return notAvailable();
    }
    updateRoom(_id: string, _updates: Partial<Room>) {
        return notAvailable();
    }
    deleteRoom(_id: string) {
        return notAvailable();
    }
    getRoom(_id: string) {
        return notAvailable();
    }
    getAllRooms() {
        return notAvailable();
    }
    clearAll() {
        return notAvailable();
    }
    exportData() {
        return notAvailable();
    }
    importData(_data: { items: Item[]; rooms: Room[] }) {
        return notAvailable();
    }
    healthCheck() {
        return notAvailable();
    }
    repair() {
        return notAvailable();
    }
    getSchemaVersion() {
        return notAvailable();
    }
}
