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
  echo "Verifying shared libraries..."
  MISSING_LIBS=false
  case "$TARGET" in
    *apple-darwin)
      for lib in libmtmd.0.dylib libllama.0.dylib libggml.0.dylib libggml-cpu.0.dylib libggml-base.0.dylib libggml-metal.0.dylib; do
        if [ ! -f "$BINARIES_DIR/$lib" ]; then
          MISSING_LIBS=true
          break
        fi
      done
      ;;
  esac
  if [ "$MISSING_LIBS" = "false" ]; then
    echo "All libraries present. Setup complete!"
    exit 0
  fi
  echo "Some libraries missing, re-downloading..."
fi

echo "Downloading $URL..."
TMP_DIR=$(mktemp -d)
curl -L -o "$TMP_DIR/$ARCHIVE" "$URL"

echo "Extracting..."
case "$ARCHIVE" in
  *.tar.gz)
    tar -xzf "$TMP_DIR/$ARCHIVE" -C "$TMP_DIR"

    # Copy the llama-server binary
    find "$TMP_DIR" -name "llama-server" -type f | head -n 1 | xargs -I {} cp {} "$DEST"

    # Copy all shared libraries (.dylib) needed by llama-server
    # Create both versioned and short-name copies (e.g., libfoo.0.9.4.dylib AND libfoo.0.dylib)
    echo "Copying shared libraries..."
    find "$TMP_DIR" -name "*.dylib" -type f | while read -r lib; do
      libname=$(basename "$lib")
      cp "$lib" "$BINARIES_DIR/$libname"
      echo "  Copied $libname"

      # Create short-name copy: libfoo.X.Y.Z.dylib -> libfoo.X.dylib
      short=$(echo "$libname" | sed -E 's/^(lib[^.]+\.[0-9]+)\..*/\1.dylib/')
      if [ "$short" != "$libname" ]; then
        cp "$lib" "$BINARIES_DIR/$short"
        echo "  Created $short"
      fi
    done

    # Also copy Metal shader file if present
    find "$TMP_DIR" -name "*.metal" -type f | while read -r metal; do
      metalname=$(basename "$metal")
      cp "$metal" "$BINARIES_DIR/$metalname"
      echo "  Copied $metalname"
    done

    # Fix @rpath references to @loader_path so binary finds libs next to itself
    echo "Fixing library load paths..."
    if command -v install_name_tool >/dev/null 2>&1; then
      otool -L "$DEST" 2>/dev/null | grep '@rpath' | awk '{print $1}' | while read -r rpath_ref; do
        new_ref=$(echo "$rpath_ref" | sed 's|@rpath|@loader_path|')
        install_name_tool -change "$rpath_ref" "$new_ref" "$DEST" 2>/dev/null || true
        echo "  Fixed $rpath_ref -> $new_ref"
      done

      # Fix cross-references between dylibs
      find "$BINARIES_DIR" -name "*.dylib" -type f | while read -r lib; do
        otool -L "$lib" 2>/dev/null | grep '@rpath' | awk '{print $1}' | while read -r rpath_ref; do
          new_ref=$(echo "$rpath_ref" | sed 's|@rpath|@loader_path|')
          install_name_tool -change "$rpath_ref" "$new_ref" "$lib" 2>/dev/null || true
        done
      done
    fi
    ;;
  *.zip)
    unzip -o "$TMP_DIR/$ARCHIVE" -d "$TMP_DIR/extracted"
    cp "$TMP_DIR/extracted/build/bin/llama-server.exe" "$DEST"

    # Copy all DLLs needed by llama-server on Windows
    echo "Copying DLL files..."
    find "$TMP_DIR/extracted" -name "*.dll" -type f | while read -r dll; do
      dllname=$(basename "$dll")
      cp "$dll" "$BINARIES_DIR/$dllname"
      echo "  Copied $dllname"
    done
    ;;
esac

chmod +x "$DEST"
rm -rf "$TMP_DIR"

# Create symlink without target triple (for convenience)
LINK="$BINARIES_DIR/llama-server"
if [ "$TARGET" = "x86_64-pc-windows-msvc" ]; then
  LINK="${LINK}.exe"
fi
ln -sf "$(basename "$DEST")" "$LINK" 2>/dev/null || true

echo "llama-server installed at $DEST"
echo "Setup complete!"
