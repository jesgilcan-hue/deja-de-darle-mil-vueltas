import { execSync } from 'child_process';

try {
  const output = execSync('wmic process where "CommandLine like \'%chrome_client_profile%\'" get ProcessId').toString();
  const pids = output.match(/\d+/g);
  if (pids) {
    pids.forEach(pid => {
      try {
        process.kill(parseInt(pid, 10));
        console.log('Killed PID:', pid);
      } catch (e) {}
    });
  } else {
    console.log('No test chrome processes found.');
  }
} catch (e) {
  console.log('WMIC check completed.');
}
