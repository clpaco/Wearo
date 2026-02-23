// Navegador principal — AuthStack vs AppStack según autenticación
import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector, useDispatch } from 'react-redux';
import { restoreSession } from '../store/authSlice';
import { useTheme } from '../hooks/useTheme';

// Pantallas
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import WardrobeScreen from '../screens/WardrobeScreen';
import AddGarmentScreen from '../screens/AddGarmentScreen';
import GarmentDetailScreen from '../screens/GarmentDetailScreen';
import OutfitsScreen from '../screens/OutfitsScreen';
import CreateOutfitScreen from '../screens/CreateOutfitScreen';
import OutfitDetailScreen from '../screens/OutfitDetailScreen';
import CalendarScreen from '../screens/CalendarScreen';

const Stack = createNativeStackNavigator();

// Stack de autenticación (sin sesión)
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

// Stack de la app (con sesión)
const AppStack = () => {
    const { theme } = useTheme();
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.colors.background },
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Wardrobe" component={WardrobeScreen} />
            <Stack.Screen name="AddGarment" component={AddGarmentScreen} />
            <Stack.Screen name="GarmentDetail" component={GarmentDetailScreen} />
            <Stack.Screen name="Outfits" component={OutfitsScreen} />
            <Stack.Screen name="CreateOutfit" component={CreateOutfitScreen} />
            <Stack.Screen name="OutfitDetail" component={OutfitDetailScreen} />
            <Stack.Screen name="Calendar" component={CalendarScreen} />
        </Stack.Navigator>
    );
};

// Navegador raíz
const AppNavigator = () => {
    const dispatch = useDispatch();
    const { isAuthenticated, isRestoringSession } = useSelector((state) => state.auth);
    const { theme } = useTheme();

    // Intentar restaurar sesión al iniciar
    useEffect(() => {
        dispatch(restoreSession());
    }, [dispatch]);

    // Pantalla de carga mientras restaura sesión
    if (isRestoringSession) {
        return (
            <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            {isAuthenticated ? <AppStack /> : <AuthStack />}
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
