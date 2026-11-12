@echo off
rem Builds AIUsageMeter.exe with the C# compiler that ships with Windows (.NET Framework 4).
rem Usage: build.cmd [output path]   (default: overlay\AIUsageMeter.exe)
setlocal
set "FW=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319"
set "SRC=%~dp0src"
set "OUT=%~1"
if "%OUT%"=="" set "OUT=%~dp0AIUsageMeter.exe"

"%FW%\csc.exe" /nologo /target:winexe /optimize+ /out:"%OUT%" /win32icon:"%SRC%\app.ico" ^
  /r:"%FW%\WPF\PresentationFramework.dll" /r:"%FW%\WPF\PresentationCore.dll" /r:"%FW%\WPF\WindowsBase.dll" ^
  /r:"%FW%\System.Xaml.dll" /r:"%FW%\System.Windows.Forms.dll" /r:"%FW%\System.Drawing.dll" ^
  /r:"%FW%\System.Web.Extensions.dll" /r:"%FW%\Microsoft.CSharp.dll" /r:"%FW%\System.Core.dll" ^
  "%SRC%\AIUsageMeter.cs"
if errorlevel 1 (
  echo Build failed.
  exit /b 1
)
echo Built %OUT%
