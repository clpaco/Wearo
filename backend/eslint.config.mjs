// Configuración de ESLint para el backend (Node.js / Express)
import prettierConfig from 'eslint-config-prettier';

export default [
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'commonjs',
            globals: {
                // Globales de Node.js
                process: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                console: 'readonly',
                module: 'writable',
                require: 'readonly',
                exports: 'writable',
                Buffer: 'readonly',
                setTimeout: 'readonly',
                setInterval: 'readonly',
                clearTimeout: 'readonly',
                clearInterval: 'readonly',
            },
        },
        rules: {
            // Reglas generales
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-console': 'off',
            'no-undef': 'error',
            'prefer-const': 'warn',
            'no-var': 'error',

            // Reglas de estilo
            'semi': ['error', 'always'],
            'quotes': ['error', 'single', { avoidEscape: true }],
            'eqeqeq': ['error', 'always'],
        },
    },
    // Desactivar reglas que entran en conflicto con Prettier
    prettierConfig,
];
