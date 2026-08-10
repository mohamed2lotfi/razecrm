$dialog = New-Object -ComObject WIA.CommonDialog
$img = $dialog.ShowAcquireImage(1, 1, 1)
if ($img) {
    if (Test-Path "c:\Users\PC\Nouveau dossier\backend\test_scan.jpg") {
        Remove-Item "c:\Users\PC\Nouveau dossier\backend\test_scan.jpg"
    }
    $img.SaveFile("c:\Users\PC\Nouveau dossier\backend\test_scan.jpg")
    Write-Output "Image saved to test_scan.jpg"
} else {
    Write-Output "Scan Cancelled"
}
