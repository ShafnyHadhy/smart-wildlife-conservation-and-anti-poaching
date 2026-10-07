import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { AppCard } from '../../components/common/AppCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { mobileAuthService, AuthUser } from '../../services/authService';

interface LoginScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
  isOnline?: boolean;
}

export function LoginScreen({ onLoginSuccess, isOnline = true }: LoginScreenProps) {
  const [email, setEmail] = useState<string>('cmember@gmail.com');
  const [password, setPassword] = useState<string>('Cmember@123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (customEmail?: string, customPassword?: string) => {
    const targetEmail = customEmail !== undefined ? customEmail : email;
    const targetPassword = customPassword !== undefined ? customPassword : password;

    setErrorMessage(null);
    if (!targetEmail.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!targetPassword.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }

    try {
      setLoading(true);
      const user = await mobileAuthService.login(targetEmail, targetPassword);
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.outerContainer}>
      {/* Brand Header */}
      <View style={styles.header}>
        <View style={styles.headerBadgeRow}>
          <Text style={styles.emblemText}>🌿</Text>
          <View style={styles.headerTitleColumn}>
            <Text style={styles.deptText}>DEPARTMENT OF WILDLIFE CONSERVATION</Text>
            <Text style={styles.systemTitle}>Smart Wildlife Conservation</Text>
          </View>
        </View>
        <Text style={styles.systemSubtitle}>
          Sri Lanka Field Terminal & Community Conflict Portal
        </Text>
      </View>

      <ScreenContainer scrollable={true}>
        {/* Status Chip */}
        <View style={styles.networkStatusRow}>
          <Text style={styles.networkStatusLabel}>Connection Status:</Text>
          <StatusBadge
            status={isOnline ? 'CENTRAL ONLINE' : 'OFFLINE MODE (LOCAL)'}
            variant={isOnline ? 'success' : 'offline'}
            size="small"
          />
        </View>

        {/* Credentials Form */}
        <AppCard variant="elevated" style={styles.formCard}>
          <Text style={styles.cardTitle}>Sign In to Terminal</Text>
          <Text style={styles.cardSubtitle}>
            Enter your registered email address and password to continue.
          </Text>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={(val) => {
                setEmail(val);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="e.g. cmember@gmail.com"
              placeholderTextColor="#8C7A5B"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <View style={styles.passwordLabelRow}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}
              >
                <Text style={styles.showPasswordText}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.textInput}
              value={password}
              onChangeText={(val) => {
                setPassword(val);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="••••••••"
              placeholderTextColor="#8C7A5B"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={() => handleLogin()}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FAF7EE" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </AppCard>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#F5F5DC',
  },
  header: {
    backgroundColor: '#1C2A1E',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 20,
    borderBottomWidth: 3,
    borderBottomColor: '#D1B370',
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emblemText: {
    fontSize: 28,
  },
  headerTitleColumn: {
    flex: 1,
  },
  deptText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D1B370',
    letterSpacing: 1.2,
  },
  systemTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FAF7EE',
    marginTop: 2,
  },
  systemSubtitle: {
    fontSize: 12,
    color: '#C4B598',
    marginTop: 6,
  },
  networkStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: 6,
  },
  networkStatusLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B501B',
  },
  formCard: {
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C2A1E',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#556658',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  errorIcon: {
    fontSize: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1C2A1E',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  showPasswordText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3E8E41',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1B370',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1C2A1E',
  },
  loginButton: {
    backgroundColor: '#3E8E41',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#2E6B31',
    shadowColor: '#3E8E41',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#FAF7EE',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C2A1E',
    marginTop: 6,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionSubheading: {
    fontSize: 12,
    color: '#6B501B',
    marginBottom: 12,
  },
  roleCard: {
    flexDirection: 'row',
    backgroundColor: '#FAF7EE',
    borderWidth: 1.5,
    borderColor: '#D1B370',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#1C2A1E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  roleCardActive: {
    borderColor: '#3E8E41',
    backgroundColor: '#F3F8F3',
  },
  roleCardIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E6EFE6',
    borderWidth: 1,
    borderColor: '#3E8E41',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  roleCardIconRanger: {
    backgroundColor: '#EAE6D6',
    borderColor: '#A76D40',
  },
  roleCardIcon: {
    fontSize: 20,
  },
  roleCardContent: {
    flex: 1,
  },
  roleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  roleCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C2A1E',
  },
  roleCardName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3E8E41',
    marginTop: 2,
  },
  roleCardDesc: {
    fontSize: 11,
    color: '#556658',
    marginTop: 2,
    lineHeight: 15,
  },
  credentialPill: {
    marginTop: 6,
    backgroundColor: '#F0EBE1',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D1B370',
  },
  credentialPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B501B',
    fontFamily: 'monospace',
  },
  infoCard: {
    marginTop: 8,
    marginBottom: 24,
    backgroundColor: '#F0EBE1',
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C2A1E',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 11,
    color: '#3C4D3E',
    lineHeight: 16,
    marginBottom: 4,
  },
  boldText: {
    fontWeight: '800',
    color: '#1C2A1E',
  },
});
