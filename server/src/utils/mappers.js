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

const taskForApi = (task) =>
  task && {
    ...task,
    status: dbToStatus[task.status] || task.status,
    priority: dbToPriority[task.priority] || task.priority,
  };

const projectForApi = (project) =>
  project && {
    ...project,
    status: dbToProjectStatus[project.status] || project.status,
  };

module.exports = {
  statusToDb,
  projectStatusToDb,
  priorityToDb,
  dbToStatus,
  dbToPriority,
  dbToProjectStatus,
  taskForApi,
  projectForApi,
};

