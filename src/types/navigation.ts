import type { NavigationProp, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

/**
 * Bottom Tab Navigator Parameter List
 * Defines the screens in the bottom tab navigator and their parameters
 */
export type BottomTabParamList = {
    Home: undefined;
    Rooms: undefined;
    Settings: undefined;
};

/**
 * Root Stack Navigator Parameter List
 * Defines all screens in the app and their parameters
 */
export type RootStackParamList = {
    MainTabs: undefined;
    AddItem: undefined;
    ItemDetail: {
        itemId: string;
    };
    AddRoom: undefined;
    RoomDetail: {
        roomId: string;
    };
    ClearInventory: undefined; 
    ManageCategoriesScreen:undefined;
    EditProfile: undefined;
    ChangePassword: undefined;
    About: undefined;
    FAQ:   undefined;
};

/**
 * Navigation prop types for each screen
 * Use these types in screen components to get type-safe navigation
 */

// Bottom Tab Screen Navigation Props
export type HomeScreenNavigationProp = BottomTabNavigationProp<
    BottomTabParamList,
    'Home'
>;

export type RoomsScreenNavigationProp = BottomTabNavigationProp<
    BottomTabParamList,
    'Rooms'
>;

export type SettingsScreenNavigationProp = BottomTabNavigationProp<
    BottomTabParamList,
    'Settings'
>;

// Stack Screen Navigation Props
export type AddItemScreenNavigationProp = StackNavigationProp<
    RootStackParamList,
    'AddItem'
>;

export type ItemDetailScreenNavigationProp = StackNavigationProp<
    RootStackParamList,
    'ItemDetail'
>;

export type AddRoomScreenNavigationProp = StackNavigationProp<
    RootStackParamList,
    'AddRoom'
>;

export type RoomDetailScreenNavigationProp = StackNavigationProp<
    RootStackParamList,
    'RoomDetail'
>;

/**
 * Route prop types for each screen
 * Use these types to access route parameters in screen components
 */

export type ItemDetailScreenRouteProp = RouteProp<
    RootStackParamList,
    'ItemDetail'
>;

export type RoomDetailScreenRouteProp = RouteProp<
    RootStackParamList,
    'RoomDetail'
>;

/**
 * Combined prop types for screen components
 * Use these in screen component props for full type safety
 */

export type HomeScreenProps = {
    navigation: HomeScreenNavigationProp;
};

export type RoomsScreenProps = {
    navigation: RoomsScreenNavigationProp;
};

export type SettingsScreenProps = {
    navigation: SettingsScreenNavigationProp;
};

export type AddItemScreenProps = {
    navigation: AddItemScreenNavigationProp;
};

export type ItemDetailScreenProps = {
    navigation: ItemDetailScreenNavigationProp;
    route: ItemDetailScreenRouteProp;
};

export type AddRoomScreenProps = {
    navigation: AddRoomScreenNavigationProp;
};

export type RoomDetailScreenProps = {
    navigation: RoomDetailScreenNavigationProp;
    route: RoomDetailScreenRouteProp;
};

/**
 * Generic navigation prop type
 * Use this when you need to navigate from any screen
 */
export type RootNavigationProp = NavigationProp<RootStackParamList>;

/**
 * Declare global types for React Navigation
 * This enables type checking for useNavigation() hook without explicit typing
 */
declare global {
    namespace ReactNavigation {
        interface RootParamList extends RootStackParamList { }
    }
}
