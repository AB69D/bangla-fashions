import { env } from '../config/env.js';
import { getLicenseState, isDomainLicensed } from '../config/license.js';
import { logger } from '../lib/logger.js';

// Hosts that are not public storefront domains and so are never what the
// licence is about. 'backend' is the compose service name: the Next.js server
// renders pages by calling http://backend:8080 over the internal Docker
// network, so those requests arrive with Host: backend and would otherwise be
// refused as "domain not licensed" on a correctly licensed deployment.
// This does not weaken the guard — every request that comes from a browser
// arrives through Caddy carrying the real public Host, and is still checked.
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', 'backend']);

// Blocks all traffic once the license is missing/invalid/expired, or once
// production traffic arrives on a domain the license wasn't issued for.
// A no-op outside production so local/staging environments never need a
// license key. Relies on config/license.js re-verifying LICENSE_KEY on an
// interval (see server.js) so an expiry is caught without a restart.
export const licenseGuard = (req, res, next) => {
    if (env.NODE_ENV !== 'production') return next();

    const state = getLicenseState();
    if (!state.valid) {
        logger.error({ err: state.error }, 'Blocked request: invalid/missing/expired license');
        return res.status(503).json({ success: false, message: 'Service unavailable: invalid license.' });
    }

    const hostname = req.hostname;
    if (!LOCAL_HOSTS.has(hostname) && !isDomainLicensed(hostname)) {
        logger.error(
            { hostname, licensedDomains: state.payload.domains },
            'Blocked request: domain not licensed',
        );
        return res.status(503).json({ success: false, message: 'Service unavailable: domain not licensed.' });
    }

    next();
};
