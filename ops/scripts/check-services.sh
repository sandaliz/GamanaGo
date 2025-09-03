#!/usr/bin/env bash
set -e

echo "🔎 Checking Gateway"
curl -s http://localhost:8000/health; echo

echo "🔎 Checking Agents"
for port in 8001 8002 8003 8004 8005 8006 8007; do
  echo "Checking service on :$port"
  curl -s http://localhost:$port/health || echo " ❌ failed"
  echo
done

echo "🔎 Checking Web"
curl -s http://localhost:3001 || echo " ❌ frontend may not be responding"
