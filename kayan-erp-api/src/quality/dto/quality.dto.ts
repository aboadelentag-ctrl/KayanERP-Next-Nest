export class CreateInspectionDto {
  companyId?: string | number;
  itemId!: string | number;
  warehouseId?: string | number;
  productionOrderId?: string | number;
  productionStageId?: string | number;
  inspectionType!: string; // IQC, IPQC, OQC
  quantity!: number;
  status?: string; // PENDING, QUARANTINE, PASSED, REJECTED
  result?: string;
  notes?: string;
  isGmpPassed?: boolean;
  isHaccpPassed?: boolean;
  isWeightsPassed?: boolean;
  qualityScore?: number;
  inspectorName?: string;
  batchNumber?: string;
}

export class ReleaseQuarantineDto {
  status!: string; // PASSED or REJECTED
  result!: string;
  inspectorName?: string;
  qualityScore?: number;
  notes?: string;
}

export class CreateCcpLogDto {
  companyId?: string | number;
  ccpPointCode!: string; // e.g. CCP-1-OVEN, CCP-2-CHILLER, CCP-3-METAL-DETECTOR
  ccpPointName!: string;
  readingType!: string; // TEMPERATURE_C, HUMIDITY_PCT, METAL_DETECTION
  valueNumeric?: number;
  valueText?: string;
  criticalLimitMin?: number;
  criticalLimitMax?: number;
  checkedBy!: string;
  correctiveActionTaken?: string;
}

export class CreateNcrDto {
  companyId?: string | number;
  ncrNumber!: string;
  sourceType!: string; // IQC, IPQC, OQC, CUSTOMER_COMPLAINT, AUDIT
  itemId?: string | number;
  batchNumber?: string;
  defectTitle!: string;
  defectDescription!: string;
  rootCauseAnalysis?: string;
  disposition?: string; // SCRAP, REWORK, RETURN_TO_SUPPLIER, USE_AS_IS
  reportedBy!: string;
}

export class CloseNcrDto {
  rootCauseAnalysis?: string;
  disposition!: string;
  resolutionNotes?: string;
}
