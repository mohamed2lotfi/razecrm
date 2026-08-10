$dm = New-Object -ComObject WIA.DeviceManager
$dev = $dm.DeviceInfos | Where-Object { $_.Properties['Name'].Value -like '*Kyocera*' -and $_.Type -eq 1 } | Select-Object -First 1
if ($dev) {
    Write-Output "Connecting to: $($dev.Properties['Name'].Value)"
    try {
        $scanner = $dev.Connect()
        Write-Output "Connected!"
        # 6146 is current intent, 4103 is Data Type, etc.
        $item = $scanner.Items[1]
        Write-Output "Transferring..."
        $img = $item.Transfer()
        $img.SaveFile("c:\Users\PC\Nouveau dossier\backend\test_force.jpg")
        Write-Output "SUCCESS"
    } catch {
        Write-Output "ERROR: $($_.Exception.Message)"
    }
} else {
    Write-Output "No Kyocera Scanner found"
}
