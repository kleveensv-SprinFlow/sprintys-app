$ErrorActionPreference = "Continue"

$DrivePath = "G:\Mon Drive\Sprinty_APK"

Clear-Host
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   🚀 BUILD LOCAL SPRINTY -> GOOGLE DRIVE" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

if (-not (Test-Path $DrivePath)) {
    Write-Host "📂 Creation du dossier $DrivePath..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $DrivePath | Out-Null
}

Write-Host "`n⚙️ Etape 1/3 : Expo Prebuild (Preparation du code Android)..." -ForegroundColor Yellow
npx expo prebuild -p android --no-install

Write-Host "`n🔨 Etape 2/3 : Compilation Gradle (Peut prendre 3 a 10 minutes la premiere fois)..." -ForegroundColor Yellow
Set-Location -Path "android"
.\gradlew assembleRelease

$ApkPath = "app\build\outputs\apk\release\app-release.apk"

if (Test-Path $ApkPath) {
    Write-Host "`n✅ Compilation reussie ! Copie vers Google Drive en cours..." -ForegroundColor Green
    $Timestamp = Get-Date -Format "yyyy-MM-dd_HHh-mm"
    $NewFileName = "Sprinty_$Timestamp.apk"
    $Destination = Join-Path -Path $DrivePath -ChildPath $NewFileName
    Copy-Item -Path $ApkPath -Destination $Destination -Force
    Write-Host "🎉 TERMINE ! Ton APK a ete copie avec succes :" -ForegroundColor Cyan
    Write-Host "👉 $Destination" -ForegroundColor White
} else {
    Write-Host "`n❌ Erreur : L'APK n'a pas ete genere. Regarde les erreurs au-dessus." -ForegroundColor Red
}

Set-Location -Path ".."
Write-Host "`nAppuie sur Entree pour fermer cette fenetre..."
Read-Host
