import { useRef, useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Alert,
  Linking,
} from 'react-native'
import { Image } from 'react-native'
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import * as FileSystem from 'expo-file-system/legacy'
import * as Crypto from 'expo-crypto'
import { decode as decodeBase64 } from 'base64-arraybuffer'
import { Ionicons } from '@expo/vector-icons'
import { AppColors } from '@/constants/Colors'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/hooks/useUser'

type ScreenState = 'camera' | 'preview' | 'uploading' | 'success' | 'error'

async function resizeImage(uri: string, width: number, height: number): Promise<string> {
  // Skip the round-trip if the source is already within bounds — avoids upscaling
  // a small image and wasting bandwidth/tokens for no quality gain.
  if (Math.max(width, height) <= 1024) return uri

  const isPortrait = height >= width
  const resize = isPortrait ? { height: 1024 } : { width: 1024 }
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
  )
  return result.uri
}

export default function CameraScreen() {
  const { user } = useUser()
  const cameraRef = useRef<CameraView>(null)
  const [permission, requestPermission] = useCameraPermissions()
  const [facing, setFacing] = useState<CameraType>('back')
  const [state, setState] = useState<ScreenState>('camera')
  const [capturedUri, setCapturedUri] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Guard against setState after unmount when an upload is in flight
  // (user backgrounds the app or switches tabs mid-upload).
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 })
      if (!photo) return
      const resized = await resizeImage(photo.uri, photo.width, photo.height)
      setCapturedUri(resized)
      setState('preview')
    } catch {
      Alert.alert('Camera error', 'Could not take a photo. Try again.')
    }
  }, [])

  const handlePickFromLibrary = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    })
    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]
    const resized = await resizeImage(asset.uri, asset.width, asset.height)
    setCapturedUri(resized)
    setState('preview')
  }, [])

  const handleUpload = useCallback(async () => {
    if (!capturedUri || !user) return
    setState('uploading')
    setErrorMessage(null)

    try {
      const scanId = Crypto.randomUUID()
      const storagePath = `${user.id}/${scanId}.jpg`

      // Read the file as base64 → ArrayBuffer. Do NOT use fetch(uri).blob() here:
      // on RN/Hermes that path produces a wrapper Supabase serializes as 0 bytes,
      // landing an empty object in the bucket with no error.
      const base64 = await FileSystem.readAsStringAsync(capturedUri, {
        encoding: FileSystem.EncodingType.Base64,
      })
      const arrayBuffer = decodeBase64(base64)

      const { error: uploadError } = await supabase.storage
        .from('scan-images')
        .upload(storagePath, arrayBuffer, { contentType: 'image/jpeg', upsert: false })

      if (uploadError) throw uploadError

      const { error: insertError } = await supabase
        .from('scans')
        .insert({
          id: scanId,
          user_id: user.id,
          image_path: storagePath,
        })

      if (insertError) throw insertError

      if (!mountedRef.current) return
      setState('success')
    } catch (err: any) {
      console.error('Upload error:', err)
      if (!mountedRef.current) return
      setErrorMessage(err?.message ?? 'Something went wrong. Try again.')
      setState('error')
    }
  }, [capturedUri, user])

  const handleRetry = useCallback(() => {
    setCapturedUri(null)
    setErrorMessage(null)
    setState('camera')
  }, [])

  // ── Permission states ──────────────────────────────────────────────────────

  if (!permission) {
    return <View style={styles.container} />
  }

  if (!permission.granted) {
    // After a second deny on iOS (or a "don't ask again" on Android),
    // requestPermission() resolves immediately without prompting. Send the user
    // to system settings instead so the button isn't dead.
    const canPrompt = permission.canAskAgain
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Ionicons name="camera-outline" size={56} color={AppColors.textLight} />
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionBody}>
          {canPrompt
            ? "Cookable needs your camera to scan what's in your fridge."
            : "Camera access is off for Cookable. Turn it on in Settings to scan your fridge."}
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={canPrompt ? requestPermission : () => Linking.openSettings()}
        >
          <Text style={styles.primaryButtonText}>
            {canPrompt ? 'Allow camera access' : 'Open settings'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  // ── Success state ──────────────────────────────────────────────────────────

  if (state === 'success') {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Ionicons name="checkmark-circle" size={64} color={AppColors.success} />
        <Text style={styles.successTitle}>Photo saved</Text>
        <Text style={styles.successBody}>
          Recipe generation is coming in Week 2. Your scan is stored.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={handleRetry}>
          <Text style={styles.primaryButtonText}>Scan again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────────

  if (state === 'error') {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Ionicons name="alert-circle-outline" size={56} color={AppColors.error} />
        <Text style={styles.permissionTitle}>Upload failed</Text>
        <Text style={styles.permissionBody}>{errorMessage}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={handleUpload}>
          <Text style={styles.primaryButtonText}>Try again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ghostButton} onPress={handleRetry}>
          <Text style={styles.ghostButtonText}>Start over</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  // ── Preview state ──────────────────────────────────────────────────────────

  if (state === 'preview' || state === 'uploading') {
    return (
      <View style={styles.container}>
        <Image source={{ uri: capturedUri! }} style={styles.preview} resizeMode="cover" />

        <SafeAreaView style={styles.previewControls}>
          {state === 'uploading' ? (
            <View style={styles.uploadingRow}>
              <ActivityIndicator color={AppColors.surface} />
              <Text style={styles.uploadingText}>Saving photo...</Text>
            </View>
          ) : (
            <View style={styles.previewButtonRow}>
              <TouchableOpacity style={styles.ghostButtonDark} onPress={handleRetry}>
                <Text style={styles.ghostButtonDarkText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleUpload}>
                <Text style={styles.confirmButtonText}>Use this photo</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </View>
    )
  }

  // ── Camera viewfinder ──────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
        <SafeAreaView style={styles.cameraControls}>
          <View style={styles.cameraTopBar}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            >
              <Ionicons name="camera-reverse-outline" size={28} color={AppColors.surface} />
            </TouchableOpacity>
          </View>

          <View style={styles.cameraBottomBar}>
            <TouchableOpacity style={styles.iconButton} onPress={handlePickFromLibrary}>
              <Ionicons name="images-outline" size={28} color={AppColors.surface} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.shutterButton} onPress={handleCapture} activeOpacity={0.8}>
              <View style={styles.shutterInner} />
            </TouchableOpacity>

            {/* Spacer to balance the layout */}
            <View style={styles.iconButton} />
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
    backgroundColor: AppColors.background,
  },

  // Permission / status screens
  permissionTitle: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 24,
    color: AppColors.text,
    textAlign: 'center',
    marginTop: 8,
  },
  permissionBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: AppColors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  successTitle: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 24,
    color: AppColors.text,
    textAlign: 'center',
    marginTop: 8,
  },
  successBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: AppColors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Buttons
  primaryButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: AppColors.surface,
  },
  ghostButton: {
    paddingVertical: 10,
    alignSelf: 'center',
  },
  ghostButtonText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: AppColors.textMuted,
  },

  // Camera viewfinder
  camera: {
    flex: 1,
  },
  cameraControls: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cameraTopBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 0,
  },
  cameraBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === 'ios' ? 20 : 24,
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: AppColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: AppColors.surface,
  },

  // Preview
  preview: {
    flex: 1,
  },
  previewControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 20,
  },
  previewButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  ghostButtonDark: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  ghostButtonDarkText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: AppColors.surface,
  },
  confirmButton: {
    flex: 2,
    backgroundColor: AppColors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: AppColors.surface,
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  uploadingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: AppColors.surface,
  },
})
