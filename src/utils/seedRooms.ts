/**
 * Seeds default rooms on first launch.
 * Checks a flag in storage so it only runs once.
 */

import { RoomRepository } from '../types/repositories';
import SecureStore from './secureStorage';

const SEED_KEY = 'default_rooms_seeded';

const DEFAULT_ROOMS = [
    { name: 'Kitchen',      icon: 'kitchen',      color: '#FF6B6B', description: 'Kitchen area' },
    { name: 'Toilet',       icon: 'bathroom',     color: '#45B7D1', description: 'Bathroom / toilet' },
    { name: 'Bedroom 1',    icon: 'bedroom',      color: '#4ECDC4', description: 'Master bedroom' },
    { name: 'Bedroom 2',    icon: 'bedroom',      color: '#BB8FCE', description: 'Second bedroom' },
    { name: 'Living Room',  icon: 'living-room',  color: '#F7DC6F', description: 'Living / lounge area' },
];

export async function seedDefaultRooms(roomRepository: RoomRepository): Promise<void> {
    const already = await SecureStore.getItemAsync(SEED_KEY);
    if (already === 'true') return;

    for (const room of DEFAULT_ROOMS) {
        try {
            await roomRepository.create(room);
        } catch {
            // Room may already exist (e.g. name collision) — skip silently
        }
    }

    await SecureStore.setItemAsync(SEED_KEY, 'true');
}
