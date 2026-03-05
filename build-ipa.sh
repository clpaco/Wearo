#!/bin/bash
# Script para generar Wearo.ipa sin firma en Mac
# Tu amigo solo tiene que ejecutar: bash build-ipa.sh

set -e

echo "=== Wearo iOS Build ==="
echo ""

# Verificar que estamos en Mac
if [[ "$(uname)" != "Darwin" ]]; then
  echo "ERROR: Este script solo funciona en macOS"
  exit 1
fi

# Verificar Xcode
if ! command -v xcodebuild &> /dev/null; then
  echo "ERROR: Xcode no esta instalado. Instalalo desde la App Store."
  exit 1
fi

# Verificar Node
if ! command -v node &> /dev/null; then
  echo "Node.js no encontrado. Instalando con brew..."
  if command -v brew &> /dev/null; then
    brew install node
  else
    echo "ERROR: Instala Node.js desde https://nodejs.org"
    exit 1
  fi
fi

echo "1/5 - Instalando dependencias..."
cd frontend
npm install

echo "2/5 - Generando proyecto nativo iOS..."
npx expo prebuild --platform ios --clean

echo "3/5 - Instalando pods..."
cd ios
pod install

echo "4/5 - Compilando para iPhone (arm64)... Esto tarda 5-10 minutos"
xcodebuild -workspace Wearo.xcworkspace \
  -scheme Wearo \
  -configuration Release \
  -sdk iphoneos \
  -arch arm64 \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" \
  -derivedDataPath build \
  -quiet

echo "5/5 - Creando .ipa..."
cd ..
mkdir -p Payload
cp -r ios/build/Build/Products/Release-iphoneos/Wearo.app Payload/
zip -r ../Wearo.ipa Payload
rm -rf Payload

echo ""
echo "=== LISTO ==="
echo "El archivo Wearo.ipa esta en: $(cd .. && pwd)/Wearo.ipa"
echo "Envialo a tu iPhone e instalalo con TrollStore o Sideloadly"
