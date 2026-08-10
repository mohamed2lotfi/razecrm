$dm = New-Object -ComObject WIA.DeviceManager
$dev = $dm.DeviceInfos | Where-Object { $_.Type -eq 1 } | Select-Object -First 1
if ($dev) {
    Write-Output "Connect to scanner..."
    try {
        $scanner = $dev.Connect()
        $item = $scanner.Items[1]
        Write-Output "Transferring image..."
        $img = $item.Transfer()
        Write-Output "Success: WIA_OK"
    } catch {
        Write-Output "ERROR: $($_.Exception.Message)"
    }
} else {
    Write-Output "No Scanner found"
}
