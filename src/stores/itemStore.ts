/**
 * Item store - Zustand state management for items
 * 
 * Responsibilities:
 * - Maintain in-memory cache of items
 * - Provide synchronous access to data for UI
 * - Handle loading and error states
 * - Coordinate with repository for persistence
 * - Implement client-side search and filtering
 */

import { create } from 'zustand';
import { Item } from '../types/models';
import { ItemRepository } from '../types/repositories';
import { fuzzySearch } from '../utils/search';

/**
 * Item store state interface
 */
interface ItemStore {
    items: Item[];
    loading: boolean;
    error: string | null;
    totalCount: number;
    hasMore: boolean;

    // Actions
    loadItems: () => Promise<void>;
    loadItemsBatch: (offset: number, limit: number) => Promise<void>;
    loadMoreItems: () => Promise<void>;
    addItem: (itemData: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateItem: (id: string, updates: Partial<Item>) => Promise<void>;
    deleteItem: (id: string) => Promise<void>;
    searchItems: (query: string) => Item[];
    getItemsByRoom: (roomId: string) => Item[];
    clearError: () => void;
}

/**
 * Create item store with repository dependency
 * 
 * @param itemRepository - Item repository instance for data persistence
 * @param getRooms - Function to get rooms for search functionality
 * @returns Zustand store hook
 */
export function createItemStore(
    itemRepository: ItemRepository,
    getRooms: () => any[]
) {
    return create<ItemStore>((set, get) => ({
        items: [],
        loading: false,
        error: null,
        totalCount: 0,
        hasMore: true,

        /**
         * Load all items from repository
         * Sets loading state and handles errors
         */
        loadItems: async () => {
            set({ loading: true, error: null });
            try {
                const items = await itemRepository.getAll();
                // Sort by updatedAt descending (most recent first)
                items.sort((a, b) => b.updatedAt - a.updatedAt);
                set({
                    items,
                    loading: false,
                    totalCount: items.length,
                    hasMore: false
                });
            } catch (error) {
                set({
                    error: error instanceof Error ? error.message : 'Failed to load items',
                    loading: false,
                });
            }
        },

        /**
         * Load items in batches for progressive loading
         * Used for large datasets (10,000+ items)
         * 
         * @param offset - Starting index
         * @param limit - Number of items to fetch (default: 1000)
         */
        loadItemsBatch: async (offset, limit = 1000) => {
            set({ loading: true, error: null });
            try {
                const batch = await itemRepository.getAll(); // TODO: Implement batch loading in repository
                const sortedBatch = batch.slice(offset, offset + limit);
                sortedBatch.sort((a, b) => b.updatedAt - a.updatedAt);

                set((state) => ({
                    items: offset === 0 ? sortedBatch : [...state.items, ...sortedBatch],
                    loading: false,
                    hasMore: sortedBatch.length === limit,
                }));
            } catch (error) {
                set({
                    error: error instanceof Error ? error.message : 'Failed to load items batch',
                    loading: false,
                });
            }
        },

        /**
         * Load more items (pagination)
         * Automatically calculates offset based on current items
         */
        loadMoreItems: async () => {
            const { items, hasMore, loading } = get();
            if (!hasMore || loading) return;

            const offset = items.length;
            await get().loadItemsBatch(offset, 1000);
        },

        /**
         * Add a new item
         * Creates item via repository and updates store
         */
        addItem: async (itemData) => {
            set({ loading: true, error: null });
            try {
                const newItem = await itemRepository.create(itemData);
                set((state) => ({
                    items: [newItem, ...state.items],
                    loading: false,
                }));
            } catch (error) {
                set({
                    error: error instanceof Error ? error.message : 'Failed to add item',
                    loading: false,
                });
                throw error;
            }
        },

        /**
         * Update an existing item
         * Updates item via repository and updates store
         */
        updateItem: async (id, updates) => {
            set({ loading: true, error: null });
            try {
                const updatedItem = await itemRepository.update(id, updates);
                set((state) => ({
                    items: state.items.map((item) =>
                        item.id === id ? updatedItem : item
                    ),
                    loading: false,
                }));
            } catch (error) {
                set({
                    error: error instanceof Error ? error.message : 'Failed to update item',
                    loading: false,
                });
                throw error;
            }
        },

        /**
         * Delete an item
         * Deletes item via repository and updates store
         */
        deleteItem: async (id) => {
            set({ loading: true, error: null });
            try {
                await itemRepository.delete(id);
                set((state) => ({
                    items: state.items.filter((item) => item.id !== id),
                    loading: false,
                }));
            } catch (error) {
                set({
                    error: error instanceof Error ? error.message : 'Failed to delete item',
                    loading: false,
                });
                throw error;
            }
        },

        /**
         * Search items using fuzzy search algorithm
         * Synchronous operation on in-memory data
         * 
         * @param query - Search query string
         * @returns Filtered and sorted items
         */
        searchItems: (query) => {
            const { items } = get();
            const rooms = getRooms();
            return fuzzySearch(items, query, rooms);
        },

        /**
         * Get items by room ID
         * Synchronous operation on in-memory data
         * 
         * @param roomId - Room ID to filter by
         * @returns Items in the specified room
         */
        getItemsByRoom: (roomId) => {
            const { items } = get();
            return items.filter((item) => item.roomId === roomId);
        },

        /**
         * Clear error state
         */
        clearError: () => {
            set({ error: null });
        },
    }));
}

/**
 * Type for the item store hook
 */
export type UseItemStore = ReturnType<typeof createItemStore>;
