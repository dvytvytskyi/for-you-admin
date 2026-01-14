#!/bin/bash
cd /root/admin-panel/admin-panel-backend
while true; do
  echo "[$(date)] Starting Azure translation session..." >> translate_runner.log
  npx ts-node src/scripts/translate-properties-azure.ts >> translate_runner.log 2>&1
  CODE=$?
  echo "[$(date)] Azure translation script exited with code $CODE." >> translate_runner.log
  if [ $CODE -eq 0 ]; then
    echo "[$(date)] Finished cleanly. Waiting 1 hour..." >> translate_runner.log
    sleep 3600
  else
    echo "[$(date)] Error occurred. Restarting in 60 seconds..." >> translate_runner.log
    sleep 60
  fi
done
