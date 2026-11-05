@echo off
cd /d "%~dp0"
title Accepted Bill Payment Reminder (keep this window open)
powershell -NoProfile -STA -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause