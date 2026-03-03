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
const approvalArg = getArg("--approvalId") ?? getArg("--approvalIds") ?? getArg("--id");
const batchId = getArg("--batchId");
const entityArg = getArg("--entity") ?? getArg("--entityId") ?? getArg("--short");
const apply = hasFlag("--apply");
const includeAll = hasFlag("--all");
const pageSize = Number(getArg("--pageSize") ?? "500");
const limit = Number(getArg("--limit") ?? "0");
const ApprovalSchema = new mongoose_1.Schema({
    batchId: String,
    entity: mongoose_1.Schema.Types.Mixed,
    reviewerApprovedBy: mongoose_1.Schema.Types.Mixed,
    reviewerApprovedByName: String,
    approverApprovedBy: mongoose_1.Schema.Types.Mixed,
    approverApprovedByName: String,
    postingApprovedBy: mongoose_1.Schema.Types.Mixed,
    postingApprovedByName: String,
}, { strict: false, timestamps: true });
const UserSchema = new mongoose_1.Schema({
    name: String,
    firstName: String,
    middleName: String,
    lastName: String,
    staffId: String,
    userId: String,
    email: String,
}, { strict: false });
const SubsidiarySchema = new mongoose_1.Schema({ name: String, short: String, code: String }, { strict: false });
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeText = (value) => value === null || value === undefined ? "" : String(value).trim();
const isBlank = (value) => {
    const trimmed = normalizeText(value);
    if (!trimmed)
        return true;
    const lowered = trimmed.toLowerCase();
    return lowered === "undefined" || lowered === "null" || lowered === "-";
};
const normalizeId = (value) => {
    if (!value)
        return null;
    if (typeof value === "object") {
        const resolved = value?._id ?? value?.id ?? value?.userId ?? value?.toString?.();
        return resolved ? normalizeText(resolved) : null;
    }
    const trimmed = normalizeText(value);
    return trimmed || null;
};
const buildEntityQuery = (entityId) => {
    if (!entityId)
        return {};
    if (mongoose_1.Types.ObjectId.isValid(entityId)) {
        const objectId = new mongoose_1.Types.ObjectId(entityId);
        return { $or: [{ entity: entityId }, { entity: objectId }] };
    }
    return { entity: entityId };
};
const resolveEntity = async (entityValue, SubsidiaryModel) => {
    const trimmed = normalizeText(entityValue);
    if (!trimmed) {
        return { entityId: null };
    }
    if (mongoose_1.Types.ObjectId.isValid(trimmed)) {
        return { entityId: trimmed };
    }
    const shortRegex = new RegExp(`^${escapeRegex(trimmed)}$`, "i");
    const byShort = (await SubsidiaryModel.findOne({ short: shortRegex }).lean());
    if (byShort?._id) {
        return { entityId: String(byShort._id) };
    }
    const byName = (await SubsidiaryModel.findOne({ name: shortRegex }).lean());
    if (byName?._id) {
        return { entityId: String(byName._id) };
    }
    return { entityId: trimmed };
};
const buildUserName = (user) => {
    const direct = normalizeText(user?.name);
    if (direct)
        return direct;
    const parts = [
        normalizeText(user?.firstName),
        normalizeText(user?.middleName),
        normalizeText(user?.lastName),
    ].filter(Boolean);
    return parts.length ? parts.join(" ") : null;
};
const registerKey = (map, key, name) => {
    const normalized = normalizeText(key);
    if (!normalized)
        return;
    if (!map.has(normalized)) {
        map.set(normalized, name);
    }
    const lower = normalized.toLowerCase();
    if (!map.has(lower)) {
        map.set(lower, name);
    }
    const upper = normalized.toUpperCase();
    if (!map.has(upper)) {
        map.set(upper, name);
    }
};
const buildUserDirectory = (users) => {
    const directory = new Map();
    users.forEach((user) => {
        const name = buildUserName(user);
        if (!name)
            return;
        registerKey(directory, user?._id, name);
        registerKey(directory, user?.userId, name);
        registerKey(directory, user?.staffId, name);
        registerKey(directory, user?.email, name);
    });
    return directory;
};
const resolveDirectoryName = (directory, id) => {
    const key = normalizeId(id);
    if (!key)
        return undefined;
    return directory.get(key) ?? directory.get(key.toLowerCase()) ?? directory.get(key.toUpperCase());
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
        orFilters.push({ email: { $in: ids } });
    }
    return orFilters.length ? { $or: orFilters } : null;
};
const run = async () => {
    const mainConn = await mongoose_1.default.createConnection(config_1.config.mainDB).asPromise();
    const staffConn = await mongoose_1.default.createConnection(config_1.config.authDB).asPromise();
    const ApprovalModel = mainConn.model("PayrollApproval", ApprovalSchema, "payrollapprovals");
    const UserModel = staffConn.model("User", UserSchema, "users");
    const SubsidiaryModel = staffConn.model("Subsidiary", SubsidiarySchema, "subsidiaries");
    const stats = {
        scanned: 0,
        matched: 0,
        updated: 0,
        reviewer: 0,
        approver: 0,
        posting: 0,
    };
    try {
        const query = {};
        if (!includeAll) {
            query.$or = [
                { reviewerApprovedByName: { $exists: false } },
                { reviewerApprovedByName: null },
                { reviewerApprovedByName: "" },
                { approverApprovedByName: { $exists: false } },
                { approverApprovedByName: null },
                { approverApprovedByName: "" },
                { postingApprovedByName: { $exists: false } },
                { postingApprovedByName: null },
                { postingApprovedByName: "" },
            ];
        }
        const approvalIds = approvalArg
            ? approvalArg
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean)
            : [];
        const approvalObjectIds = approvalIds
            .filter((value) => mongoose_1.Types.ObjectId.isValid(value))
            .map((value) => new mongoose_1.Types.ObjectId(value));
        if (approvalObjectIds.length) {
            query._id = { $in: approvalObjectIds };
        }
        else if (approvalIds.length) {
            console.warn("No valid approval ObjectIds found; skipping approvalId filter.");
        }
        if (batchId) {
            query.batchId = batchId;
        }
        if (entityArg) {
            const { entityId } = await resolveEntity(entityArg, SubsidiaryModel);
            Object.assign(query, buildEntityQuery(entityId ?? entityArg));
        }
        const shouldPaginate = !query._id;
        let lastId = null;
        while (true) {
            const pageQuery = { ...query };
            if (shouldPaginate && lastId) {
                pageQuery._id = { $gt: lastId };
            }
            const approvals = await ApprovalModel.find(pageQuery)
                .sort({ _id: 1 })
                .limit(shouldPaginate ? pageSize : 0)
                .lean();
            if (!approvals.length) {
                break;
            }
            if (shouldPaginate) {
                const last = approvals[approvals.length - 1]?._id;
                if (last) {
                    lastId = last;
                }
            }
            stats.scanned += approvals.length;
            const idSet = new Set();
            approvals.forEach((approval) => {
                [approval?.reviewerApprovedBy, approval?.approverApprovedBy, approval?.postingApprovedBy]
                    .map(normalizeId)
                    .filter(Boolean)
                    .forEach((id) => idSet.add(id));
            });
            const userQuery = buildUserQuery(Array.from(idSet));
            const users = userQuery ? await UserModel.find(userQuery).lean() : [];
            const directory = buildUserDirectory(users);
            const updates = [];
            approvals.forEach((approval) => {
                const updatePayload = {};
                const reviewerName = isBlank(approval?.reviewerApprovedByName)
                    ? resolveDirectoryName(directory, approval?.reviewerApprovedBy)
                    : null;
                if (reviewerName) {
                    updatePayload.reviewerApprovedByName = reviewerName;
                    stats.reviewer += 1;
                }
                const approverName = isBlank(approval?.approverApprovedByName)
                    ? resolveDirectoryName(directory, approval?.approverApprovedBy)
                    : null;
                if (approverName) {
                    updatePayload.approverApprovedByName = approverName;
                    stats.approver += 1;
                }
                const postingName = isBlank(approval?.postingApprovedByName)
                    ? resolveDirectoryName(directory, approval?.postingApprovedBy)
                    : null;
                if (postingName) {
                    updatePayload.postingApprovedByName = postingName;
                    stats.posting += 1;
                }
                if (Object.keys(updatePayload).length) {
                    stats.matched += 1;
                    updates.push({
                        updateOne: {
                            filter: { _id: approval._id },
                            update: { $set: updatePayload },
                        },
                    });
                }
            });
            if (apply && updates.length) {
                await ApprovalModel.bulkWrite(updates, { ordered: false });
                stats.updated += updates.length;
                console.log(`Updated ${updates.length} approvals in batch (scanned ${approvals.length}).`);
            }
            else {
                console.log(`Dry run batch: would update ${updates.length} approvals (scanned ${approvals.length}).`);
            }
            if (!shouldPaginate) {
                break;
            }
            if (limit > 0 && stats.scanned >= limit) {
                console.log(`Reached limit of ${limit} approvals; stopping.`);
                break;
            }
        }
    }
    finally {
        await mainConn.close();
        await staffConn.close();
    }
    console.log(`Done. scanned=${stats.scanned}, matched=${stats.matched}, updated=${stats.updated}, reviewer=${stats.reviewer}, approver=${stats.approver}, posting=${stats.posting}`);
};
if (hasFlag("--help")) {
    console.log("Usage: npx ts-node --project tsconfig.json scripts/backfill-payroll-approval-names.ts [--apply] [--approvalId <id>] [--batchId <id>] [--entity <id|short>] [--pageSize 500] [--limit 1000] [--all]");
    process.exit(0);
}
run().catch((error) => {
    console.error("Backfill failed:", error);
    process.exitCode = 1;
});
//# sourceMappingURL=backfill-payroll-approval-names.js.map