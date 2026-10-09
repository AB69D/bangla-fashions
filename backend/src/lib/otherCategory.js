import CategoryModel from '../models/category.model.js';
import { logger } from './logger.js';

// Stable identity of the fallback category. Code must look it up by this key,
// never by its display name (names are editable and not unique).
export const OTHER_SYSTEM_KEY = 'other';
export const OTHER_CATEGORY_NAME = 'Other';

// True for "Other", " other ", "OTHER"... Used to keep admins from creating or
// renaming a second category into the reserved name.
export const isReservedCategoryName = (name) =>
    typeof name === 'string' && name.trim().toLowerCase() === OTHER_CATEGORY_NAME.toLowerCase();

const OTHER_NAME_RE = /^\s*other\s*$/i;
const NOT_STAMPED = { $not: { $type: 'string' } };
const MAX_ATTEMPTS = 5;

// A category somebody already created by hand called "Other" becomes the
// system one instead of getting a twin. Oldest first, so concurrent callers
// pick the same candidate; the guarded update (plus the unique index) lets
// only one of them win. Resolves to null when there is nothing to adopt or
// another caller got there first.
const adoptExistingOther = async () => {
    const candidate = await CategoryModel
        .findOne({ category_name: OTHER_NAME_RE, systemKey: NOT_STAMPED })
        .sort({ _id: 1 })
        .select('_id');
    if (!candidate) return null;

    return CategoryModel.findOneAndUpdate(
        { _id: candidate._id, systemKey: NOT_STAMPED },
        { $set: { systemKey: OTHER_SYSTEM_KEY, category_name: OTHER_CATEGORY_NAME } },
        { new: true },
    );
};

/**
 * Return the system "Other" category, creating (or adopting) it on first use.
 *
 * Safe under concurrent calls: the partial unique index on systemKey means at
 * most one document can ever carry the key, so a loser of any race gets an
 * E11000 or a no-match, re-reads and returns the winner's document.
 */
export async function getOrCreateOtherCategory() {
    // Make sure the unique index is built before relying on it for the race.
    // After the first call this is just an awaited, already-settled promise.
    try {
        await CategoryModel.init();
    } catch (err) {
        logger.warn({ err }, 'Category indexes could not be built; Other category lookup is not race-safe');
    }

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const existing = await CategoryModel.findOne({ systemKey: OTHER_SYSTEM_KEY });
        if (existing) return existing;

        try {
            const adopted = await adoptExistingOther();
            if (adopted) return adopted;

            // Also correct when adoption lost a race: the upsert then matches
            // the winner's document instead of inserting.
            const upserted = await CategoryModel.findOneAndUpdate(
                { systemKey: OTHER_SYSTEM_KEY },
                { $setOnInsert: { category_name: OTHER_CATEGORY_NAME, category_image: '' } },
                { upsert: true, new: true },
            );
            if (upserted) return upserted;
        } catch (err) {
            if (err?.code !== 11000) throw err;
            // Lost the race on the unique index: loop and read the winner.
        }
    }

    throw new Error('Could not resolve the Other category');
}
