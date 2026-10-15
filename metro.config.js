// Config Metro par défaut d'Expo + le modèle 3D du check-in (.glb) servi comme ressource.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('glb');

module.exports = config;
