$dialog = New-Object -ComObject WIA.CommonDialog
Write-Output "Opening dialog..."
try {
    # Parameters: DeviceType (1=Scanner), Intent (1=Color), ErrorHandling (1=Throw)
    $image = $dialog.ShowAcquireImage(1, 1, 1)
    if ($image) {
        Write-Output "Image acquired!"
        $image.SaveFile("c:\Users\PC\Nouveau dossier\backend\test_scan.jpg")
    } else {
        Write-Output "Cancelled"
    }
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
}
