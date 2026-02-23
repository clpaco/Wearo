// Configuración de ESLint para el frontend (React Native / Expo)
import { defineConfig } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier';

export default defineConfig([
    {
        files: ['**/*.{js,jsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                // Globales de React Native
                __DEV__: 'readonly',
                fetch: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                setInterval: 'readonly',
                clearTimeout: 'readonly',
                clearInterval: 'readonly',
                alert: 'readonly',
                require: 'readonly',
                module: 'readonly',
            },
        },
        rules: {
            // Reglas generales
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-console': 'off',
            'no-undef': 'error',
            'prefer-const': 'warn',

            // Reglas de estilo
            'semi': ['error', 'always'],
            'quotes': ['error', 'single', { avoidEscape: true }],
        },
    },
    // Desactivar reglas que entran en conflicto con Prettier
    prettierConfig,
]);
