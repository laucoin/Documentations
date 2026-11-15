// Asks for confirmation before pushing to a protected branch, rewriting remote history or deleting a remote branch.
import { spawnSync } from 'node:child_process';
import { createReadStream, openSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

const protectedBranches = ['master', 'main', 'develop'];
const zeroSha = /^0+$/;

const git = (...args) => spawnSync('git', args, { stdio: 'ignore' }).status === 0;

const isFastForward = (remoteSha, localSha) =>
	git('cat-file', '-e', remoteSha) && git('merge-base', '--is-ancestor', remoteSha, localSha);

const describeRisk = ({ localSha, remoteRef, remoteSha }) => {
	const branch = remoteRef.replace(/^refs\/heads\//, '');
	if (zeroSha.test(localSha)) return `delete the remote branch "${branch}"`;
	if (!zeroSha.test(remoteSha) && !isFastForward(remoteSha, localSha)) return `force push on "${branch}"`;
	if (protectedBranches.includes(branch)) return `push on the protected branch "${branch}"`;
	return null;
};

const openTty = () => {
	try {
		return openSync('/dev/tty', 'r');
	} catch {
		return null;
	}
};

const confirm = (question) =>
	new Promise((resolve) => {
		const fd = openTty();
		if (fd === null) {
			resolve(false);
			return;
		}
		const input = createReadStream(null, { fd });
		const rl = createInterface({ input, output: process.stderr });
		rl.question(`${question} (y/N): `, (answer) => {
			rl.close();
			input.destroy();
			resolve(/^y(es)?$/i.test(answer.trim()));
		});
	});

const refs = readFileSync(0, 'utf8')
	.split('\n')
	.filter(Boolean)
	.map((line) => line.split(' '))
	.map(([, localSha, remoteRef, remoteSha]) => ({ localSha, remoteRef, remoteSha }));

for (const ref of refs) {
	const risk = describeRisk(ref);
	if (risk && !(await confirm(`⚠ You are about to ${risk}. Continue?`))) {
		console.error('Push aborted.');
		process.exit(1);
	}
}
