import fs from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

export const importJSON = (relativeTo, importURL) => {
  const dir = dirname(fileURLToPath(importURL));
  const pathname = resolve(dir, relativeTo);

  return JSON.parse(fs.readFileSync(pathname).toString());
};
