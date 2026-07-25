import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';

type Props = { children: React.ReactNode };
type State = { error: Error | null; info: string | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] caught render error:', error, info.componentStack);
    this.setState({ info: info.componentStack ?? null });
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.title}>Đã xảy ra lỗi khi hiển thị ứng dụng</Text>
            <Text style={styles.message}>{String(this.state.error.message)}</Text>
            <Text style={styles.stack}>{this.state.error.stack}</Text>
            {this.state.info ? <Text style={styles.stack}>{this.state.info}</Text> : null}
          </ScrollView>
          <Button mode="contained" onPress={() => this.setState({ error: null, info: null })}>
            Thử lại
          </Button>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 48, paddingHorizontal: 16 },
  scroll: { paddingBottom: 24 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#B91C1C' },
  message: { fontSize: 14, marginBottom: 12 },
  stack: { fontSize: 11, color: '#6B7280', marginBottom: 4 },
});
