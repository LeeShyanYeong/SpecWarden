#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"


# region Configuration

export PIPELINE_MODE="${PIPELINE_MODE:-local}"    # local | azure
export DEPLOY_ENABLED="${DEPLOY_ENABLED:-true}"  # true  | false
export CLEANUP_AFTER="${CLEANUP_AFTER:-false}"   # true  | false

STAGE_COMPILE=$SCRIPT_DIR/stage-compile.sh
STAGE_TEST=$SCRIPT_DIR/stage-test.sh
STAGE_ARCH=$SCRIPT_DIR/stage-arch.sh
STAGE_DEPLOY=$SCRIPT_DIR/stage-deploy.sh
STAGE_CUCUMBER=$SCRIPT_DIR/stage-cucumber.sh
STAGE_PLAYWRIGHT=$SCRIPT_DIR/stage-playwright.sh
STAGE_CLEANUP=$SCRIPT_DIR/stage-cleanup.sh

# Auto-detect whether there is anything to compile so empty templates show [SKIPPED].
_has_compile_target() {
  find src/backend -maxdepth 2 \( -name '*.slnx' -o -name '*.sln' \) 2>/dev/null | grep -q . \
    || [ -d src/frontend ]
}
HAS_COMPILE=$( _has_compile_target && echo true || echo false )


# endregion


# region Helpers

cd "$REPO_ROOT"

# Colors — disabled automatically when output is not a terminal
if [ -t 1 ]; then
  CYAN="\033[36m"; YELLOW="\033[33m"
  GREEN="\033[32m"; RED="\033[31m"; DIM="\033[2m"
  BOLD="\033[1m";  RESET="\033[0m"
else
  CYAN=""; YELLOW=""; GREEN=""; RED=""; DIM=""; BOLD=""; RESET=""
fi

STAGE_NUM=0

run_stage() {
  local name="$1"
  local script="$2"
  STAGE_NUM=$(( STAGE_NUM + 1 ))
  local start=$SECONDS

  printf "\n${YELLOW}==========================================${RESET}\n"
  printf "${YELLOW}  Stage $STAGE_NUM: $name${RESET}\n"
  printf "${YELLOW}==========================================${RESET}\n"

  if ! bash "$script"; then
    printf "\n  ${RED}${BOLD}[FAILED]${RESET} $name\n"
    exit 1
  fi

  printf "\n  ${GREEN}${BOLD}[PASSED]${RESET} $name  ($(( SECONDS - start ))s)\n"
}

run_stage_if() {
  local flag="$1"
  local name="$2"
  local script="$3"

  if [ "$flag" = "true" ]; then
    run_stage "$name" "$script"
  else
    STAGE_NUM=$(( STAGE_NUM + 1 ))
    printf "\n  ${DIM}[SKIPPED] Stage $STAGE_NUM: $name${RESET}\n"
  fi
}

# endregion


# region Pipeline

printf "${CYAN}==========================================${RESET}\n"
printf "${CYAN}  Pipeline  |  mode=$PIPELINE_MODE  deploy=$DEPLOY_ENABLED  cleanup=$CLEANUP_AFTER${RESET}\n"
printf "${CYAN}==========================================${RESET}\n"

run_stage_if "$HAS_COMPILE" "Compile"  $STAGE_COMPILE
run_stage_if "$HAS_COMPILE" "UnitTest" $STAGE_TEST
run_stage    "Architecture" $STAGE_ARCH
run_stage_if $DEPLOY_ENABLED "Deploy"  $STAGE_DEPLOY
run_stage    "Cucumber"     $STAGE_CUCUMBER
run_stage    "Playwright"   $STAGE_PLAYWRIGHT
run_stage_if $CLEANUP_AFTER  "Cleanup" $STAGE_CLEANUP

printf "\n${CYAN}==========================================${RESET}\n"
printf "${CYAN}  All $STAGE_NUM stages passed.${RESET}\n"
printf "${CYAN}==========================================${RESET}\n"

# endregion