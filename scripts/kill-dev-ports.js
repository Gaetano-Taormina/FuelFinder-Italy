/* oxlint-disable no-console */
import { execSync } from 'node:child_process';
import os from 'node:os';

const TARGET_PORTS = [3001, 5173];
const isWindows = os.platform() === 'win32';

function getPidsOnPortWindows(port) {
    try {
        const output = execSync(`netstat -ano -p tcp`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        const lines = output.split('\n');
        const pids = new Set();

        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            // Example: TCP 0.0.0.0:3001 0.0.0.0:0 LISTENING 12345
            if (parts.length >= 5 && parts[0].toUpperCase() === 'TCP') {
                const localAddress = parts[1];
                const state = parts[3];
                const pid = parseInt(parts[4], 10);

                if (state.toUpperCase() === 'LISTENING' && localAddress.endsWith(`:${port}`) && pid > 0 && pid !== process.pid) {
                    pids.add(pid);
                }
            }
        }
        return Array.from(pids);
    } catch {
        return [];
    }
}

function getPidsOnPortUnix(port) {
    try {
        const output = execSync(`lsof -ti :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        return output.trim().split('\n').map(p => parseInt(p.trim(), 10)).filter(p => p > 0 && p !== process.pid);
    } catch {
        return [];
    }
}

function killPid(pid) {
    try {
        if (isWindows) {
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        } else {
            process.kill(pid, 'SIGKILL');
        }
        return true;
    } catch {
        return false;
    }
}

function freeDevPorts() {
    let killedCount = 0;

    for (const port of TARGET_PORTS) {
        const pids = isWindows ? getPidsOnPortWindows(port) : getPidsOnPortUnix(port);
        for (const pid of pids) {
            if (killPid(pid)) {
                console.info(`🧹 [Pre-dev] Liberata porta ${port} (PID ${pid} terminato)`);
                killedCount++;
            }
        }
    }

    if (killedCount === 0) {
        // All ports were already free
    }
}

freeDevPorts();
