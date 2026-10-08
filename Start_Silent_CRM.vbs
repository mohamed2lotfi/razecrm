Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Chemin du projet
projectDir = fso.GetParentFolderName(WScript.ScriptFullName)

' 1. Lancer le Backend en arriere-plan (Fenetre 0 = invisible)
WshShell.Run "cmd /c cd /d """ & projectDir & "\backend"" && npm run start:dev", 0, False

' 2. Lancer le Frontend en arriere-plan (Fenetre 0 = invisible)
WshShell.Run "cmd /c cd /d """ & projectDir & """ && npm run dev", 0, False

' 3. Attendre 3 secondes puis ouvrir le navigateur
WScript.Sleep 3000
WshShell.Run "http://elmokhtar.crm:5173"
