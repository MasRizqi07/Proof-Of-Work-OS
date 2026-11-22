import { describe, it, expect } from 'vitest';
import tasksContract from '../../../server/integration/contracts/tasks.json';
import evidenceContract from '../../../server/integration/contracts/evidence.json';
import metricsSummaryContract from '../../../server/integration/contracts/metrics-summary.json';
import projectsContract from '../../../server/integration/contracts/projects.json';

function extractSchema(data) {
  if (data === null) return 'null';
  if (Array.isArray(data)) {
    if (data.length === 0) return ['empty_array'];
    return [extractSchema(data[0])];
  }
  if (typeof data === 'object') {
    const shape = {};
    for (const key of Object.keys(data).sort()) {
      shape[key] = extractSchema(data[key]);
    }
    return shape;
  }
  return typeof data;
}

describe('R-11: Client Contract Validation', () => {
  it('client task fixtures match server tasks contract', () => {
    const mockTasksResponse = {
      items: [
        {
          id: 'mock-task-1',
          userId: 'mock-user-1',
          projectId: 'mock-project-1',
          title: 'Contract check task',
          description: 'Testing contract consistency',
          status: 'done',
          priority: 'medium',
          progress: 100,
          dueDate: '2026-12-01T00:00:00.000Z',
          completedAt: '2026-11-20T10:00:00.000Z',
          createdAt: '2026-11-19T10:00:00.000Z',
          updatedAt: '2026-11-20T10:00:00.000Z',
          hasProof: true,
          proofCount: 1,
          overdue: false,
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
      pages: 1,
    };

    expect(extractSchema(mockTasksResponse)).toEqual(tasksContract);
  });

  it('client evidence fixtures match server evidence contract', () => {
    const mockEvidenceResponse = {
      items: [
        {
          id: 'mock-evidence-1',
          taskId: 'mock-task-1',
          userId: 'mock-user-1',
          kind: 'url',
          label: 'PR Link',
          url: 'https://github.com/example/repo/pull/1',
          body: null,
          createdAt: '2026-11-20T10:00:00.000Z',
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
      pages: 1,
    };

    expect(extractSchema(mockEvidenceResponse)).toEqual(evidenceContract);
  });

  it('client metrics summary fixtures match server metrics-summary contract', () => {
    const mockMetricsSummaryResponse = {
      timezone: 'Asia/Jakarta',
      generatedAt: '2026-11-20T10:00:00.000Z',
      totals: {
        completed: 10,
        withProof: 8,
        withoutProof: 2,
        proofRate: 0.8,
        overdueOpen: 1,
      },
      streak: {
        currentWeeks: 3,
        longestWeeks: 4,
      },
      weekly: [
        {
          weekStart: '2026-11-16',
          withProof: 2,
          withoutProof: 0,
        },
      ],
    };

    expect(extractSchema(mockMetricsSummaryResponse)).toEqual(
      metricsSummaryContract,
    );
  });

  it('client project fixtures match server projects contract', () => {
    const mockProjectsResponse = {
      items: [
        {
          id: 'mock-project-1',
          ownerId: 'mock-user-1',
          name: 'Main Project',
          description: 'A great project',
          status: 'active',
          archivedAt: null,
          taskCounts: {
            total: 15,
            done: 10,
          },
          createdAt: '2026-11-19T10:00:00.000Z',
          updatedAt: '2026-11-20T10:00:00.000Z',
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
      pages: 1,
    };

    expect(extractSchema(mockProjectsResponse)).toEqual(projectsContract);
  });
});
