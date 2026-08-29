$ErrorActionPreference = "Continue"

# ==========================================
# CONFIGURATION
# Modifie ce chemin si ton Google Drive n'est pas sur G:\Mon Drive
$DrivePath = "G:\Mon Drive\Sprinty_APK"
# ==========================================

Clear-Host
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   🚀 BUILD LOCAL SPRINTY -> GOOGLE DRIVE" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Vérifier / Créer le dossier Google Drive
if (!(Test-Path $DrivePath)) {
    try {
        Write-Host "📂 Création du dossier $DrivePath..." -ForegroundColor Yellow
        New-Item -ItemType Directory -Force -Path $DrivePath | Out-Null
    } catch {
        Write-Host "⚠️ Impossible de trouver ou créer le dossier $DrivePath." -ForegroundColor Red
        Write-Host "Ouvre ce script avec le bloc-notes et modifie la variable `$DrivePath avec le bon chemin de ton Google Drive." -ForegroundColor White
        Read-Host "Appuie sur Entrée pour quitter"
        exit
    }
}

# 2. Prebuild Expo
Write-Host "`n⚙️  Étape 1/3 : Expo Prebuild (Préparation du code Android)..." -ForegroundColor Yellow
npx expo prebuild -p android --no-install

# 3. Compilation Gradle
Write-Host "`n🔨 Étape 2/3 : Compilation Gradle (Peut prendre 3 a 10 minutes la premiere fois)..." -ForegroundColor Yellow
Set-Location -Path "android"
.\gradlew assembleRelease

# 4. Copie vers Google Drive
$ApkPath = "app\build\outputs\apk\release\app-release.apk"

if (Test-Path $ApkPath) {
    Write-Host "`n✅ Compilation réussie ! Copie vers Google Drive en cours..." -ForegroundColor Green
    
    # On ajoute la date et l'heure pour ne pas écraser les anciens APK
    $Timestamp = Get-Date -Format "yyyy-MM-dd_HHh-mm"
    $NewFileName = "Sprinty_$Timestamp.apk"
    $Destination = Join-Path -Path $DrivePath -ChildPath $NewFileName
    
    Copy-Item -Path $ApkPath -Destination $Destination -Force
    Write-Host "🎉 TERMINÉ ! Ton APK a été copié avec succès :" -ForegroundColor Cyan
    Write-Host "👉 $Destination" -ForegroundColor White
} else {
    Write-Host "`n❌ Erreur : L'APK n'a pas été généré. Regarde les erreurs au-dessus." -ForegroundColor Red
}

# Retour à la racine du projet
Set-Location -Path ".."

Write-Host "`nAppuie sur Entrée pour fermer cette fenêtre..."
Read-Host
