export interface AppNotification {
  id: number;
  recipient_role: 'SUPERADMIN' | 'SUPPLIER';
  recipient_user_id?: number | null;
  title: string;
  message: string;
  type: 'NEW_REQUISITION' | 'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED' | string;
  reference_code?: string;
  reference_id?: number;
  is_read: boolean;
  created_at: string;
}

export interface RealtimeEventPayload {
  type: 'NEW_REQUISITION' | 'REQUISITION_ACTION';
  recipientRole: 'SUPERADMIN' | 'SUPPLIER';
  recipientUserId?: number | null;
  title: string;
  message: string;
  referenceCode?: string;
  referenceId?: number;
  status?: string;
}
