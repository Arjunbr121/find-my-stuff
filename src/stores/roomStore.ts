/**
 * Room store - Zustand state management for rooms
 * 
 * Responsibilities:
 * - Maintain in-memory cache of rooms
 * - Provide synchronous access to data for UI
 * - Handle loading and error states
 * - Coordinate with repository for persistence
 * - Track item counts per room
 */

import { create } from 'zustand';
import { Room } from '../types/models';
import { RoomRepository } from '../types/repositories';

/**
 * Room store state interface
 */
interface RoomStore {
    rooms: Room[];
    loading: boolean;
    error: string | null;

    // Actions
    loadRooms: () => Promise<void>;
    addRoom: (roomData: Omit<Room, 'id' | 'createdAt'>) => Promise<void>;
    updateRoom: (id: string, updates: Partial<Room>) => Promise<void>;
    deleteRoom: (id: string) => Promise<void>;
    getRoomById: (id: string) => Room | undefined;
    getItemCount: (roomId: string) => number;
    clearError: () => void;
}

/**
 * Create room store with repository dependency
 * 
 * @param roomRepository - Room repository instance for data persistence
 * @param getItems - Function to get items for counting items per room
 * @returns Zustand store hook
 */
export function createRoomStore(
    roomRepository: RoomRepository,
    getItems: () => any[]
) {
    return create<RoomStore>((set, get) => ({
        rooms: [],
        loading: false,
        error: null,

        /**
         * Load all rooms from repository
         * Sets loading state and handles errors
         */
        loadRooms: async () => {
            set({ loading: true, error: null });
            try {
                const rooms = await roomRepository.getAll();
                // Sort by createdAt ascending (oldest first, as rooms are typically created in order)
                rooms.sort((a, b) => a.createdAt - b.createdAt);
                set({ rooms, loading: false });
            } catch (error) {
                set({
                    error: error instanceof Error ? error.message : 'Failed to load rooms',
                    loading: false,
                });
            }
        },

        /**
         * Add a new room
         * Creates room via repository and updates store
         */
        addRoom: async (roomData) => {
            set({ loading: true, error: null });
            try {
                const newRoom = await roomRepository.create(roomData);
                set((state) => ({
                    rooms: [...state.rooms, newRoom],
                    loading: false,
                }));
            } catch (error) {
                set({
                    error: error instanceof Error ? error.message : 'Failed to add room',
                    loading: false,
                });
                throw error;
            }
        },

        /**
         * Update an existing room
         * Updates room via repository and updates store
         */
        updateRoom: async (id, updates) => {
            set({ loading: true, error: null });
            try {
                const updatedRoom = await roomRepository.update(id, updates);
                set((state) => ({
                    rooms: state.rooms.map((room) =>
                        room.id === id ? updatedRoom : room
                    ),
                    loading: false,
                }));
            } catch (error) {
                set({
                    error: error instanceof Error ? error.message : 'Failed to update room',
                    loading: false,
                });
                throw error;
            }
        },

        /**
         * Delete a room
         * Deletes room via repository and updates store
         * Will throw RoomNotEmptyError if room contains items
         */
        deleteRoom: async (id) => {
            set({ loading: true, error: null });
            try {
                await roomRepository.delete(id);
                set((state) => ({
                    rooms: state.rooms.filter((room) => room.id !== id),
                    loading: false,
                }));
            } catch (error) {
                set({
                    error: error instanceof Error ? error.message : 'Failed to delete room',
                    loading: false,
                });
                throw error;
            }
        },

        /**
         * Get room by ID
         * Synchronous operation on in-memory data
         * 
         * @param id - Room ID
         * @returns Room if found, undefined otherwise
         */
        getRoomById: (id) => {
            const { rooms } = get();
            return rooms.find((room) => room.id === id);
        },

        /**
         * Get count of items in a room
         * Synchronous operation on in-memory data
         * 
         * @param roomId - Room ID
         * @returns Number of items in the room
         */
        getItemCount: (roomId) => {
            const items = getItems();
            return items.filter((item: any) => item.roomId === roomId).length;
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
 * Type for the room store hook
 */
export type UseRoomStore = ReturnType<typeof createRoomStore>;
