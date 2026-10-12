import { spawn } from 'node:child_process';

const vite = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', '5173'], {
  cwd: 'frontend',
  stdio: ['ignore', 'inherit', 'inherit'],
  shell: true,
});

vite.on('exit', (code) => {
  console.log(`Vite exited with code ${code}`);
  process.exit(code || 0);
});
