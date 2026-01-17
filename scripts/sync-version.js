import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read root package.json version
const rootPackage = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
);
const version = rootPackage.version;

console.log(`Syncing version ${version} to all packages...`);

// Update web/package.json
const webPackagePath = join(__dirname, '..', 'web', 'package.json');
const webPackage = JSON.parse(readFileSync(webPackagePath, 'utf-8'));
webPackage.version = version;
writeFileSync(webPackagePath, JSON.stringify(webPackage, null, 2) + '\n');
console.log(`✓ Updated web/package.json to ${version}`);

// Update server/package.json
const serverPackagePath = join(__dirname, '..', 'server', 'package.json');
const serverPackage = JSON.parse(readFileSync(serverPackagePath, 'utf-8'));
serverPackage.version = version;
writeFileSync(serverPackagePath, JSON.stringify(serverPackage, null, 2) + '\n');
console.log(`✓ Updated server/package.json to ${version}`);

console.log('Version sync complete!');
