"use client";

import React from "react";
import styles from "./widget-error-boundary.module.css";

interface Props {
  widgetName: string;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class WidgetErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.container}>
          <div className={styles.errorTitle}>
            {this.props.widgetName} failed to render
          </div>
          <div className={styles.errorMessage}>
            {this.state.error?.message || "Unknown error"}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className={styles.retryButton}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
