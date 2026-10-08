# Script pour ajouter elmokhtar.crm au fichier hosts et autoriser le pare-feu
$hostsPath = "$env:windir\System32\drivers\etc\hosts"
$entry1 = "127.0.0.1       elmokhtar.crm"
$entry2 = "192.168.1.3     elmokhtar.crm"

$content = Get-Content $hostsPath -Raw -ErrorAction SilentlyContinue
if ($content -notmatch "elmokhtar.crm") {
    Add-Content -Path $hostsPath -Value "`r`n$entry1`r`n$entry2`r`n"
    Write-Host "Domaine elmokhtar.crm ajoute au fichier hosts avec succes !" -ForegroundColor Green
} else {
    Write-Host "elmokhtar.crm est deja present dans hosts." -ForegroundColor Yellow
}

# Flush DNS cache
Clear-DnsClientCache

# Regles Firewall
netsh advfirewall firewall delete rule name="El Mokhtar CRM Frontend" | Out-Null
netsh advfirewall firewall add rule name="El Mokhtar CRM Frontend" dir=in action=allow protocol=TCP localport=5173 | Out-Null

netsh advfirewall firewall delete rule name="El Mokhtar CRM Backend" | Out-Null
netsh advfirewall firewall add rule name="El Mokhtar CRM Backend" dir=in action=allow protocol=TCP localport=3000 | Out-Null

Write-Host "Pare-feu configure avec succes !" -ForegroundColor Green
Start-Sleep -Seconds 2
