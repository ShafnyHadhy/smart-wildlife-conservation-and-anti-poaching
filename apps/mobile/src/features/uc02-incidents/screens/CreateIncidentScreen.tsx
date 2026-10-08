import React, { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
//import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import {
  CreateIncidentDTO,
  EvidenceType,
  IncidentType,
} from '@wildlife/shared';

import { submitIncident } from '../services/incidentService';
import { CURRENT_RANGER } from '../config';
import { IncidentSuccessScreen } from './IncidentSuccessScreen';

interface CreateIncidentScreenProps {
  isOnline: boolean;
  onBack: () => void;
  onSubmitted?: () => void;
  onGoHome: () => void;
}

const incidentTypes = [
  IncidentType.SNARE,
  IncidentType.CARCASS,
  IncidentType.ILLEGAL_CAMPSITE,
  IncidentType.FOOTPRINT,
  IncidentType.POACHING_ACTIVITY,
  IncidentType.ILLEGAL_LOGGING,
  IncidentType.OTHER,
];

export function CreateIncidentScreen({
  isOnline,
  onBack,
  onSubmitted,
  onGoHome,
}: CreateIncidentScreenProps) {
  const [incidentType, setIncidentType] =
    useState<IncidentType>(IncidentType.SNARE);

  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string | undefined>();
  const [photoType, setPhotoType] = useState<string | undefined>();

  const [gettingLocation, setGettingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const captureLocation = async () => {
    try {
      // Web browser
      if (typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLatitude(position.coords.latitude);
            setLongitude(position.coords.longitude);
          },
          () => {
            Alert.alert(
              'Location Error',
              'Unable to get your current location. Please allow location access.'
            );
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
          }
        );

        return;
      }

      // Android / iOS
      const Location = await import('expo-location');

      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is required to report an incident.'
        );
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLatitude(currentLocation.coords.latitude);
      setLongitude(currentLocation.coords.longitude);
    } catch (error) {
      console.error('GPS error:', error);

      Alert.alert(
        'Location Error',
        'Unable to capture your current location.'
      );
    }
  };

  const pickPhoto = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Photo Permission Required',
          'Allow access to photos to attach incident evidence.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const photo = result.assets[0];

        setPhotoUri(photo.uri);
        setPhotoName(
          photo.fileName || `incident-${Date.now()}.jpg`
        );
        setPhotoType(photo.mimeType || 'image/jpeg');
      }
    } catch (error: any) {
      Alert.alert(
        'Photo Error',
        error?.message || 'Unable to select photo.'
      );
    }
  };

  const takePhoto = async () => {
    try {
      const permission =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Camera Permission Required',
          'Camera permission is required to capture evidence.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const photo = result.assets[0];

        setPhotoUri(photo.uri);
        setPhotoName(
          photo.fileName || `incident-${Date.now()}.jpg`
        );
        setPhotoType(photo.mimeType || 'image/jpeg');
      }
    } catch (error: any) {
      Alert.alert(
        'Camera Error',
        error?.message || 'Unable to capture photo.'
      );
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert(
        'Description Required',
        'Please describe the incident.'
      );
      return;
    }

    if (latitude === null || longitude === null) {
      Alert.alert(
        'GPS Required',
        'Please capture the incident GPS location.'
      );
      return;
    }

    const data: CreateIncidentDTO = {
      rangerId: CURRENT_RANGER.id,
      incidentType,
      description: description.trim(),
      latitude,
      longitude,
      reportedAt: new Date().toISOString(),
      evidence: photoUri
        ? [
            {
              evidenceType: EvidenceType.PHOTO,
              filePath: photoUri,
              fileName: photoName,
              fileType: photoType,
              capturedAt: new Date().toISOString(),
            },
          ]
        : undefined,
    };

    try {
      setSubmitting(true);

      await submitIncident(data, isOnline);

      setSubmitted(true);
    } catch (error: any) {
      Alert.alert(
        'Submission Error',
        error?.message || 'Unable to save incident.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <IncidentSuccessScreen
        isOnline={isOnline}
        onOk={() => {
          onSubmitted?.();
          onGoHome();
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Report Incident</Text>
        <Text style={styles.subtitle}>
          Wildlife / Poaching Incident
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.connectionBanner,
            isOnline
              ? styles.onlineBanner
              : styles.offlineBanner,
          ]}
        >
          <Text style={styles.connectionText}>
            {isOnline
              ? 'ONLINE • Report will be submitted immediately'
              : 'OFFLINE • Report will be stored locally'}
          </Text>
        </View>

        <Text style={styles.label}>Ranger</Text>

        <View style={styles.readOnlyBox}>
          <Text style={styles.readOnlyText}>
            {CURRENT_RANGER.name} • {CURRENT_RANGER.badgeNumber}
          </Text>
        </View>

        <Text style={styles.label}>Incident Type</Text>

        <View style={styles.typeGrid}>
          {incidentTypes.map((type) => {
            const selected = incidentType === type;

            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  selected && styles.typeButtonSelected,
                ]}
                onPress={() => setIncidentType(type)}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    selected && styles.typeButtonTextSelected,
                  ]}
                >
                  {type.replace(/_/g, ' ')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Description</Text>

        <TextInput
          style={styles.descriptionInput}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe what you observed..."
          placeholderTextColor="#9CA3AF"
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.label}>GPS Location</Text>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={captureLocation}
          disabled={gettingLocation}
        >
          <Text style={styles.secondaryButtonText}>
            {gettingLocation
              ? 'Getting GPS...'
              : latitude !== null
              ? 'Refresh GPS Location'
              : 'Capture Current GPS'}
          </Text>
        </TouchableOpacity>

        {latitude !== null && longitude !== null && (
          <View style={styles.locationBox}>
            <Text style={styles.locationText}>
              Latitude: {latitude.toFixed(6)}
            </Text>
            <Text style={styles.locationText}>
              Longitude: {longitude.toFixed(6)}
            </Text>
          </View>
        )}

        <Text style={styles.label}>Photo Evidence</Text>

        <View style={styles.photoActions}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={takePhoto}
          >
            <Text style={styles.secondaryButtonText}>
              Take Photo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={pickPhoto}
          >
            <Text style={styles.secondaryButtonText}>
              Choose Photo
            </Text>
          </TouchableOpacity>
        </View>

        {photoUri && (
          <View style={styles.photoPreviewContainer}>
            <Image
              source={{ uri: photoUri }}
              style={styles.photoPreview}
            />

            <TouchableOpacity
              style={styles.removePhotoButton}
              onPress={() => {
                setPhotoUri(null);
                setPhotoName(undefined);
                setPhotoType(undefined);
              }}
            >
              <Text style={styles.removePhotoText}>
                Remove Photo
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.submitButton,
            submitting && styles.disabledButton,
          ]}
          disabled={submitting}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>
            {submitting
              ? 'Saving...'
              : isOnline
              ? 'Submit Incident'
              : 'Save Incident Offline'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5DC',
  },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#D1B370',
  },
  backText: {
    color: '#3E8E41',
    fontWeight: '700',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C2A1E',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  content: {
    padding: 18,
    paddingBottom: 40,
  },
  connectionBanner: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 18,
  },
  onlineBanner: {
    backgroundColor: '#E8F5E9',
  },
  offlineBanner: {
    backgroundColor: '#FFF3E0',
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C2A1E',
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: '#A76D40',
    marginBottom: 8,
    marginTop: 14,
  },
  readOnlyBox: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1B370',
    borderRadius: 8,
  },
  readOnlyText: {
    color: '#1C2A1E',
    fontWeight: '600',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    borderWidth: 1,
    borderColor: '#D1B370',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  typeButtonSelected: {
    backgroundColor: '#3E8E41',
    borderColor: '#3E8E41',
  },
  typeButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1C2A1E',
  },
  typeButtonTextSelected: {
    color: '#FFFFFF',
  },
  descriptionInput: {
    minHeight: 120,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1B370',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1C2A1E',
  },
  secondaryButton: {
    backgroundColor: '#FAF7EE',
    borderWidth: 1,
    borderColor: '#D1B370',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#A76D40',
    fontWeight: '700',
    fontSize: 13,
  },
  locationBox: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1B370',
  },
  locationText: {
    color: '#1C2A1E',
    fontSize: 12,
    marginBottom: 3,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  photoPreviewContainer: {
    marginTop: 12,
  },
  photoPreview: {
    width: '100%',
    height: 220,
    borderRadius: 10,
  },
  removePhotoButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  removePhotoText: {
    color: '#B91C1C',
    fontWeight: '700',
    fontSize: 12,
  },
  submitButton: {
    marginTop: 28,
    backgroundColor: '#3E8E41',
    paddingVertical: 14,
    borderRadius: 9,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});