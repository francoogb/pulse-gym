Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = "C:\Users\Gamer\Desktop\Semestral\Proyectos_web\mi-gym"
shell.Run "cmd /c npm run produccion >> pulse-servidor.log 2>&1", 0, False
