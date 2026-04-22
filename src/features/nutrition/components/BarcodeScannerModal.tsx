import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
}

export const BarcodeScannerModal = ({ visible, onClose, onScanSuccess }: BarcodeScannerModalProps) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    onScanSuccess(data);
    
    // Reset scanned state after a short delay to allow future scans if needed
    setTimeout(() => setScanned(false), 2000);
  };

  if (!visible) return null;

  if (!permission) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#00E5FF" />
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.centerContainer}>
          <Text style={styles.permissionText}>L'accès à la caméra est nécessaire pour scanner les produits.</Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>AUTORISER LA CAMÉRA</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeAbsolute} onPress={onClose}>
            <Ionicons name="close" size={32} color="#FFF" />
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFill}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
          }}
        />
        
        {/* Dark Overlay with transparent target area */}
        <View style={styles.overlay}>
          <View style={styles.topRow} />
          <View style={styles.middleRow}>
            <View style={styles.sideCol} />
            <View style={styles.targetArea}>
              {/* Technical Corners */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <View style={styles.sideCol} />
          </View>
          <View style={styles.bottomRow}>
            <Text style={styles.hintText}>PLACE LE CODE-BARRES DANS LE CADRE</Text>
          </View>
        </View>

        {/* Header with Close Button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 40 },
  permissionText: { color: '#FFF', fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 32 },
  permissionBtn: { backgroundColor: '#00E5FF', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12 },
  permissionBtnText: { color: '#000', fontWeight: '900', fontSize: 14 },
  closeAbsolute: { position: 'absolute', top: 60, right: 24 },
  
  header: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  
  overlay: { ...StyleSheet.absoluteFillObject },
  topRow: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  middleRow: { flexDirection: 'row', height: 200 },
  sideCol: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  targetArea: { width: 280, height: 200, backgroundColor: 'transparent', position: 'relative' },
  bottomRow: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', paddingTop: 40 },
  
  corner: { position: 'absolute', width: 30, height: 30, borderColor: '#00E5FF', borderWidth: 4 },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  
  hintText: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
});
