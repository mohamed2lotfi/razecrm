$desktop = [Environment]::GetFolderPath('Desktop')
$wsh = New-Object -ComObject WScript.Shell

# 1. Shortcut to Start El Mokhtar CRM (Silent Background Mode)
$startShortcutPath = Join-Path $desktop "El Mokhtar CRM.lnk"
$startShortcut = $wsh.CreateShortcut($startShortcutPath)
$startShortcut.TargetPath = "wscript.exe"
$startShortcut.Arguments = '"""c:\Users\PC\Nouveau dossier\Start_Silent_CRM.vbs"""'
$startShortcut.WorkingDirectory = "c:\Users\PC\Nouveau dossier"
$startShortcut.IconLocation = "shell32.dll,220"
$startShortcut.Description = "Lancer El Mokhtar Travel CRM en arriere-plan (Silencieux)"
$startShortcut.Save()

# 2. Shortcut to Stop El Mokhtar CRM
$stopShortcutPath = Join-Path $desktop "Arreter El Mokhtar CRM.lnk"
$stopShortcut = $wsh.CreateShortcut($stopShortcutPath)
$stopShortcut.TargetPath = "c:\Users\PC\Nouveau dossier\Stop_ElMokhtar_CRM.bat"
$stopShortcut.WorkingDirectory = "c:\Users\PC\Nouveau dossier"
$stopShortcut.IconLocation = "shell32.dll,131"
$stopShortcut.Description = "Arreter les serveurs El Mokhtar Travel CRM"
$stopShortcut.Save()

Write-Output "Raccourcis Desktop mis a jour en mode silencieux !"
