import fs from 'fs';
import { createFsRequire } from '#fs-require';

process.stdout.write(createFsRequire(fs)('./file'));
