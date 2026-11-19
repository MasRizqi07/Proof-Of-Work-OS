const statusToDb = {
  todo: 'TODO',
  'in-progress': 'IN_PROGRESS',
  done: 'DONE',
  cancelled: 'CANCELLED',
};

const projectStatusToDb = {
  active: 'ACTIVE',
  paused: 'PAUSED',
  completed: 'COMPLETED',
};

const priorityToDb = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  urgent: 'URGENT',
};

const evidenceKindToDb = {
  url: 'URL',
  note: 'NOTE',
};

const dbToStatus = {
  TODO: 'todo',
  IN_PROGRESS: 'in-progress',
  DONE: 'done',
  CANCELLED: 'cancelled',
};

const dbToPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

const dbToProjectStatus = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
};

const dbToEvidenceKind = {
  URL: 'url',
  NOTE: 'note',
};

const taskForApi = (task) => {
  if (!task) return null;
  const proofCount =
    task._count?.evidence ?? (task.evidence ? task.evidence.length : 0);
  const rest = { ...task };
  delete rest._count;
  return {
    ...rest,
    status: dbToStatus[task.status] || task.status,
    priority: dbToPriority[task.priority] || task.priority,
    proofCount,
    hasProof: proofCount > 0,
    overdue:
      Boolean(task.dueDate) &&
      ['TODO', 'IN_PROGRESS'].includes(task.status) &&
      new Date(task.dueDate) < new Date(),
  };
};

const projectForApi = (project) =>
  project && {
    ...project,
    status: dbToProjectStatus[project.status] || project.status,
  };

const evidenceForApi = (evidence) =>
  evidence && {
    ...evidence,
    kind:
      dbToEvidenceKind[evidence.kind] || String(evidence.kind).toLowerCase(),
  };

module.exports = {
  statusToDb,
  projectStatusToDb,
  priorityToDb,
  evidenceKindToDb,
  dbToStatus,
  dbToPriority,
  dbToProjectStatus,
  dbToEvidenceKind,
  taskForApi,
  projectForApi,
  evidenceForApi,
};
