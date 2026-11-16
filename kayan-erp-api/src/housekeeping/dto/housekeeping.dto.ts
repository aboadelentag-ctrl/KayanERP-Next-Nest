export class CreateWorkerDto {
  workerCode!: string;
  fullName!: string;
  phone?: string;
  branchId?: string | number;
  assignedZoneType?: 'PRODUCTION_HALL' | 'RETAIL_BRANCH' | 'WAREHOUSE' | 'FLEET';
  supervisorId?: string | number;
  supervisorName?: string;
  performanceScore?: number;
}

export class UpdateWorkerDto {
  fullName?: string;
  phone?: string;
  branchId?: string | number;
  assignedZoneType?: 'PRODUCTION_HALL' | 'RETAIL_BRANCH' | 'WAREHOUSE' | 'FLEET';
  supervisorId?: string | number;
  supervisorName?: string;
  performanceScore?: number;
  isActive?: boolean;
}

export class CreateZoneDto {
  zoneCode!: string;
  name!: string;
  environmentType!: 'PRODUCTION_SSOP' | 'RETAIL_SHOWROOM' | 'WAREHOUSE' | 'FLEET_VEHICLE';
  branchId?: string | number;
  linkedAssetId?: string | number;
  frequencyType!: 'EVERY_2_HOURS' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ON_DEMAND';
  checklistItemsJson!: any;
}

export class UpdateZoneDto {
  name?: string;
  environmentType?: 'PRODUCTION_SSOP' | 'RETAIL_SHOWROOM' | 'WAREHOUSE' | 'FLEET_VEHICLE';
  branchId?: string | number;
  linkedAssetId?: string | number;
  frequencyType?: 'EVERY_2_HOURS' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ON_DEMAND';
  checklistItemsJson?: any;
  isActive?: boolean;
}

export class ExecuteTaskDto {
  zoneId!: string | number;
  workerId?: string | number;
  workerCode?: string;
  workerName?: string;
  supervisorId?: string | number;
  supervisorName?: string;
  taskType?: 'SCHEDULED_SSOP' | 'DEEP_CLEANING' | 'POST_MAINTENANCE_CLEANUP' | 'FLEET_SANITIZATION' | 'EMERGENCY_SPILL';
  checklistResultsJson?: any;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  gpsCoordinates?: string;
  notes?: string;
  status?: 'COMPLETED_BY_SUPERVISOR' | 'PENDING' | 'IN_PROGRESS';
}

export class ConvertToMaintenanceDto {
  taskId!: string | number;
  title!: string;
  description!: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  workshopId?: string | number;
  assetId?: string | number;
  supervisorName?: string;
}

export class QaVerificationDto {
  taskId!: string | number;
  status!: 'QA_VERIFIED' | 'FAILED_RECLEAN_REQUIRED';
  qaVerifiedByName!: string;
  qaVerifiedById?: string | number;
  qaNotes?: string;
}

export class CreateSupplyDto {
  code!: string;
  name!: string;
  category!: 'FOOD_GRADE_SANITIZER' | 'GENERAL_DETERGENT' | 'COLOR_CODED_TOOL' | 'PEST_CONTROL';
  colorCode!: 'RED_BATHROOM' | 'BLUE_PRODUCTION' | 'GREEN_RETAIL' | 'YELLOW_GENERAL';
  unit?: string;
  currentStock?: number;
  minStockLevel?: number;
  unitCost?: number;
}

export class IssueSupplyDto {
  supplyId!: string | number;
  quantity!: number;
  issuedToType?: 'SUPERVISOR' | 'BRANCH' | 'ZONE';
  issuedToId?: string | number;
  issuedToName?: string;
  supervisorId?: string | number;
  supervisorName?: string;
  notes?: string;
}

export class CreateHygieneCheckDto {
  workerOrEmployeeName!: string;
  employeeCode!: string;
  department?: string;
  supervisorId?: string | number;
  supervisorName?: string;
  uniformClean?: boolean;
  hairNetWorn?: boolean;
  nailsTrimmed?: boolean;
  noOpenWounds?: boolean;
  passed?: boolean;
  notes?: string;
}
