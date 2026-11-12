@echo off
title Game Backlog Launcher
echo Iniciando Game Backlog Backend y Frontend...
start "Game Backlog - Backend" "%~dp0start-backend.bat"
start "Game Backlog - Frontend" "%~dp0start-frontend.bat"
echo Aplicaciones iniciadas en nuevas ventanas.

