@echo off
chcp 65001 > nul

echo ============================================================
echo   INICIANDO A PLATAFORMA DIAGNOSIS IA - MVP UBS CLINICA
echo ============================================================
echo.
echo [1/3] Acessando a pasta do projeto...
cd /d "%~dp0\diagnosis-mvp"

echo [2/3] Iniciando os conteineres via Docker...
echo (Isso pode levar alguns minutos na primeira execucao)
echo.
docker-compose up --build -d

:: Verifica se o comando anterior falhou
if %ERRORLEVEL% NEQ 0 goto :docker_error

echo.
echo [3/3] Sucesso! A plataforma foi iniciada em segundo plano.
echo Aguardando 8 segundos para inicializar os servicos...
timeout /t 8 > nul

echo.
echo Abrindo o portal medico no seu navegador padrao...
start http://localhost:5173

echo.
echo ============================================================
echo   Tudo pronto! Deixe esta janela aberta ou feche se preferir.
echo   Para logar: medico@clinica.com.br / Senha: senha123
echo ============================================================
echo.
pause
exit /b

:docker_error
echo.
echo ERRO: O Docker Desktop esta aberto e rodando?
echo Por favor, abra o programa Docker Desktop no seu Windows e tente novamente.
echo.
pause
exit /b
