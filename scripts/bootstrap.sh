#!/usr/bin/env bash
# Bootstrap — installs required system tools for a fresh clone.
# Safe to re-run; each check is idempotent.
#
# Usage:
#   bash scripts/bootstrap.sh        # prompts for sudo password when needed
#   sudo bash scripts/bootstrap.sh   # no password prompts; runs everything as root
#                                    # (user-local tools still install to the real
#                                    # user's home via SUDO_USER detection)
#
# Tools installed:
#   .NET SDK  → $REAL_HOME/.dotnet   (via Microsoft's dotnet-install.sh)
#   Node.js   → $REAL_HOME/.nvm      (via nvm)
#   Podman    → system-wide          (via apt)
#
# Required versions are pinned in:
#   global.json  → .NET SDK channel
#   .nvmrc       → Node major version
#
# Project packages (dotnet restore, npm ci) are intentionally NOT here —
# they belong in the compile stage (scripts/stage-compile.sh).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# ── Sudo-aware user context ───────────────────────────────────────────────────
# When run via `sudo bash bootstrap.sh`, HOME becomes /root. We detect the real
# caller via SUDO_USER so user-local tools (.dotnet, .nvm) land in their home.
if [ -n "${SUDO_USER:-}" ]; then
  REAL_USER="$SUDO_USER"
  REAL_HOME="$(getent passwd "$SUDO_USER" | cut -d: -f6)"
else
  REAL_USER="$(id -un)"
  REAL_HOME="$HOME"
fi

# Run a command as the real (non-root) user when we are currently root.
_as_user() {
  if [ "$(id -u)" -eq 0 ]; then
    sudo -u "$REAL_USER" HOME="$REAL_HOME" "$@"
  else
    "$@"
  fi
}

# Run a command with root privileges, or plain if already root.
_sudo() {
  [ "$(id -u)" -eq 0 ] && "$@" || sudo "$@"
}

# ── Version requirements (keep in sync with global.json and .nvmrc) ───────────
DOTNET_CHANNEL="10.0"
DOTNET_MIN_MAJOR=10
NODE_MIN_MAJOR=22

# ── Terminal colours (suppressed when not a tty) ──────────────────────────────
if [ -t 1 ]; then
  GREEN="\033[32m"; YELLOW="\033[33m"; CYAN="\033[36m"; RED="\033[31m"; RESET="\033[0m"
else
  GREEN=""; YELLOW=""; CYAN=""; RED=""; RESET=""
fi

ok()   { printf "  ${GREEN}✓${RESET}  %s\n" "$1"; }
info() { printf "  ${CYAN}…${RESET}  %s\n"  "$1"; }
warn() { printf "  ${YELLOW}!${RESET}  %s\n" "$1"; }
fail() { printf "\n  ${RED}✗ FATAL:${RESET} %s\n" "$1"; exit 1; }

printf "\n${CYAN}══ Bootstrap: system tools ══════════════════════════════════════${RESET}\n"

# ── .NET SDK ──────────────────────────────────────────────────────────────────

_install_dotnet() {
  info "Downloading dotnet-install.sh from Microsoft..."
  local tmp; tmp="$(mktemp -d)"

  if command -v curl &>/dev/null; then
    curl -fsSL https://dot.net/v1/dotnet-install.sh -o "$tmp/dotnet-install.sh"
  elif command -v wget &>/dev/null; then
    wget -qO "$tmp/dotnet-install.sh" https://dot.net/v1/dotnet-install.sh
  else
    fail "Neither curl nor wget found — install one and retry."
  fi

  chmod +x "$tmp/dotnet-install.sh"
  HOME="$REAL_HOME" _as_user bash "$tmp/dotnet-install.sh" \
    --channel "$DOTNET_CHANNEL" --install-dir "${REAL_HOME}/.dotnet"
  rm -rf "$tmp"

  export DOTNET_ROOT="${REAL_HOME}/.dotnet"
  export PATH="${DOTNET_ROOT}:${DOTNET_ROOT}/tools:${PATH}"
  ok ".NET SDK $(dotnet --version) installed to ${REAL_HOME}/.dotnet"
  warn "Add to your shell profile so this persists across sessions:"
  warn "  export DOTNET_ROOT=\"\${HOME}/.dotnet\""
  warn "  export PATH=\"\${DOTNET_ROOT}:\${DOTNET_ROOT}/tools:\${PATH}\""
}

check_dotnet() {
  if ! command -v dotnet &>/dev/null && [ -x "${REAL_HOME}/.dotnet/dotnet" ]; then
    export DOTNET_ROOT="${REAL_HOME}/.dotnet"
    export PATH="${DOTNET_ROOT}:${DOTNET_ROOT}/tools:${PATH}"
  fi

  if ! command -v dotnet &>/dev/null; then
    warn ".NET SDK not found — installing ${DOTNET_CHANNEL}..."
    _install_dotnet
    return
  fi

  local major; major="$(dotnet --version | cut -d. -f1)"
  if [ "${major}" -ge "${DOTNET_MIN_MAJOR}" ] 2>/dev/null; then
    ok ".NET SDK $(dotnet --version)"
  else
    warn ".NET SDK $(dotnet --version) found but need ${DOTNET_MIN_MAJOR}+ — installing..."
    _install_dotnet
  fi
}

# ── Node.js via nvm ───────────────────────────────────────────────────────────

_activate_nvm() {
  # shellcheck source=/dev/null
  if [ -f "${REAL_HOME}/.nvm/nvm.sh" ]; then
    export NVM_DIR="${REAL_HOME}/.nvm"
    # nvm.sh may run commands that fail on WSL (Windows npm bleed-through);
    # disable errexit so a non-zero inside nvm.sh doesn't kill bootstrap.
    set +e
    source "${REAL_HOME}/.nvm/nvm.sh"
    set -e
  fi
}

_install_nvm() {
  info "Installing nvm..."
  if command -v curl &>/dev/null; then
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh \
      | HOME="$REAL_HOME" _as_user bash
  elif command -v wget &>/dev/null; then
    wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh \
      | HOME="$REAL_HOME" _as_user bash
  else
    fail "Neither curl nor wget found — install one and retry."
  fi
  _activate_nvm
  type nvm &>/dev/null || fail "nvm installed but not available — restart your shell and re-run bootstrap."
}

check_node() {
  _activate_nvm

  type nvm &>/dev/null || _install_nvm

  if nvm use "${NODE_MIN_MAJOR}" &>/dev/null 2>&1; then
    ok "Node.js $(node --version) / npm $(npm --version)"
    return
  fi

  info "Installing Node.js ${NODE_MIN_MAJOR} via nvm (this may take a minute)..."
  # On WSL, Windows npm may bleed through and make nvm exit non-zero even
  # after a successful node install. Treat as success if the binary exists.
  nvm install "${NODE_MIN_MAJOR}" 2>&1 | grep -v "^npm " || true
  nvm use "${NODE_MIN_MAJOR}" || true
  command -v node &>/dev/null || fail "Node.js ${NODE_MIN_MAJOR} installation failed — check nvm output above."

  ok "Node.js $(node --version) / npm $(npm --version)"
  warn "Add to your shell profile so nvm loads on start:"
  warn "  export NVM_DIR=\"\${HOME}/.nvm\""
  warn "  [ -s \"\${NVM_DIR}/nvm.sh\" ] && . \"\${NVM_DIR}/nvm.sh\""
}

# ── Podman (container runtime) ────────────────────────────────────────────────

_install_podman_linux() {
  info "Installing Podman via apt..."
  _sudo apt-get update -qq && _sudo apt-get install -y podman
  ok "Podman $(podman --version) installed"
}

check_podman() {
  if command -v podman &>/dev/null || command -v docker &>/dev/null; then
    local cli; cli="$(command -v podman || command -v docker)"
    ok "Container runtime: $cli"
    return
  fi

  case "$(uname -s)" in
    Linux)
      warn "Podman not found — installing..."
      _install_podman_linux
      ;;
    *)
      warn "Podman not found — install Podman Desktop for your OS, then re-run bootstrap."
      warn "The deploy stage (and Cucumber acceptance tests) will fail without it."
      ;;
  esac
}

# ── Playwright browser OS dependencies ───────────────────────────────────────

check_browser_deps() {
  # Chromium requires these system libraries on Linux. Missing any of them causes
  # a Playwright host-validation warning and tests fail to launch the browser.
  local missing=()
  for pkg in libnspr4 libnss3 libasound2t64; do
    dpkg -s "$pkg" &>/dev/null || missing+=("$pkg")
  done

  if [ ${#missing[@]} -eq 0 ]; then
    ok "Playwright browser OS deps present"
    return
  fi

  info "Installing missing browser OS deps: ${missing[*]}..."
  _sudo apt-get update -qq && _sudo apt-get install -y "${missing[@]}"
  ok "Browser OS deps installed"
}

check_dotnet
check_node
check_podman
check_browser_deps

printf "\n${GREEN}══ Bootstrap complete ════════════════════════════════════════════${RESET}\n"
printf "${GREEN}   Run  scripts/pipeline.sh  to build and test.${RESET}\n\n"
