# Modèle 3D du check-in

`assets/models/body.glb` est généré à partir de Z-Anatomy (CC BY-SA 4.0, voir `assets/models/LICENSE-body.txt`).
Chaque maille s'appelle `<zone>__<G|D|X>` ; les zones sont celles de `src/features/checkin/bodyZones.ts`.
`os__X` regroupe des os visibles, non touchables.

## Régénérer

1. Télécharger `Z-Anatomy.zip` depuis https://github.com/Z-Anatomy/Models-of-human-anatomy et en extraire
   `Startup.blend` vers un chemin court (ex. `C:\Users\<toi>\Sprintflow\_3d-work\src\zanatomy.blend`).
   Ne pas le committer (300 Mo).
2. Construire (Blender 5.x, scripts du fichier désactivés) :
   ```
   blender -b --disable-autoexec --factory-startup zanatomy.blend --python tools/3d/build_body.py -- body_raw.glb 160000
   ```
3. Compresser :
   ```
   npx @gltf-transform/cli@4 weld body_raw.glb body_w.glb
   npx @gltf-transform/cli@4 quantize body_w.glb assets/models/body.glb
   ```
   Pas de Draco ni de meshopt : leurs décodeurs ne tournent pas dans le moteur JS mobile.
4. Vérifier visuellement (rendu face, dos, 3/4 ; zones à colorer en option) :
   ```
   blender -b --factory-startup --python tools/3d/render_preview.py -- body_raw.glb out_dir abdominaux obliques
   ```
