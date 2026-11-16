export class TransferItemDto {
  itemId: string | number;
  itemName?: string;
  itemCode?: string;
  itemUnit?: string;
  batchNumber?: string;
  expiryDate?: string;
  dispatchedQty: number;
  dispatchedCount?: number;
  workOrderTargetQty?: number;
  workOrderDeliveredQty?: number;
  workOrderRemainingQty?: number;
  costingActualQty?: number;
  costingActualCount?: number;
  qcApprovedQty?: number;
  qcSampleQty?: number;
  qcReworkQty?: number;
  qcScrapQty?: number;
  receivedActualQty?: number;
  receivedActualCount?: number;
  notes?: string;
}

export class CreateFinishedGoodsTransferDto {
  sourceWarehouseId: string | number;
  destinationWarehouseId: string | number;
  productionOrderId?: string | number;
  itemId?: string | number;
  batchNumber?: string;
  expiryDate?: string;
  dispatchedQty?: number;
  dispatchedCount?: number;
  notes?: string;
  submittedBy?: string;
  submittedByCode?: string;
  items?: TransferItemDto[];
}

export class CostingAuditDto {
  transferId: string | number;
  actualWeight: number;
  actualCount?: number;
  auditorName?: string;
  auditorCode?: string;
  notes?: string;
  escalateDispute?: boolean;
  items?: TransferItemDto[];
}

export class ResolveCostingDisputeDto {
  transferId: string | number;
  finalAcceptedWeight: number;
  finalAcceptedCount?: number;
  resolvedBy?: string;
  resolvedByCode?: string;
  chargeTo?: string;
  resolutionNotes?: string;
}

export class QcInspectionDto {
  transferId: string | number;
  approvedQty: number;
  sampleQty?: number;
  reworkQty?: number;
  scrapQty?: number;
  inspectorName?: string;
  inspectorCode?: string;
  notes?: string;
  items?: TransferItemDto[];
}

export class ControlReceiptDto {
  transferId: string | number;
  receivedQty: number;
  receivedCount?: number;
  receiverName?: string;
  receiverCode?: string;
  notes?: string;
  items?: TransferItemDto[];
}

export class ResolveControlDisputeDto {
  transferId: string | number;
  finalAcceptedQty: number;
  resolvedBy?: string;
  resolvedByCode?: string;
  chargeTo?: string;
  resolutionNotes?: string;
}

export class ResubmitReworkDto {
  transferId: string | number;
  adjustedQty: number;
  adjustedCount?: number;
  notes?: string;
  reworkBy?: string;
  items?: TransferItemDto[];
}
