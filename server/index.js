const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.use(morgan('dev'));

const users = [
  {
    id: 'user-1',
    name: 'Alex Developer',
    role: 'Software Engineer',
    focus: 'Productivity & career growth',
    metrics: {
      weeklyPoints: 68,
      streakDays: 12,
      projectsCompleted: 4,
    },
  },
];

const tasks = [
  {
    id: 'task-1',
    title: 'Ship feature planning dashboard',
    status: 'in-progress',
    progress: 60,
    priority: 'high',
    dueDate: '2026-05-15',
  },
  {
    id: 'task-2',
    title: 'Prepare coaching notes for next review',
    status: 'todo',
    progress: 0,
    priority: 'medium',
    dueDate: '2026-05-12',
  },
];

app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok', message: 'Proof of Work OS backend active' });
});

app.get('/api/user', (req, res) => {
  res.json(users[0]);
});

app.get('/api/tasks', (req, res) => {
  res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
  const { title, priority, dueDate } = req.body;
  const newTask = {
    id: `task-${tasks.length + 1}`,
    title,
    status: 'todo',
    progress: 0,
    priority: priority || 'medium',
    dueDate: dueDate || null,
  };
  tasks.push(newTask);
  res.status(201).json(newTask);
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Proof of Work OS backend listening on http://localhost:${port}`);
});
