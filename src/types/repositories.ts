/**
 * Repository layer interfaces
 * Business logic layer between stores and storage
 */

import { Item, Room } from './models';

/**
 * Item repository interface
 * Handles business logic for item operations including image management
 */
export interface ItemRepository {
  create(itemData: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Promise<Item>;
  update(id: string, updates: Partial<Item>): Promise<Item>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<Item | null>;
  getAll(): Promise<Item[]>;
  getByRoom(roomId: string): Promise<Item[]>;
  search(query: string): Promise<Item[]>;
  saveImage(uri: string): Promise<{ imageUri: string; thumbnailUri: string }>;
  deleteImage(uri: string): Promise<void>;
}

/**
 * Room repository interface
 * Handles business logic for room operations
 */
export interface RoomRepository {
  create(roomData: Omit<Room, 'id' | 'createdAt'>): Promise<Room>;
  update(id: string, updates: Partial<Room>): Promise<Room>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<Room | null>;
  getAll(): Promise<Room[]>;
  getItemCount(roomId: string): Promise<number>;
}
