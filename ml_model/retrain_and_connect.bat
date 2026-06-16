@echo off
cd /d "%~dp0"
python step2_train_model.py
if errorlevel 1 exit /b 1
python step4_connect_to_frontend.py
if errorlevel 1 exit /b 1
cd ..
