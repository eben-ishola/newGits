"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
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
const entityArg = getArg("--entity") ?? getArg("--entityShort") ?? getArg("--short") ?? "AIBL";
const outArg = getArg("--out") ?? getArg("--output");
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const sanitizeFileName = (value) => value.replace(/[^a-zA-Z0-9_-]+/g, "-");
const toObjectId = (value) => {
    if (!value)
        return null;
    if (!mongoose_1.Types.ObjectId.isValid(value))
        return null;
    return new mongoose_1.Types.ObjectId(value);
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
const ApprovalSchema = new mongoose_1.Schema({
    batchId: String,
    entity: mongoose_1.Schema.Types.Mixed,
    status: String,
    data: { type: [mongoose_1.Schema.Types.Mixed], default: [] },
    types: [String],
}, { strict: false, timestamps: true });
const ProcessedSchema = new mongoose_1.Schema({
    batchId: String,
    entity: mongoose_1.Schema.Types.Mixed,
    type: String,
    name: String,
    staffId: String,
    staffObjectId: String,
    employeeId: String,
    userId: String,
    grade: String,
    branch: String,
    account: String,
    accountNo: String,
    amount: mongoose_1.Schema.Types.Mixed,
    basic: mongoose_1.Schema.Types.Mixed,
    housing: mongoose_1.Schema.Types.Mixed,
    transport: mongoose_1.Schema.Types.Mixed,
    dress: mongoose_1.Schema.Types.Mixed,
    utilities: mongoose_1.Schema.Types.Mixed,
    lunch: mongoose_1.Schema.Types.Mixed,
    telephone: mongoose_1.Schema.Types.Mixed,
    gross: mongoose_1.Schema.Types.Mixed,
    pension: mongoose_1.Schema.Types.Mixed,
    companyPension: mongoose_1.Schema.Types.Mixed,
    nhf: mongoose_1.Schema.Types.Mixed,
    paye: mongoose_1.Schema.Types.Mixed,
    nhfAccount: String,
    payeAccount: String,
    pensionAccount: String,
    pensionProvider: String,
    period: String,
    periodKey: String,
    periodDate: Date,
}, { strict: false, timestamps: true });
const WorkflowSchema = new mongoose_1.Schema({
    entity: mongoose_1.Schema.Types.Mixed,
    initiatorIds: [String],
    reviewerIds: [String],
    auditViewerIds: [String],
    approverIds: [String],
    postingIds: [String],
}, { strict: false, timestamps: true });
const SubsidiarySchema = new mongoose_1.Schema({ name: String, short: String, code: String }, { strict: false });
const resolveEntity = async (entityValue, SubsidiaryModel) => {
    const trimmed = String(entityValue ?? "").trim();
    if (!trimmed) {
        return { entityId: null, entityDoc: null };
    }
    if (mongoose_1.Types.ObjectId.isValid(trimmed)) {
        return { entityId: trimmed, entityDoc: null };
    }
    const shortRegex = new RegExp(`^${escapeRegex(trimmed)}$`, "i");
    const byShort = (await SubsidiaryModel.findOne({ short: shortRegex }).lean());
    if (byShort?._id) {
        return { entityId: String(byShort._id), entityDoc: byShort };
    }
    const byName = (await SubsidiaryModel.findOne({ name: shortRegex }).lean());
    if (byName?._id) {
        return { entityId: String(byName._id), entityDoc: byName };
    }
    return { entityId: trimmed, entityDoc: null };
};
const run = async () => {
    const mainConn = await mongoose_1.default.createConnection(config_1.config.mainDB).asPromise();
    const staffConn = await mongoose_1.default.createConnection(config_1.config.authDB).asPromise();
    const ApprovalModel = mainConn.model("PayrollApproval", ApprovalSchema, "payrollapprovals");
    const WorkflowModel = mainConn.model("PayrollWorkflowConfig", WorkflowSchema, "payrollworkflowconfigs");
    const ProcessedModel = mainConn.model("ProcessedPayroll", ProcessedSchema);
    const SubsidiaryModel = staffConn.model("Subsidiary", SubsidiarySchema, "subsidiaries");
    try {
        const { entityId, entityDoc } = await resolveEntity(entityArg, SubsidiaryModel);
        const query = {};
        const approvalIds = approvalArg
            ? approvalArg
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean)
            : [];
        const approvalObjectIds = approvalIds
            .map((value) => toObjectId(value))
            .filter(Boolean);
        if (approvalObjectIds.length) {
            query._id = { $in: approvalObjectIds };
        }
        else if (approvalIds.length) {
            console.warn("No valid approval ObjectIds found; skipping approvalId filter.");
        }
        if (batchId) {
            query.batchId = batchId;
        }
        if (!approvalIds.length && !batchId && entityId) {
            Object.assign(query, buildEntityQuery(entityId));
        }
        let approval = Object.keys(query).length
            ? await ApprovalModel.findOne(query).sort({ createdAt: -1 }).lean()
            : null;
        const workflowQuery = buildEntityQuery(entityId);
        const workflow = entityId
            ? await WorkflowModel.findOne(workflowQuery).lean()
            : null;
        let reconstructedFromProcessed = false;
        if (!approval && batchId) {
            const processedRows = await ProcessedModel.find({ batchId }).lean();
            if (processedRows.length) {
                const first = processedRows[0];
                const normalizeNumber = (value) => {
                    const parsed = Number(value);
                    return Number.isFinite(parsed) ? parsed : 0;
                };
                const normalizeText = (value) => value === null || value === undefined ? undefined : String(value).trim();
                const mapProcessedRow = (row) => {
                    const type = normalizeText(row?.type)?.toLowerCase() ?? "reimbursable";
                    const amount = normalizeNumber(row?.amount);
                    const base = {
                        name: normalizeText(row?.name) ?? undefined,
                        staffId: normalizeText(row?.staffId) ?? undefined,
                        staffObjectId: normalizeText(row?.staffObjectId) ?? undefined,
                        employeeId: normalizeText(row?.employeeId) ?? undefined,
                        userId: normalizeText(row?.userId) ?? undefined,
                        grade: normalizeText(row?.grade) ?? undefined,
                        branch: normalizeText(row?.branch) ?? undefined,
                        type,
                    };
                    const account = normalizeText(row?.account) ?? normalizeText(row?.accountNo);
                    if (type === "reimbursable") {
                        return {
                            ...base,
                            addosserAccount: account,
                            account,
                            accountNo: normalizeText(row?.accountNo) ?? account,
                            reimbursable: amount,
                            amount,
                        };
                    }
                    if (type === "salary") {
                        return {
                            ...base,
                            addosserAccount: account,
                            account,
                            accountNo: normalizeText(row?.accountNo) ?? account,
                            basic: normalizeNumber(row?.basic),
                            housing: normalizeNumber(row?.housing),
                            transport: normalizeNumber(row?.transport),
                            dress: normalizeNumber(row?.dress),
                            utilities: normalizeNumber(row?.utilities),
                            lunch: normalizeNumber(row?.lunch),
                            telephone: normalizeNumber(row?.telephone),
                            gross: normalizeNumber(row?.gross),
                            pension: normalizeNumber(row?.pension),
                            companyPension: normalizeNumber(row?.companyPension),
                            monthlyCompanyPension: normalizeNumber(row?.companyPension),
                            nhf: normalizeNumber(row?.nhf),
                            paye: normalizeNumber(row?.paye),
                            monthlyNet: amount,
                            amount,
                        };
                    }
                    if (type === "bank") {
                        return {
                            ...base,
                            atlasAccount: account,
                            account,
                            accountNo: normalizeText(row?.accountNo) ?? account,
                            bankAmount: amount,
                            amount,
                        };
                    }
                    if (type === "individual") {
                        return {
                            ...base,
                            atlasAccount: account,
                            account,
                            accountNo: normalizeText(row?.accountNo) ?? account,
                            individualAmount: amount,
                            amount,
                        };
                    }
                    return {
                        ...base,
                        account,
                        accountNo: normalizeText(row?.accountNo) ?? account,
                        amount,
                        pension: normalizeNumber(row?.pension),
                        companyPension: normalizeNumber(row?.companyPension),
                        nhf: normalizeText(row?.nhf),
                        paye: normalizeText(row?.paye),
                        pensionAccount: normalizeText(row?.pensionAccount),
                        pensionProvider: normalizeText(row?.pensionProvider),
                        nhfAccount: normalizeText(row?.nhfAccount),
                        payeAccount: normalizeText(row?.payeAccount),
                    };
                };
                const approvalData = processedRows.map(mapProcessedRow);
                const types = Array.from(new Set(approvalData.map((row) => row?.type).filter(Boolean)));
                approval = {
                    batchId,
                    entity: first?.entity ?? entityId ?? entityArg,
                    status: "APPROVED",
                    currentStage: "POSTING",
                    data: approvalData,
                    types,
                    period: first?.period ?? undefined,
                    periodKey: first?.periodKey ?? undefined,
                    periodDate: first?.periodDate ?? undefined,
                    processedAt: first?.periodDate ?? undefined,
                    reconstructedFromProcessed: true,
                };
                reconstructedFromProcessed = true;
            }
        }
        const outputName = outArg ??
            `payroll-approval-${sanitizeFileName(entityArg || "export")}.json`;
        const outputPath = path.resolve(process.cwd(), outputName);
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        const payload = {
            exportedAt: new Date().toISOString(),
            entity: entityDoc
                ? {
                    id: String(entityDoc._id ?? ""),
                    name: entityDoc?.name ?? null,
                    short: entityDoc?.short ?? null,
                    code: entityDoc?.code ?? null,
                }
                : {
                    input: entityArg,
                    id: entityId ?? null,
                },
            workflow: workflow ?? null,
            approval: approval ?? null,
            reconstructedFromProcessed,
        };
        fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf8");
        console.log(`Exported payroll approval data to ${outputPath}`);
        if (!workflow) {
            console.warn(`No payroll workflow found for entity "${entityArg}".`);
        }
        if (!approval) {
            console.warn("No payroll approval matched the provided criteria.");
        }
    }
    finally {
        await mainConn.close();
        await staffConn.close();
    }
};
if (hasFlag("--help")) {
    console.log("Usage: npx ts-node --project tsconfig.json scripts/export-payroll-approval-json.ts --entity AIBL [--approvalId <id>] [--batchId <id>] [--out <path>]");
    process.exit(0);
}
run().catch((error) => {
    console.error("Export failed:", error);
    process.exitCode = 1;
});
//# sourceMappingURL=export-payroll-approval-json.js.map