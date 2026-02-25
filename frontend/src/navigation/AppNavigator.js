// Navegador principal — AuthStack vs AppTabs según autenticación
import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { restoreSession } from '../store/authSlice';
import { fetchMyProfile } from '../store/profileSlice';
import { useTheme } from '../hooks/useTheme';

// Pantallas
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import StatsScreen from '../screens/StatsScreen';
import WardrobeScreen from '../screens/WardrobeScreen';
import AddGarmentScreen from '../screens/AddGarmentScreen';
import GarmentDetailScreen from '../screens/GarmentDetailScreen';
import OutfitsScreen from '../screens/OutfitsScreen';
import CreateOutfitScreen from '../screens/CreateOutfitScreen';
import OutfitDetailScreen from '../screens/OutfitDetailScreen';
import CalendarScreen from '../screens/CalendarScreen';
import SocialScreen from '../screens/SocialScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ChatScreen from '../screens/ChatScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const stackOptions = {
    headerShown: false,
    animation: 'slide_from_right',
};

// ── Stacks internos de cada tab ───────────────────────────────────────────────

const HomeStack = () => (
    <Stack.Navigator screenOptions={stackOptions}>
        <Stack.Screen name="HomeScreen" component={HomeScreen} />
        <Stack.Screen name="Stats" component={StatsScreen} />
    </Stack.Navigator>
);

const WardrobeStack = () => (
    <Stack.Navigator screenOptions={stackOptions}>
        <Stack.Screen name="WardrobeScreen" component={WardrobeScreen} />
        <Stack.Screen name="AddGarment" component={AddGarmentScreen} />
        <Stack.Screen name="GarmentDetail" component={GarmentDetailScreen} />
    </Stack.Navigator>
);

const OutfitsStack = () => (
    <Stack.Navigator screenOptions={stackOptions}>
        <Stack.Screen name="OutfitsScreen" component={OutfitsScreen} />
        <Stack.Screen name="CreateOutfit" component={CreateOutfitScreen} />
        <Stack.Screen name="OutfitDetail" component={OutfitDetailScreen} />
    </Stack.Navigator>
);

const CalendarStack = () => (
    <Stack.Navigator screenOptions={stackOptions}>
        <Stack.Screen name="CalendarScreen" component={CalendarScreen} />
    </Stack.Navigator>
);

const SocialStack = () => (
    <Stack.Navigator screenOptions={stackOptions}>
        <Stack.Screen name="SocialScreen" component={SocialScreen} />
        <Stack.Screen name="UserProfile" component={ProfileScreen} />
        <Stack.Screen name="Messages" component={MessagesScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
);

const ProfileStack = () => (
    <Stack.Navigator screenOptions={stackOptions}>
        <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="UserProfile" component={ProfileScreen} />
        <Stack.Screen name="Messages" component={MessagesScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
);

// ── Bottom Tab Navigator ──────────────────────────────────────────────────────

const AppTabs = () => {
    const { theme } = useTheme();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.colors.tabBar,
                    borderTopColor: theme.colors.tabBarBorder,
                    borderTopWidth: 1,
                    height: Platform.OS === 'ios' ? 84 : 60,
                    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
                    paddingTop: 8,
                    ...theme.colors.shadowLg,
                },
                tabBarActiveTintColor: theme.colors.tabActive,
                tabBarInactiveTintColor: theme.colors.tabInactive,
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '500',
                },
                tabBarIcon: ({ color, size, focused }) => {
                    const icons = {
                        Inicio: focused ? 'home' : 'home-outline',
                        Armario: focused ? 'shirt' : 'shirt-outline',
                        Outfits: focused ? 'albums' : 'albums-outline',
                        Calendario: focused ? 'calendar' : 'calendar-outline',
                        Social: focused ? 'people' : 'people-outline',
                        Perfil: focused ? 'person-circle' : 'person-circle-outline',
                    };
                    return <Ionicons name={icons[route.name]} size={22} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Inicio" component={HomeStack} />
            <Tab.Screen name="Armario" component={WardrobeStack} />
            <Tab.Screen name="Outfits" component={OutfitsStack} />
            <Tab.Screen name="Calendario" component={CalendarStack} />
            <Tab.Screen name="Social" component={SocialStack} />
            <Tab.Screen name="Perfil" component={ProfileStack} />
        </Tab.Navigator>
    );
};

// ── Auth Stack ────────────────────────────────────────────────────────────────

const AuthStack = () => {
    const { theme } = useTheme();
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.colors.background },
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
    );
};

// ── Navegador raíz ────────────────────────────────────────────────────────────

const AppNavigator = () => {
    const dispatch = useDispatch();
    const { isAuthenticated, isRestoringSession, user } = useSelector((state) => state.auth);
    const { myProfile } = useSelector((state) => state.profile);
    const { theme } = useTheme();

    useEffect(() => {
        dispatch(restoreSession());
    }, [dispatch]);

    // Fetch profile when authenticated to check onboarding
    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchMyProfile());
        }
    }, [dispatch, isAuthenticated]);

    if (isRestoringSession) {
        return (
            <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    const needsOnboarding = isAuthenticated && myProfile && myProfile.onboarding_done === false;

    return (
        <NavigationContainer>
            {!isAuthenticated ? (
                <AuthStack />
            ) : needsOnboarding ? (
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                    <Stack.Screen name="AppTabs" component={AppTabs} />
                </Stack.Navigator>
            ) : (
                <AppTabs />
            )}
        </NavigationContainer>
    );
};

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default AppNavigator;
