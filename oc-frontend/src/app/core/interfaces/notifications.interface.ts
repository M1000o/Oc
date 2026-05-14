export type AppNotificationKind = 'success' | 'error';

export interface AppNotificationState {
  kind: AppNotificationKind;
  message: string;
}
