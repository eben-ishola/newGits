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
const all = hasFlag("--all");
const rowTypeFilter = getArg("--type")?.toLowerCase() ?? getArg("--rowType")?.toLowerCase();
const apply = hasFlag("--apply");
const overwrite = hasFlag("--overwrite");
const updateBranch = hasFlag("--update-branch");
const updateAccount = !hasFlag("--skip-account");
const updatePensionAccount = hasFlag("--update-pension") || hasFlag("--pension");
const updateNhfAccount = hasFlag("--update-nhf") || hasFlag("--nhf");
const updatePayeAccount = hasFlag("--update-paye") || hasFlag("--paye") || hasFlag("--tax");
const onlyPension = hasFlag("--only-pension");
const onlyIdentifiers = hasFlag("--only-identifiers") || hasFlag("--only-ids");
if (!approvalArg && !batchId && !all) {
    console.error("Usage: npx ts-node --project tsconfig.json scripts/backfill-payroll-approval-accounts.ts --approvalId <id>[,<id>] [--apply] [--overwrite] [--update-branch] [--skip-account] [--update-pension] [--update-nhf] [--update-paye] [--only-pension] [--only-identifiers] [--type salary] [--all]");
    process.exit(1);
}
const approvalIds = approvalArg
    ? approvalArg
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];
const ApprovalSchema = new mongoose_1.Schema({
    batchId: String,
    entity: mongoose_1.Schema.Types.Mixed,
    status: String,
    data: { type: [mongoose_1.Schema.Types.Mixed], default: [] },
}, { strict: false, timestamps: true });
const BranchSchema = new mongoose_1.Schema({ name: String, short: String, code: String, gl: String, entity: mongoose_1.Schema.Types.Mixed }, { strict: false });
const UserSchema = new mongoose_1.Schema({
    staffId: String,
    addosserAccount: String,
    atlasAccount: String,
    branch: { type: mongoose_1.Schema.Types.ObjectId, ref: "Branch" },
    entity: mongoose_1.Schema.Types.Mixed,
    employeeInformation: mongoose_1.Schema.Types.Mixed,
}, { strict: false });
const buildModels = (mainConn, staffConn) => {
    const ApprovalModel = mainConn.model("PayrollApproval", ApprovalSchema, "payrollapprovals");
    const BranchModel = staffConn.model("Branch", BranchSchema, "branches");
    const UserModel = staffConn.model("User", UserSchema, "users");
    return { ApprovalModel, BranchModel, UserModel };
};
const cleanText = (value) => (value == null ? "" : String(value).trim());
const isBlank = (value) => {
    const normalized = cleanText(value);
    if (!normalized)
        return true;
    const lowered = normalized.toLowerCase();
    return lowered === "undefined" || lowered === "null" || lowered === "-";
};
const resolveEntityId = (value) => {
    if (!value)
        return null;
    if (typeof value === "object") {
        return (value?._id ??
            value?.id ??
            value?.entityId ??
            value?.value ??
            value?.data ??
            null);
    }
    return value;
};
const buildEntityQuery = (entityId) => {
    if (!entityId)
        return {};
    const raw = cleanText(entityId);
    if (!raw)
        return {};
    if (mongoose_1.Types.ObjectId.isValid(raw)) {
        return { $or: [{ entity: raw }, { entity: new mongoose_1.Types.ObjectId(raw) }] };
    }
    return { entity: raw };
};
const resolveBranchName = (branch) => {
    if (!branch)
        return "";
    if (typeof branch === "string")
        return branch.trim();
    if (typeof branch === "object") {
        return cleanText(branch?.name ?? branch?.short ?? branch?.code);
    }
    return cleanText(branch);
};
const normalizeBranchKey = (branch) => {
    const name = resolveBranchName(branch);
    return name ? name.trim().toLowerCase() : "";
};
const buildBranchAliasMap = (branches) => {
    const map = new Map();
    (branches || []).forEach((branch) => {
        const canonical = resolveBranchName(branch);
        if (!canonical)
            return;
        const aliases = [branch?.name, branch?.short, branch?.code, canonical];
        aliases.forEach((alias) => {
            const key = normalizeBranchKey(alias);
            if (key && !map.has(key)) {
                map.set(key, canonical);
            }
        });
    });
    return map;
};
const resolveRowAddosser = (row) => {
    const direct = cleanText(row?.addosserAccount ?? row?.addosser);
    if (direct)
        return direct;
    const fromAccount = cleanText(row?.account ?? row?.accountNumber ?? row?.accountNo);
    return fromAccount || "";
};
const resolveRowAtlas = (row) => {
    const direct = cleanText(row?.atlasAccount ?? row?.atlas);
    if (direct)
        return direct;
    const type = String(row?.type ?? "").toLowerCase();
    const fromAccount = cleanText(row?.account ?? row?.accountNumber ?? row?.accountNo);
    if (fromAccount && ["bank", "individual", "variable"].includes(type)) {
        return fromAccount;
    }
    return "";
};
const resolveAccountForRow = (row) => {
    const type = String(row?.type ?? "").toLowerCase();
    const addosser = cleanText(row?.addosserAccount ?? row?.addosser);
    const atlas = cleanText(row?.atlasAccount ?? row?.atlas);
    const base = cleanText(row?.account ?? row?.accountNo ?? row?.accountNumber);
    if (["salary", "reimbursable"].includes(type)) {
        return addosser || base || atlas;
    }
    if (["bank", "individual", "variable"].includes(type)) {
        return atlas || base || addosser;
    }
    return base || addosser || atlas;
};
const resolvePensionAccount = (row, staff) => {
    const staffDetail = staff?.employeeInformation?.accountDetail ?? null;
    const fromStaff = cleanText(staffDetail?.pensionAccount ??
        staffDetail?.rsaNumber ??
        staff?.employeeInformation?.pensionAccount ??
        staff?.employeeInformation?.rsaNumber);
    if (fromStaff)
        return fromStaff;
    const detail = row?.accountDetail ??
        row?.employeeInformation?.accountDetail ??
        null;
    const fromDetail = cleanText(detail?.pensionAccount ?? detail?.rsaNumber);
    if (fromDetail)
        return fromDetail;
    const direct = cleanText(row?.pensionAccount ?? row?.rsaPin ?? row?.rsaNumber ?? row?.rsa);
    return direct || "";
};
const resolveNhfAccount = (row, staff) => {
    const staffDetail = staff?.employeeInformation?.accountDetail ?? null;
    const fromStaff = cleanText(staffDetail?.nhfAccount ??
        staffDetail?.nhf ??
        staff?.employeeInformation?.nhfAccount ??
        staff?.employeeInformation?.nhf);
    if (fromStaff)
        return fromStaff;
    const detail = row?.accountDetail ??
        row?.employeeInformation?.accountDetail ??
        null;
    const fromDetail = cleanText(detail?.nhfAccount ?? detail?.nhf);
    if (fromDetail)
        return fromDetail;
    const direct = cleanText(row?.nhfAccount ?? row?.nhfNumber ?? row?.nhfNo ?? row?.nhfPin ?? row?.nhf);
    return direct || "";
};
const resolvePayeAccount = (row, staff) => {
    const staffDetail = staff?.employeeInformation?.accountDetail ?? null;
    const fromStaff = cleanText(staffDetail?.payeAccount ??
        staffDetail?.taxProfileId ??
        staffDetail?.taxId ??
        staffDetail?.taxID ??
        staff?.employeeInformation?.payeAccount ??
        staff?.employeeInformation?.taxProfileId ??
        staff?.employeeInformation?.taxId ??
        staff?.employeeInformation?.taxID);
    if (fromStaff)
        return fromStaff;
    const detail = row?.accountDetail ??
        row?.employeeInformation?.accountDetail ??
        null;
    const fromDetail = cleanText(detail?.payeAccount ?? detail?.taxProfileId ?? detail?.taxId ?? detail?.taxID);
    if (fromDetail)
        return fromDetail;
    const direct = cleanText(row?.payeAccount ??
        row?.taxProfileId ??
        row?.taxId ??
        row?.taxID ??
        row?.paye);
    return direct || "";
};
const registerStaffKey = (map, key, staff) => {
    const normalized = cleanText(key);
    if (!normalized)
        return;
    if (!map.has(normalized)) {
        map.set(normalized, staff);
    }
};
const resolveStaffForRow = (row, map) => {
    const candidates = [
        row?.staffId,
        row?.staffObjectId,
        row?.employeeId,
        row?.userId,
        row?.id,
        row?._id,
    ];
    for (const candidate of candidates) {
        const key = cleanText(candidate);
        if (!key)
            continue;
        const match = map.get(key);
        if (match)
            return match;
    }
    return null;
};
const buildStaffLookup = (staffRows) => {
    const lookup = new Map();
    staffRows.forEach((staff) => {
        registerStaffKey(lookup, staff?._id, staff);
        registerStaffKey(lookup, staff?.id, staff);
        registerStaffKey(lookup, staff?.staffId, staff);
        registerStaffKey(lookup, staff?.userId, staff);
        registerStaffKey(lookup, staff?.employeeId, staff);
    });
    return lookup;
};
const shouldUpdate = (existing, incoming) => Boolean(incoming) && (overwrite || isBlank(existing));
const updateApprovalRows = (rows, staffLookup, branchAliasMap, typeFilter) => {
    const stats = {
        rows: rows.length,
        updatedRows: 0,
        updatedAddosser: 0,
        updatedAtlas: 0,
        updatedAccount: 0,
        updatedBranch: 0,
        updatedPensionAccount: 0,
        updatedNhfAccount: 0,
        updatedPayeAccount: 0,
        updatedTaxId: 0,
        missingStaff: 0,
    };
    const normalizeType = (value) => cleanText(value).toLowerCase();
    const normalizedFilter = typeFilter ? normalizeType(typeFilter) : "";
    const updatedRows = rows.map((row) => {
        if (!row || typeof row !== "object")
            return row;
        const rowType = normalizeType(row?.type);
        if (normalizedFilter && rowType !== normalizedFilter) {
            return row;
        }
        const staff = resolveStaffForRow(row, staffLookup);
        if (!staff) {
            stats.missingStaff += 1;
        }
        const next = { ...row };
        let changed = false;
        const skipNonIdentifierUpdates = onlyPension || onlyIdentifiers;
        if (!skipNonIdentifierUpdates) {
            const addosserAccount = cleanText(staff?.addosserAccount) || resolveRowAddosser(row);
            if (shouldUpdate(row?.addosserAccount, addosserAccount)) {
                next.addosserAccount = addosserAccount;
                stats.updatedAddosser += 1;
                changed = true;
            }
            if (shouldUpdate(row?.addosser, addosserAccount)) {
                next.addosser = addosserAccount;
                changed = true;
            }
            const atlasAccount = cleanText(staff?.atlasAccount) || resolveRowAtlas(row);
            if (shouldUpdate(row?.atlasAccount, atlasAccount)) {
                next.atlasAccount = atlasAccount;
                stats.updatedAtlas += 1;
                changed = true;
            }
            if (shouldUpdate(row?.atlas, atlasAccount)) {
                next.atlas = atlasAccount;
                changed = true;
            }
            const currentBranch = resolveBranchName(row?.branch);
            const currentBranchKey = normalizeBranchKey(currentBranch);
            const branchFromStaff = resolveBranchName(staff?.branch);
            const canonicalBranch = branchFromStaff || (currentBranchKey ? branchAliasMap.get(currentBranchKey) : "") || "";
            const shouldNormalizeBranch = canonicalBranch &&
                currentBranch &&
                normalizeBranchKey(canonicalBranch) === normalizeBranchKey(currentBranch) &&
                currentBranch !== canonicalBranch;
            if ((updateBranch && canonicalBranch && currentBranch !== canonicalBranch) ||
                (isBlank(row?.branch) && canonicalBranch) ||
                shouldNormalizeBranch) {
                next.branch = canonicalBranch;
                stats.updatedBranch += 1;
                changed = true;
            }
            if (updateAccount) {
                const resolvedAccount = resolveAccountForRow(next);
                if (shouldUpdate(row?.account, resolvedAccount)) {
                    next.account = resolvedAccount;
                    stats.updatedAccount += 1;
                    changed = true;
                }
            }
        }
        if (updatePensionAccount) {
            const shouldUpdateRow = !rowType || ["salary", "pension", "companypension"].includes(rowType);
            if (shouldUpdateRow) {
                const resolvedPension = resolvePensionAccount(row, staff);
                if (shouldUpdate(row?.pensionAccount, resolvedPension)) {
                    next.pensionAccount = resolvedPension;
                    stats.updatedPensionAccount += 1;
                    changed = true;
                }
                if (shouldUpdate(row?.rsaNumber, resolvedPension)) {
                    next.rsaNumber = resolvedPension;
                    stats.updatedPensionAccount += 1;
                    changed = true;
                }
            }
        }
        if (!onlyPension && updateNhfAccount) {
            const shouldUpdateRow = !rowType || ["salary", "nhf"].includes(rowType);
            if (shouldUpdateRow) {
                const resolvedNhf = resolveNhfAccount(row, staff);
                if (shouldUpdate(row?.nhfAccount, resolvedNhf)) {
                    next.nhfAccount = resolvedNhf;
                    stats.updatedNhfAccount += 1;
                    changed = true;
                }
            }
        }
        if (!onlyPension && updatePayeAccount) {
            const shouldUpdateRow = !rowType || ["salary", "paye"].includes(rowType);
            if (shouldUpdateRow) {
                const resolvedPaye = resolvePayeAccount(row, staff);
                if (shouldUpdate(row?.payeAccount, resolvedPaye)) {
                    next.payeAccount = resolvedPaye;
                    stats.updatedPayeAccount += 1;
                    changed = true;
                }
                if (shouldUpdate(row?.taxId, resolvedPaye)) {
                    next.taxId = resolvedPaye;
                    stats.updatedTaxId += 1;
                    changed = true;
                }
                if (shouldUpdate(row?.taxID, resolvedPaye)) {
                    next.taxID = resolvedPaye;
                    stats.updatedTaxId += 1;
                    changed = true;
                }
                if (shouldUpdate(row?.taxProfileId, resolvedPaye)) {
                    next.taxProfileId = resolvedPaye;
                    stats.updatedTaxId += 1;
                    changed = true;
                }
            }
        }
        if (changed) {
            stats.updatedRows += 1;
        }
        return next;
    });
    return { updatedRows, stats };
};
const formatStats = (stats) => [
    `rows=${stats.rows}`,
    `updatedRows=${stats.updatedRows}`,
    `addosser=${stats.updatedAddosser}`,
    `atlas=${stats.updatedAtlas}`,
    `account=${stats.updatedAccount}`,
    `branch=${stats.updatedBranch}`,
    `pensionAccount=${stats.updatedPensionAccount}`,
    `nhfAccount=${stats.updatedNhfAccount}`,
    `payeAccount=${stats.updatedPayeAccount}`,
    `taxId=${stats.updatedTaxId}`,
    `missingStaff=${stats.missingStaff}`,
].join(", ");
const run = async () => {
    const mainConn = await mongoose_1.default.createConnection(config_1.config.mainDB).asPromise();
    const staffConn = await mongoose_1.default.createConnection(config_1.config.authDB).asPromise();
    const { ApprovalModel, BranchModel, UserModel } = buildModels(mainConn, staffConn);
    try {
        const query = {};
        if (approvalIds.length) {
            query._id = { $in: approvalIds };
        }
        if (batchId) {
            query.batchId = batchId;
        }
        if (all && rowTypeFilter) {
            query.data = { $elemMatch: { type: rowTypeFilter } };
        }
        const approvals = await ApprovalModel.find(query);
        if (!approvals.length) {
            console.log("No approvals matched the provided criteria.");
            return;
        }
        for (const approval of approvals) {
            const entityId = resolveEntityId(approval.entity);
            const staffQuery = buildEntityQuery(entityId);
            const branchQuery = buildEntityQuery(entityId);
            const staffRows = await UserModel.find(staffQuery)
                .populate({ path: "branch", options: { lean: true } })
                .lean();
            const staffLookup = buildStaffLookup(staffRows);
            const branchRows = await BranchModel.find(branchQuery).lean();
            const branchAliasMap = buildBranchAliasMap(branchRows);
            const sourceRows = Array.isArray(approval.data) ? approval.data : [];
            const { updatedRows, stats } = updateApprovalRows(sourceRows, staffLookup, branchAliasMap, rowTypeFilter);
            const approvalStatus = String(approval.status ?? "");
            if (["PENDING_POSTING", "APPROVED"].includes(approvalStatus)) {
                console.warn(`Approval ${approval._id} is ${approvalStatus}; processed payroll may already exist.`);
            }
            if (apply && stats.updatedRows > 0) {
                approval.data = updatedRows;
                approval.markModified("data");
                await approval.save();
                console.log(`Updated approval ${approval._id}: ${formatStats(stats)}`);
            }
            else {
                console.log(`Dry run for approval ${approval._id}: ${formatStats(stats)}`);
            }
        }
    }
    finally {
        await mainConn.close();
        await staffConn.close();
    }
};
run().catch((error) => {
    console.error("Backfill failed:", error);
    process.exitCode = 1;
});
//# sourceMappingURL=backfill-payroll-approval-accounts.js.map