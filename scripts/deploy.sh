#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Pass your Car Thing's adb serial: DEVICE=<serial> npm run deploy
DEVICE="${DEVICE:?set DEVICE to your adb device serial (see: adb devices)}"
APPDIR="54868c4c1a364680a16b426eb379f171"
TARGET="/var/bridgething/webapps/$APPDIR"

npm run build
adb -s "$DEVICE" shell "rm -rf $TARGET && mkdir -p $TARGET"
adb -s "$DEVICE" push dist/. "$TARGET/"
adb -s "$DEVICE" shell "systemctl restart bridgething"
echo "deployed to $TARGET; restart issued"
