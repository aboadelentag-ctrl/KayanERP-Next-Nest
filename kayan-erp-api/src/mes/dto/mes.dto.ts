export class CreateBomItemDto {
  componentItemId!: string | number;
  quantity!: number;
  unit!: string;
  scrapFactorPct?: number;
  itemType?: string; // RAW_MATERIAL, SUB_ASSEMBLY, BY_PRODUCT, CO_PRODUCT
  parentBomItemId?: string | number;
  lineNumber?: number;
  notes?: string;
}

export class CreateBomHeaderDto {
  companyId?: string | number;
  itemId!: string | number;
  bomCode!: string;
  bomName!: string;
  version?: string;
  standardBatchQty!: number;
  batchUnit!: string;
  totalCost?: number;
  notes?: string;
  items?: CreateBomItemDto[];
}

export class CreateWorkOrderDto {
  companyId?: string | number;
  workOrderNumber!: string;
  batchId!: string;
  bomHeaderId?: string | number;
  itemId!: string | number;
  warehouseId!: string | number;
  targetQuantity!: number;
  priority?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  customRoutingSteps?: string[]; // Optional custom step names
}

export class StartRoutingStepDto {
  operatorName?: string;
  machineCode?: string;
  inputQuantity?: number;
  notes?: string;
}

export class CompleteRoutingStepDto {
  actualMinutes?: number;
  outputQuantity?: number;
  notes?: string;
}

export class LogScrapDto {
  routingStepId?: string | number;
  itemId!: string | number;
  quantity!: number;
  scrapReasonCategory!: string; // MATERIAL, MACHINE, HUMAN, ENVIRONMENTAL
  scrapReasonDetail!: string;
  loggedBy?: string;
}

export class CreateShiftLogDto {
  companyId?: string | number;
  shiftName!: string;
  supervisorName!: string;
  wipNotes?: string;
  handoverNotes?: string;
}
