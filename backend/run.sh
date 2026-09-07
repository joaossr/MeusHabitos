#!/usr/bin/env bash
cd "$(dirname "$0")"
if [ ! -f ".venv/bin/python" ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
python -m pip install -r requirements.txt
python app/app.py
