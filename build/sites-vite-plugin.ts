import { access, cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

const exists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

export const sites = (): Plugin => {
  let root = process.cwd();

  return {
    name: 'sites',
    apply: 'build',
    configResolved(config) {
      root = config.root;
    },
    async closeBundle() {
      const outputDirectory = resolve(root, 'dist', '.openai');
      const hostingConfig = resolve(root, '.openai', 'hosting.json');

      await rm(outputDirectory, { recursive: true, force: true });
      await mkdir(outputDirectory, { recursive: true });
      if (await exists(hostingConfig)) {
        await cp(hostingConfig, resolve(outputDirectory, 'hosting.json'));
      }

      // The Sites archive contract expects an entry Worker at this path.
      const generatedWorker = resolve(root, 'dist', 'cv_maestro_minimax', 'index.js');
      const serverOutput = resolve(root, 'dist', 'server', 'index.js');
      if (await exists(generatedWorker)) {
        await mkdir(resolve(root, 'dist', 'server'), { recursive: true });
        await cp(generatedWorker, serverOutput);
      }
    },
  };
};
