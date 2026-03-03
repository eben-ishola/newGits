"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const config_1 = require("../src/config");
const argv = process.argv.slice(2);
const hasFlag = (flag) => argv.includes(flag);
const getArg = (flag) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
};
const apply = hasFlag("--apply");
const includeAll = hasFlag("--all");
const caseArg = getArg("--caseId") ?? getArg("--caseIds") ?? getArg("--id");
const pageSize = Number(getArg("--pageSize") ?? "500");
const limit = Number(getArg("--limit") ?? "0");
const DisciplinaryCaseSchema = new mongoose_1.Schema({
    employeeId: String,
    entity: mongoose_1.Schema.Types.Mixed,
}, { strict: false, timestamps: true });
const UserSchema = new mongoose_1.Schema({
    staffId: String,
    userId: String,
    employeeId: String,
    entity: mongoose_1.Schema.Types.Mixed,
}, { strict: false });
const normalizeText = (value) => value === null || value === undefined ? "" : String(value).trim();
const normalizeId = (value) => {
    if (!value)
        return null;
    if (typeof value === "object") {
        const resolved = value?._id ?? value?.id ?? value?.employeeId ?? value?.userId ?? value?.toString?.();
        const text = normalizeText(resolved);
        return text || null;
    }
    const trimmed = normalizeText(value);
    return trimmed || null;
};
const normalizeEntity = (value) => {
    const resolved = normalizeId(value);
    return resolved ? resolved : null;
};
const hasEntityValue = (value) => {
    const resolved = normalizeEntity(value);
    return Boolean(resolved);
};
const buildUserQuery = (ids) => {
    const objectIds = ids
        .filter((value) => mongoose_1.Types.ObjectId.isValid(value))
        .map((value) => new mongoose_1.Types.ObjectId(value));
    const orFilters = [];
    if (objectIds.length) {
        orFilters.push({ _id: { $in: objectIds } });
    }
    if (ids.length) {
        orFilters.push({ userId: { $in: ids } });
        orFilters.push({ staffId: { $in: ids } });
        orFilters.push({ employeeId: { $in: ids } });
    }
    return orFilters.length ? { $or: orFilters } : null;
};
const run = async () => {
    const mainConn = await mongoose_1.default.createConnection(config_1.config.mainDB).asPromise();
    const authConn = await mongoose_1.default.createConnection(config_1.config.authDB).asPromise();
    const CaseModel = mainConn.model("DisciplinaryCase", DisciplinaryCaseSchema, "disciplinarycases");
    const UserModel = authConn.model("User", UserSchema, "users");
    const stats = {
        scanned: 0,
        matched: 0,
        updated: 0,
        skippedExisting: 0,
        missingEmployeeId: 0,
        missingUser: 0,
        conflictingEntity: 0,
    };
    try {
        const query = {};
        if (!includeAll) {
            query.$or = [
                { entity: { $exists: false } },
                { entity: null },
                { entity: "" },
            ];
        }
        const caseIds = caseArg
            ? caseArg
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean)
            : [];
        const caseObjectIds = caseIds
            .filter((value) => mongoose_1.Types.ObjectId.isValid(value))
            .map((value) => new mongoose_1.Types.ObjectId(value));
        if (caseObjectIds.length) {
            query._id = { $in: caseObjectIds };
        }
        else if (caseIds.length) {
            console.warn("No valid disciplinary case ObjectIds found; skipping caseId filter.");
        }
        const shouldPaginate = !query._id;
        let lastId = null;
        while (true) {
            const pageQuery = { ...query };
            if (shouldPaginate && lastId) {
                pageQuery._id = { $gt: lastId };
            }
            const cases = await CaseModel.find(pageQuery)
                .sort({ _id: 1 })
                .limit(shouldPaginate ? pageSize : 0)
                .lean();
            if (!cases.length) {
                break;
            }
            if (shouldPaginate) {
                const last = cases[cases.length - 1]?._id;
                if (last) {
                    lastId = last;
                }
            }
            stats.scanned += cases.length;
            const idSet = new Set();
            cases.forEach((item) => {
                const employeeId = normalizeId(item?.employeeId);
                if (employeeId) {
                    idSet.add(employeeId);
                }
            });
            const userQuery = buildUserQuery(Array.from(idSet));
            const users = userQuery ? await UserModel.find(userQuery).lean() : [];
            const entityById = new Map();
            users.forEach((user) => {
                const entity = normalizeEntity(user?.entity);
                if (!entity)
                    return;
                const register = (key) => {
                    const normalized = normalizeId(key);
                    if (!normalized)
                        return;
                    const existing = entityById.get(normalized);
                    if (existing && existing !== entity) {
                        stats.conflictingEntity += 1;
                        return;
                    }
                    entityById.set(normalized, entity);
                };
                register(user?._id);
                register(user?.userId);
                register(user?.staffId);
                register(user?.employeeId);
            });
            const updates = [];
            cases.forEach((item) => {
                if (!includeAll && hasEntityValue(item?.entity)) {
                    stats.skippedExisting += 1;
                    return;
                }
                const employeeId = normalizeId(item?.employeeId);
                if (!employeeId) {
                    stats.missingEmployeeId += 1;
                    return;
                }
                const entity = entityById.get(employeeId);
                if (!entity) {
                    stats.missingUser += 1;
                    return;
                }
                stats.matched += 1;
                updates.push({
                    updateOne: {
                        filter: { _id: item._id },
                        update: { $set: { entity } },
                    },
                });
            });
            if (apply && updates.length) {
                await CaseModel.bulkWrite(updates, { ordered: false });
                stats.updated += updates.length;
                console.log(`Updated ${updates.length} cases in batch (scanned ${cases.length}).`);
            }
            else {
                console.log(`Dry run batch: would update ${updates.length} cases (scanned ${cases.length}).`);
            }
            if (!shouldPaginate) {
                break;
            }
            if (limit > 0 && stats.scanned >= limit) {
                console.log(`Reached limit of ${limit} cases; stopping.`);
                break;
            }
        }
    }
    finally {
        await mainConn.close();
        await authConn.close();
    }
    console.log(`Done. scanned=${stats.scanned}, matched=${stats.matched}, updated=${stats.updated}, skippedExisting=${stats.skippedExisting}, missingEmployeeId=${stats.missingEmployeeId}, missingUser=${stats.missingUser}, conflictingEntity=${stats.conflictingEntity}`);
};
if (hasFlag("--help")) {
    console.log("Usage: npx ts-node --project tsconfig.json scripts/backfill-disciplinary-entity.ts [--apply] [--caseId <id>] [--pageSize 500] [--limit 1000] [--all]");
    process.exit(0);
}
run().catch((error) => {
    console.error("Backfill failed:", error);
    process.exitCode = 1;
});
//# sourceMappingURL=backfill-disciplinary-entity.js.map