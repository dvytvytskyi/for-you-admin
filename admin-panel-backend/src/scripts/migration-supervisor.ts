import { spawn, ChildProcess } from 'child_process';
import path from 'path';

// --- CONFIGURATION ---
const SHARDS = [
    {
        name: 'Worker_Local',
        prefixes: '012345',
        type: 'local'
    },
    {
        name: 'Worker_Remote1',
        prefixes: '6789a',
        type: 'remote',
        host: '88.99.38.25',
        user: 'root',
        pass: 'PgTeNqcgnwWu'
    },
    {
        name: 'Worker_Remote2',
        prefixes: 'bcdef',
        type: 'remote',
        host: '188.245.228.175',
        user: 'root',
        pass: 'xWJpWicwHkkU'
    }
];

const RESTART_TIMEOUT_MS = 180000; // 3 minutes timeout (Network can be slower)
const REMOTE_DIR = '~/migration_worker';

interface WorkerState {
    name: string;
    prefixes: string;
    type: string;
    host?: string;
    user?: string;
    pass?: string;
    process: ChildProcess | null;
    lastHeartbeat: number;
    restarts: number;
    active: boolean;
    pid?: number;
}

const workers: WorkerState[] = SHARDS.map(s => ({
    ...s,
    process: null,
    lastHeartbeat: Date.now(),
    restarts: 0,
    active: true
}));

function startWorker(worker: WorkerState) {
    if (!worker.active) return;

    let cmd: string;
    let args: string[];

    const scriptArgs = [
        `--name=${worker.name}`,
        `--prefixes=${worker.prefixes}`
    ];

    if (worker.type === 'local') {
        console.log(`[Supervisor] Starting LOCAL ${worker.name} (Prefixes: ${worker.prefixes})...`);
        cmd = 'npx';
        args = ['ts-node', 'src/scripts/migrate-photos-to-hetzner.ts', ...scriptArgs];
    } else {
        console.log(`[Supervisor] Starting REMOTE ${worker.name} on ${worker.host} (Prefixes: ${worker.prefixes})...`);
        // SSH Command structure:
        // sshpass -p PASS ssh -o Strict -R 5434:localhost:5434 USER@HOST "cd DIR && npx ts-node src/scripts/migrate-photos-to-hetzner.ts ..."

        const remoteCmd = `cd ${REMOTE_DIR} && npx ts-node src/scripts/migrate-photos-to-hetzner.ts ${scriptArgs.join(' ')}`;

        cmd = 'sshpass';
        args = [
            '-p', worker.pass!,
            'ssh',
            '-o', 'StrictHostKeyChecking=no',
            '-R', '5434:localhost:5434', // Tunnel DB
            `${worker.user}@${worker.host}`,
            remoteCmd
        ];
    }

    worker.process = spawn(cmd, args, {
        cwd: process.cwd(), // Local CWD
        env: { ...process.env }, // Inherit env
        stdio: ['ignore', 'pipe', 'pipe']
    });

    worker.pid = worker.process.pid;
    worker.lastHeartbeat = Date.now();

    // STDOUT Handler
    worker.process.stdout?.on('data', (data) => {
        const str = data.toString().trim();
        worker.lastHeartbeat = Date.now();

        if (str.includes('DONE')) {
            console.log(`[Supervisor] ✅ ${worker.name} FINISHED successfully.`);
            worker.active = false;
        } else if (str.includes('PROGRESS')) {
            // console.log(`[${worker.name}] Update +1`);
        } else if (str.includes('HEARTBEAT')) {
            // Heartbeat received
        } else if (str.includes('DB_CONNECTED')) {
            console.log(`[Supervisor] ${worker.name} connected to DB.`);
        } else if (str.includes('RESUMING')) {
            console.log(`[Supervisor] ${worker.name} resuming...`);
        } else {
            // Forward unknown logs for debugging remote issues
            // console.log(`[${worker.name}] ${str}`);
        }
    });

    // STDERR Handler
    worker.process.stderr?.on('data', (data) => {
        worker.lastHeartbeat = Date.now(); // Error log counts as activity (e.g. warnings)
        const str = data.toString().trim();
        // Ignore known harmless warnings or verbose ssh logs
        if (!str.includes('Warning:') && str.length > 5) {
            console.error(`[${worker.name} LOG]`, str);
        }
    });

    // Exit Handler
    worker.process.on('close', (code) => {
        if (!worker.active) return; // Expected exit

        console.warn(`[Supervisor] ⚠️ ${worker.name} exited with code ${code}. Restarting in 5s...`);
        worker.process = null;
        worker.restarts++;

        setTimeout(() => {
            startWorker(worker);
        }, 5000);
    });
}

// Watchdog Loop
setInterval(() => {
    const now = Date.now();
    workers.forEach(w => {
        if (!w.active || !w.process) return;

        const silence = now - w.lastHeartbeat;
        if (silence > RESTART_TIMEOUT_MS) {
            console.error(`[Supervisor] 🚨 ${w.name} FROZE (No activity for ${Math.round(silence / 1000)}s). Killing...`);
            try {
                process.kill(w.process.pid!, 'SIGKILL');
            } catch (e) { /* ignore */ }
        }
    });

    // Check if all done
    if (workers.every(w => !w.active)) {
        console.log(`[Supervisor] 🎉 All workers finished! Exiting supervisor.`);
        process.exit(0);
    }

}, 10000); // Check every 10s

// Start All
console.log(`[Supervisor] Launching ${workers.length} distributed workers...`);
workers.forEach(startWorker);
