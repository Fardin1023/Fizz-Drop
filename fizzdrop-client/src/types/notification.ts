export interface AppNotification {
  id: number;
  recipient_role: 'SUPERADMIN' | 'SUPPLIER' | 'OUTLET' | 'SALES_OFFICER' | string;
  recipient_user_id?: number | null;
  title: string;
  message: string;
  type: 'NEW_REQUISITION' | 'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED' | 'SALES_OFFICER_REQUISITION' | 'SALES_OFFICER_PURCHASE_CONFIRMED' | string;
  reference_code?: string;
  reference_id?: number;
  is_read: boolean;
  created_at: string;
}

export interface RealtimeEventPayload {
  type: 'NEW_REQUISITION' | 'REQUISITION_ACTION' | 'SALES_OFFICER_REQUISITION' | 'SALES_OFFICER_PURCHASE_CONFIRMED' | string;
  recipientRole: 'SUPERADMIN' | 'SUPPLIER' | 'OUTLET' | 'SALES_OFFICER' | string;
  recipientUserId?: number | null;
  title: string;
  message: string;
  referenceCode?: string;
  referenceId?: number;
  status?: string;
  outlet_price?: number;
  product_id?: number;
  product_name?: string;
}
