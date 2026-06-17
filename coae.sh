#!/usr/bin/env bash
# COAE-Forge — start / stop the backend (FastAPI :8000) + frontend (Vite :5173).
#
#   ./coae.sh start      start both servers in the background
#   ./coae.sh stop       stop both
#   ./coae.sh restart    stop then start
#   ./coae.sh status     show what's running + URLs
#   ./coae.sh logs [be|fe]   tail logs (both, or just backend/frontend)
#
# No need to `conda activate` first — the script finds the `ai` env itself.
# Override the env name with COAE_CONDA_ENV=myenv ./coae.sh start
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$ROOT/.run"
mkdir -p "$RUN_DIR"

BACKEND_PORT="${COAE_BACKEND_PORT:-8000}"
FRONTEND_PORT="${COAE_FRONTEND_PORT:-5173}"
CONDA_ENV="${COAE_CONDA_ENV:-ai}"

BACK_PID="$RUN_DIR/backend.pid";  BACK_LOG="$RUN_DIR/backend.log"
FRONT_PID="$RUN_DIR/frontend.pid"; FRONT_LOG="$RUN_DIR/frontend.log"

c_grn="\033[32m"; c_red="\033[31m"; c_yel="\033[33m"; c_dim="\033[2m"; c_off="\033[0m"

# ---- resolve the conda env's bin dir so we can call uvicorn directly --------
ENV_BIN=""
prefix="$(conda env list 2>/dev/null | awk -v e="$CONDA_ENV" '$1==e {print $NF}')"
[ -n "$prefix" ] && [ -x "$prefix/bin/uvicorn" ] && ENV_BIN="$prefix/bin"

# ---- make sure node/npm are on PATH (nvm lives outside the default PATH) ----
if ! command -v npm >/dev/null 2>&1; then
  for d in "$HOME"/.nvm/versions/node/*/bin; do [ -d "$d" ] && PATH="$d:$PATH"; done
fi

is_running() { local f="$1"; [ -f "$f" ] && kill -0 "$(cat "$f")" 2>/dev/null; }

# Launch `$2…` detached in its own process group and record the leader PID in $1.
# `setsid bash -c 'echo $$ …; exec …'` makes the pidfile hold the true group id,
# so stopping can kill the whole tree (e.g. npm → vite → esbuild) at once.
spawn() {
  local pidfile="$1" logfile="$2"; shift 2
  setsid bash -c 'echo $$ > "$1"; shift; exec "$@"' _ "$pidfile" "$@" >"$logfile" 2>&1 &
}

start_backend() {
  if is_running "$BACK_PID"; then echo -e "${c_yel}backend already running${c_off} (pid $(cat "$BACK_PID"))"; return; fi
  echo "→ starting backend on :$BACKEND_PORT"
  cd "$ROOT/backend"
  if [ -n "$ENV_BIN" ]; then
    spawn "$BACK_PID" "$BACK_LOG" "$ENV_BIN/uvicorn" app.main:app --host 127.0.0.1 --port "$BACKEND_PORT"
  else
    echo -e "${c_dim}  (env '$CONDA_ENV' bin not found — falling back to 'conda run')${c_off}"
    spawn "$BACK_PID" "$BACK_LOG" conda run --no-capture-output -n "$CONDA_ENV" \
      uvicorn app.main:app --host 127.0.0.1 --port "$BACKEND_PORT"
  fi
  cd "$ROOT"
}

start_frontend() {
  if is_running "$FRONT_PID"; then echo -e "${c_yel}frontend already running${c_off} (pid $(cat "$FRONT_PID"))"; return; fi
  echo "→ starting frontend on :$FRONTEND_PORT"
  cd "$ROOT/frontend"
  # --host exposes it on the LAN so a host browser can reach a VM
  spawn "$FRONT_PID" "$FRONT_LOG" npm run dev -- --port "$FRONTEND_PORT" --host
  cd "$ROOT"
}

wait_for() { # url label
  local url="$1" label="$2" i
  for i in $(seq 1 40); do
    if curl -fsS "$url" >/dev/null 2>&1; then echo -e "  ${c_grn}✓${c_off} $label ready"; return 0; fi
    sleep 0.5
  done
  echo -e "  ${c_red}✗${c_off} $label did not come up in time — check logs ($label)"; return 1
}

stop_one() { # name pidfile
  local name="$1" f="$2" pid
  if is_running "$f"; then
    pid="$(cat "$f")"
    echo "→ stopping $name (pid $pid)"
    kill -TERM "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
    for _ in $(seq 1 12); do is_running "$f" || break; sleep 0.5; done
    if is_running "$f"; then kill -KILL "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true; fi
  else
    echo -e "${c_dim}$name not running${c_off}"
  fi
  rm -f "$f"
}

cmd_start() {
  start_backend
  start_frontend
  echo "waiting for servers…"
  wait_for "http://127.0.0.1:$BACKEND_PORT/api/health" "backend" || true
  wait_for "http://127.0.0.1:$FRONTEND_PORT/"          "frontend" || true
  echo
  echo -e "${c_grn}COAE-Forge is up.${c_off}  Open:  ${c_grn}http://localhost:$FRONTEND_PORT${c_off}"
  echo -e "${c_dim}  backend docs: http://localhost:$BACKEND_PORT/docs · logs: ./coae.sh logs · stop: ./coae.sh stop${c_off}"
}

cmd_stop() { stop_one frontend "$FRONT_PID"; stop_one backend "$BACK_PID"; }

cmd_status() {
  local b="stopped" f="stopped"
  is_running "$BACK_PID"  && b="running (pid $(cat "$BACK_PID"))"
  is_running "$FRONT_PID" && f="running (pid $(cat "$FRONT_PID"))"
  echo -e "backend  : $b   ${c_dim}http://localhost:$BACKEND_PORT/docs${c_off}"
  echo -e "frontend : $f   ${c_dim}http://localhost:$FRONTEND_PORT${c_off}"
}

cmd_logs() {
  case "${1:-both}" in
    be|backend)  tail -n 40 -f "$BACK_LOG" ;;
    fe|frontend) tail -n 40 -f "$FRONT_LOG" ;;
    *)           tail -n 20 -f "$BACK_LOG" "$FRONT_LOG" ;;
  esac
}

case "${1:-}" in
  start)   cmd_start ;;
  stop)    cmd_stop ;;
  restart) cmd_stop; sleep 1; cmd_start ;;
  status)  cmd_status ;;
  logs)    cmd_logs "${2:-both}" ;;
  *) echo "usage: ./coae.sh {start|stop|restart|status|logs [be|fe]}"; exit 1 ;;
esac
