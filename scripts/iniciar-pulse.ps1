# Arranca Pulse en segundo plano (puerto 4317).
# Lo ejecuta el Programador de tareas "Pulse servidor" al iniciar sesión en Windows.
$proyecto = "C:\Users\Gamer\Desktop\Semestral\Proyectos_web\mi-gym"
$log = Join-Path $proyecto "pulse-servidor.log"
Set-Location $proyecto
"[$(Get-Date)] Iniciando Pulse en el puerto 4317" | Add-Content $log
cmd /c ('npm run produccion >> "{0}" 2>&1' -f $log)
