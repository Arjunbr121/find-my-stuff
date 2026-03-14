import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import {
    HomeScreen,
    RoomsScreen,
    AddItemScreen,
    ItemDetailScreen,
    AddRoomScreen,
    RoomDetailScreen,
    SettingsScreen,
} from '../screens';

// Import navigation types
import type { RootStackParamList, BottomTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<BottomTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

/**
 * Bottom Tab Navigator
 * Contains three main tabs: Home, Rooms, Settings
 */
function BottomTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: keyof typeof Ionicons.glyphMap;

                    if (route.name === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Rooms') {
                        iconName = focused ? 'grid' : 'grid-outline';
                    } else if (route.name === 'Settings') {
                        iconName = focused ? 'settings' : 'settings-outline';
                    } else {
                        iconName = 'help-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#4ECDC4',
                tabBarInactiveTintColor: 'gray',
                headerShown: false,
            })}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{ title: 'My Items' }}
            />
            <Tab.Screen
                name="Rooms"
                component={RoomsScreen}
                options={{ title: 'Rooms' }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ title: 'Settings' }}
            />
        </Tab.Navigator>
    );
}

/**
 * Root Stack Navigator
 * Contains bottom tabs and modal/detail screens
 */
function RootNavigator() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: true,
                headerStyle: {
                    backgroundColor: '#4ECDC4',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
            }}
        >
            <Stack.Screen
                name="MainTabs"
                component={BottomTabNavigator}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="AddItem"
                component={AddItemScreen}
                options={{
                    title: 'Add Item',
                    presentation: 'modal'
                }}
            />
            <Stack.Screen
                name="ItemDetail"
                component={ItemDetailScreen}
                options={{ title: 'Item Details' }}
            />
            <Stack.Screen
                name="AddRoom"
                component={AddRoomScreen}
                options={{
                    title: 'Add Room',
                    presentation: 'modal'
                }}
            />
            <Stack.Screen
                name="RoomDetail"
                component={RoomDetailScreen}
                options={{ title: 'Room Details' }}
            />
        </Stack.Navigator>
    );
}

/**
 * Main Navigation Component
 * Wraps the root navigator in NavigationContainer
 */
export default function Navigation() {
    return (
        <NavigationContainer>
            <RootNavigator />
        </NavigationContainer>
    );
}
