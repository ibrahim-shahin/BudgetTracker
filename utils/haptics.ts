import * as Haptics from 'expo-haptics';

// Haptics are a nicety: a phone without them must never see an error.

export function tapFeedback() {
  void Haptics.selectionAsync().catch(() => undefined);
}

export function pressFeedback() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
}

export function successFeedback() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

export function warningFeedback() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
}
