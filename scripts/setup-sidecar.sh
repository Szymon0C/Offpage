#!/bin/bash
set -e

LLAMA_VERSION="b7472"
BINARIES_DIR="src-tauri/binaries"
mkdir -p "$BINARIES_DIR"

TARGET=$(rustc --print host-tuple 2>/dev/null || rustc -Vv 2>/dev/null | grep 'host:' | cut -d' ' -f2 || echo "unknown")

echo "Detected target: $TARGET"
echo "Setting up llama-server for Offpage..."

case "$TARGET" in
  aarch64-apple-darwin)
    ARCHIVE="llama-${LLAMA_VERSION}-bin-macos-arm64.tar.gz"
    URL="https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_VERSION}/${ARCHIVE}"
    ;;
  x86_64-apple-darwin)
    ARCHIVE="llama-${LLAMA_VERSION}-bin-macos-x64.tar.gz"
    URL="https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_VERSION}/${ARCHIVE}"
    ;;
  x86_64-pc-windows-msvc)
    ARCHIVE="llama-${LLAMA_VERSION}-bin-win-vulkan-x64.zip"
    URL="https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_VERSION}/${ARCHIVE}"
    ;;
  *)
    echo "Unsupported platform: $TARGET"
    exit 1
    ;;
esac

DEST="$BINARIES_DIR/llama-server-$TARGET"
if [ "$TARGET" = "x86_64-pc-windows-msvc" ]; then
  DEST="${DEST}.exe"
fi

if [ -f "$DEST" ]; then
  echo "llama-server already exists at $DEST"
  exit 0
fi

echo "Downloading $URL..."
TMP_DIR=$(mktemp -d)
curl -L -o "$TMP_DIR/$ARCHIVE" "$URL"

echo "Extracting..."
case "$ARCHIVE" in
  *.tar.gz)
    tar -xzf "$TMP_DIR/$ARCHIVE" -C "$TMP_DIR"
    find "$TMP_DIR" -name "llama-server" -type f | head -n 1 | xargs -I {} cp {} "$DEST"
    ;;
  *.zip)
    unzip -o "$TMP_DIR/$ARCHIVE" -d "$TMP_DIR/extracted"
    cp "$TMP_DIR/extracted/build/bin/llama-server.exe" "$DEST"
    ;;
esac

chmod +x "$DEST"
rm -rf "$TMP_DIR"

echo "llama-server installed at $DEST"
