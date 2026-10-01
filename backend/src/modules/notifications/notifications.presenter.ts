type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  metadata: unknown;
  createdAt: Date;
};

export interface NotificationPresented {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  metadata: unknown;
  createdAt: string;
}

export function toNotificationPresenter(
  notification: NotificationRow,
): NotificationPresented {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    read: notification.read,
    metadata: notification.metadata,
    createdAt: notification.createdAt.toISOString(),
  };
}
