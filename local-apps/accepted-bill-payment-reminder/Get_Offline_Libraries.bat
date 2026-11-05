@echo off
cd /d "%~dp0"
if not exist lib mkdir lib
echo Downloading Excel reader library...
curl -L -o "lib\xlsx.full.min.js" "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"
echo Downloading zip library...
curl -L -o "lib\jszip.min.js" "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"
echo.
if exist "lib\xlsx.full.min.js" if exist "lib\jszip.min.js" (
  echo Done. The app now works without internet.
) else (
  echo Download failed. Check your internet connection or proxy and try again.
)
pause