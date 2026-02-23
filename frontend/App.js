// App principal — envuelta con Redux Provider y ThemeProvider
import React from 'react';
import { Provider } from 'react-redux';
import store from './src/store';
import { ThemeProvider } from './src/hooks/useTheme';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <AppNavigator />
      </ThemeProvider>
    </Provider>
  );
}
