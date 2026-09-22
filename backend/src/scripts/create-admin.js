// ---------------------------------------------------------------------------
// First-admin bootstrap.
//
// The panel has two login paths: username + password (preferred) and a legacy
// email OTP. Password login needs an Admin row to already exist, and the OTP
// path needs outbound email to be configured — so on a fresh database with no
// mail provider yet there is no way in at all. This script opens that door.
//
// Run it inside the backend container, which already has MONGODB_URI:
//   docker compose exec -T backend node src/scripts/create-admin.js \
//     --username owner --email you@example.com --role super-admin
//
// Omit --password and a strong one is generated and printed ONCE. Change it
// from the panel after the first login. Re-running for an existing username
// does nothing unless --force is passed, in which case the password is reset.
// ---------------------------------------------------------------------------

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import AdminModel from '../models/admin.model.js';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const FORCE = args.includes('--force');

const username = String(arg('username', '')).toLowerCase().trim();
const email = String(arg('email', '')).toLowerCase().trim();
const fullName = arg('name', '');
const role = arg('role', 'super-admin');
// Ambiguous characters dropped so the password survives being read aloud.
const generated = crypto.randomBytes(24).toString('base64url').replace(/[-_]/g, '').slice(0, 20);
const password = arg('password', generated);
const didGenerate = !arg('password', '');

if (!username || !/^[a-z0-9._-]{3,64}$/.test(username)) {
    console.error('--username is required (3-64 chars, a-z 0-9 . _ - only)');
    process.exit(1);
}
if (!['super-admin', 'admin', 'moderator', 'salesman'].includes(role)) {
    console.error(`--role must be one of: super-admin, admin, moderator, salesman`);
    process.exit(1);
}
if (password.length < 10) {
    console.error('--password must be at least 10 characters');
    process.exit(1);
}

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('MONGODB_URI is not set in the environment. Aborting.');
    process.exit(1);
}

const run = async () => {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });

    const existing = await AdminModel.findOne({ username });
    if (existing && !FORCE) {
        console.error(`Admin "${username}" already exists. Pass --force to reset its password.`);
        await mongoose.disconnect();
        process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    if (existing) {
        existing.passwordHash = passwordHash;
        existing.isActive = true;
        if (email) existing.email = email;
        if (fullName) existing.fullName = fullName;
        existing.role = role;
        await existing.save();
        console.log(`\nReset the password for existing admin "${username}" (role: ${role}).`);
    } else {
        await AdminModel.create({
            username,
            passwordHash,
            ...(email ? { email } : {}),
            ...(fullName ? { fullName } : {}),
            role,
            isActive: true,
            addedBy: 'create-admin-script',
        });
        console.log(`\nCreated admin "${username}" (role: ${role}).`);
    }

    if (didGenerate) {
        console.log(`\n  username: ${username}`);
        console.log(`  password: ${password}`);
        console.log(`\nThis password is shown once. Save it now, then change it from the panel.`);
    }
    console.log(`\nSign in at /admin/login\n`);

    await mongoose.disconnect();
};

run().catch(async (err) => {
    console.error('Failed:', err?.message || err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
