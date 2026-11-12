@echo off
rem Builds dist\AIUsageMeter-<version>.zip: the exe, its Claude Code add-on, README, licence,
rem screenshots, the full source and SHA256SUMS.txt. One plain zip: no password, no nested archives.
rem Uses only tools that ship with Windows 10/11 (csc, robocopy, certutil, tar).
rem ROOT is the source\ folder; the zip goes to dist\ next to it.
setlocal
set "ROOT=%~dp0.."
for %%i in ("%ROOT%") do set "ROOT=%%~fi"
for %%i in ("%ROOT%\..\dist") do set "DIST=%%~fi"

for /f tokens^=2^ delims^=^" %%v in ('findstr /c:"public const string Version" "%ROOT%\overlay\src\AIUsageMeter.cs"') do set "VER=%%v"
if "%VER%"=="" (
  echo Could not read the version from AIUsageMeter.cs
  exit /b 1
)
set "NAME=AIUsageMeter-%VER%"
set "STAGE=%DIST%\%NAME%"
set "ZIP=%DIST%\%NAME%.zip"

if exist "%STAGE%" rmdir /s /q "%STAGE%"
if exist "%ZIP%" del /q "%ZIP%"
mkdir "%STAGE%"

rem The program, built straight into the package (the copy in overlay\ may be running and locked)
call "%ROOT%\overlay\build.cmd" "%STAGE%\AIUsageMeter.exe" || exit /b 1

rem The add-on the program installs (it looks for this "plugin" folder next to itself)
robocopy "%ROOT%\hooks" "%STAGE%\plugin\hooks" /E /NFL /NDL /NJH /NJS >nul
robocopy "%ROOT%\types" "%STAGE%\plugin\types" /E /NFL /NDL /NJH /NJS >nul
robocopy "%ROOT%\.claude-plugin" "%STAGE%\plugin\.claude-plugin" plugin.json /NFL /NDL /NJH /NJS >nul

rem What people read
copy /y "%ROOT%\package\README.txt" "%STAGE%\README.txt" >nul
copy /y "%ROOT%\LICENSE" "%STAGE%\LICENSE.txt" >nul
robocopy "%ROOT%\Screenshot" "%STAGE%\screenshots" /E /NFL /NDL /NJH /NJS >nul
robocopy "%ROOT%\docs\out" "%STAGE%\manual" AI_Usage_Meter_Manual_*.pdf /NFL /NDL /NJH /NJS >nul

rem The source code: the whole source\ folder, minus build output and generated types
robocopy "%ROOT%" "%STAGE%\source" /E /XD "%ROOT%\.claude" "%ROOT%\.claude-plugin\types" "%ROOT%\docs\out" "%ROOT%\docs\__pycache__" /XF *.exe /NFL /NDL /NJH /NJS >nul

rem Checksum of the program, so people can verify their copy
for /f "delims=" %%h in ('certutil -hashfile "%STAGE%\AIUsageMeter.exe" SHA256 ^| findstr /v ":"') do set "SUM=%%h"
set "SUM=%SUM: =%"
> "%STAGE%\SHA256SUMS.txt" echo %SUM%  AIUsageMeter.exe

tar -a -c -f "%ZIP%" -C "%DIST%" "%NAME%" || exit /b 1
echo Built %ZIP%
echo SHA-256 AIUsageMeter.exe: %SUM%
