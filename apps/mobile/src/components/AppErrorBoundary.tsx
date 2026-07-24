import { Component, type ErrorInfo, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { API_BASE_URL } from "../services/api/client";
import { colors } from "../theme/colors";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
  componentStack: string | null;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App crash:", error, info.componentStack);
    this.setState({ componentStack: info.componentStack ?? null });
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>EasymatchBD failed to start</Text>
          <ScrollView style={styles.scroll}>
            <Text style={styles.message}>{this.state.error.message}</Text>
            {__DEV__ && this.state.componentStack ? (
              <Text style={styles.stack}>{this.state.componentStack}</Text>
            ) : null}
            {__DEV__ ? (
              <Text style={styles.meta}>API: {API_BASE_URL}</Text>
            ) : null}
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.rose50,
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.rose900,
    marginBottom: 12,
  },
  scroll: {
    maxHeight: 280,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.zinc800,
  },
  stack: {
    marginTop: 12,
    fontSize: 11,
    lineHeight: 16,
    color: colors.zinc600,
    fontFamily: "monospace",
  },
  meta: {
    marginTop: 16,
    fontSize: 12,
    color: colors.zinc500,
  },
});
