export class CreateAmsTaskDto {
  companyId?: string | number;
  taskCode!: string;
  title!: string;
  description!: string;
  taskType!: string; // CCP_DEVIATION, QUALITY_NCR, MAINTENANCE_DOWNTIME, SAFETY_HAZARD, AUDIT_FINDING
  priority?: string; // CRITICAL, HIGH, MEDIUM, LOW
  assigneeName!: string;
  assigneePhone?: string;
  slaMinutes?: number; // e.g. 60 for critical, 1440 for high
  slaDeadline?: string;
  escalationLevel?: number;
}

export class ResolveAmsTaskDto {
  resolutionNotes!: string;
}

export class EscalateAmsTaskDto {
  escalationReason?: string;
  newAssigneeName?: string;
  newAssigneePhone?: string;
}
