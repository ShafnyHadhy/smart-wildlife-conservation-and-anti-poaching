// Type declarations for React Native components used in the mobile shell
declare module 'react-native' {
  import * as React from 'react';

  export interface StyleProp<T> {
    [key: string]: any;
  }

  export interface ViewStyle {
    [key: string]: any;
  }

  export interface TextStyle {
    [key: string]: any;
  }

  export const StyleSheet: {
    create<T extends Record<string, any>>(styles: T): T;
  };

  export const Text: React.FC<any>;
  export const View: React.FC<any>;
  export const SafeAreaView: React.FC<any>;
  export const ScrollView: React.FC<any>;
  export const TouchableOpacity: React.FC<any>;
  export const StatusBar: React.FC<any>;
  export const TextInput: React.FC<any>;
  export const ActivityIndicator: React.FC<any>;
  export const Alert: {
    alert(title: string, message?: string, buttons?: any[]): void;
  };
}

