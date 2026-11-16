export class CreateWorkshopDto {
  code!: string;
  name!: string;
  specialtyType!: string;
  supervisorName?: string;
  supervisorId?: string | number;
}

export class CreateWorkflowRouteDto {
  workshopId!: string | number;
  name!: string;
  severity?: string;
  slaMinutes?: number;
  stepsJson!: any;
  type!: 'MAINTENANCE' | 'FABRICATION';
}

export class CreateMaintenanceTicketDto {
  title!: string;
  description?: string;
  sourceType?: 'EMERGENCY_BREAKDOWN' | 'PREVENTIVE_PM' | 'QMS_NCR' | 'CALL_CENTER_ESCALATION' | 'BRANCH_REQUEST';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  assetId?: string | number;
  workshopId?: string | number;
  routeId?: string | number;
  assignedStaffId?: string | number;
  assignedStaffName?: string;
  slaMinutes?: number;
  requiresQaClearance?: boolean;
}

export class UpdateTicketStepDto {
  stepIndex!: number;
  stepName?: string;
  notes?: string;
}

export class QaClearanceDto {
  qaClearedByName!: string;
  qaClearedById?: string | number;
  notes?: string;
}

export class CloseTicketDto {
  downtimeMinutes?: number;
  closureNotes?: string;
  totalCost?: number;
}

export class CreateFabricationOrderDto {
  workshopId!: string | number;
  routeId?: string | number;
  itemName!: string;
  quantity!: number;
  targetBranchId?: string | number;
  bomMaterialsJson?: any;
  laborHours?: number;
  notes?: string;
}

export class IssueMaterialDto {
  materialId!: string | number;
  ticketId?: string | number;
  fabricationOrderId?: string | number;
  quantity!: number;
  isRemnantReturn?: boolean;
  notes?: string;
  issuedByName?: string;
}

export class CompleteFabricationOrderDto {
  laborHours?: number;
  notes?: string;
}

export class CreateAssetDto {
  assetCode!: string;
  name!: string;
  category!: 'PRODUCTION_LINE' | 'RETAIL_REFRIGERATION' | 'FLEET_COOLING' | 'FURNITURE_TROLLEY' | 'FACILITY';
  branchId?: string | number;
  serialNumber?: string;
  warrantyExpiry?: string;
}

export class CreateStaffDto {
  name!: string;
  phone?: string;
  role!: 'ENGINEER' | 'TECHNICIAN';
  workshopId!: string | number;
  specialty!: string;
  hourlyCostRate?: number;
}

export class CreateMaterialDto {
  code!: string;
  name!: string;
  materialType!: 'SPARE_PART' | 'STAINLESS_STEEL' | 'IRON_STEEL' | 'WOOD' | 'CONSUMABLE';
  unit!: string;
  currentStock?: number;
  minStockLevel?: number;
  unitCost?: number;
  isRemnant?: boolean;
  remnantDimension?: string;
}
