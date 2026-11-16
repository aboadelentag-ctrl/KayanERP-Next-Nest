export class LookupCustomerDto {
  phone!: string;
}

export class CreateCustomerAddressDto {
  customerId!: string | number;
  zoneId?: string | number;
  label!: string;
  streetAddress!: string;
  landmark?: string;
  floor?: string;
  apartment?: string;
  isDefault?: boolean;
}

export class CallCenterOrderItemDto {
  itemId!: string | number;
  batchId?: string | number;
  quantity!: number;
  unitPrice!: number;
  notes?: string;
}

export class CreateCallCenterOrderDto {
  customerId!: string | number;
  customerName?: string;
  phone?: string;
  addressId?: string | number;
  branchId!: string | number;
  warehouseId?: string | number;
  deliveryZoneId?: string | number;
  deliveryFee?: number;
  orderType!: 'BRANCH_READY' | 'CUSTOM_PRODUCTION';
  paymentMethod?: string;
  notes?: string;
  items!: CallCenterOrderItemDto[];
}

export class UpdateDispatchStatusDto {
  deliveryStatus!: 'PENDING_BRANCH' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  driverId?: string | number;
  driverName?: string;
  notes?: string;
}

export class CreateComplaintDto {
  customerId!: string | number;
  salesOrderId?: string | number;
  batchId?: string | number;
  category!: 'QUALITY' | 'DELAY' | 'MISSING_ITEM' | 'PACKAGING';
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description!: string;
}

export class FreezeBatchDto {
  batchId!: string | number;
  reason!: string;
  complaintId?: string | number;
}

export class ResolveComplaintDto {
  complaintId!: string | number;
  investigationResult!: 'GENUINE_BATCH_DEFECT' | 'ISOLATED_INCIDENT' | 'MALICIOUS_SUSPECTED';
  status!: 'RESOLVED' | 'REJECTED' | 'ESCALATED_AMS';
  resolutionNotes?: string;
  trustScoreDelta?: number;
}

export class LogSurveyDto {
  batchId!: string | number;
  targetCustomerId!: string | number;
  targetCustomerName?: string;
  phone?: string;
  satisfactionStatus!: 'FULLY_SATISFIED' | 'TASTE_ISSUE' | 'DEFECTIVE' | 'UNREACHABLE';
  notes?: string;
}
