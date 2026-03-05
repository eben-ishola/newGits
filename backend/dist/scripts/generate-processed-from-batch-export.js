"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const mongoose_1 = require("mongoose");
const uuid_1 = require("uuid");
const config_1 = require("../src/config");
const spreadsheet_util_1 = require("../src/utils/spreadsheet.util");
const argv = process.argv.slice(2);
const hasFlag = (flag) => argv.includes(flag);
const getArg = (flag) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
};
const entityArg = getArg("--entity") ?? getArg("--entityShort") ?? getArg("--short") ?? "AIBL";
const bankCsv = getArg("--bankCsv") ?? getArg("--bank");
const individualCsv = getArg("--individualCsv") ?? getArg("--individual");
const csvArg = getArg("--csv");
const typeArg = getArg("--type");
const periodArg = getArg("--period") ?? getArg("--periodKey");
const periodDateArg = getArg("--periodDate");
const outArg = getArg("--out") ?? getArg("--output");
const batchId = getArg("--batchId") ?? (0, uuid_1.v4)();
const includeUnmatched = hasFlag("--include-unmatched");
const apply = hasFlag("--apply");
const sources = [];
if (bankCsv)
    sources.push({ type: "bank", filePath: bankCsv });
if (individualCsv)
    sources.push({ type: "individual", filePath: individualCsv });
if (csvArg) {
    if (!typeArg) {
        console.error("When using --csv, you must provide --type.");
        process.exit(1);
    }
    sources.push({ type: String(typeArg).toLowerCase(), filePath: csvArg });
}
if (!sources.length) {
    console.error("Provide --bankCsv/--individualCsv or --csv with --type to generate processed values.");
    process.exit(1);
}
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
const parseNumber = (value) => {
    if (value === null || value === undefined)
        return 0;
    if (typeof value === "number")
        return Number.isFinite(value) ? value : 0;
    if (typeof value !== "string")
        return 0;
    const cleaned = value.replace(/,/g, "").replace(/[^\d.-]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
};
const parseCsvLine = (line) => {
    const output = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        if (char === "\"") {
            if (inQuotes && line[i + 1] === "\"") {
                current += "\"";
                i += 1;
            }
            else {
                inQuotes = !inQuotes;
            }
            continue;
        }
        if (char === "," && !inQuotes) {
            output.push(current);
            current = "";
            continue;
        }
        current += char;
    }
    output.push(current);
    return output;
};
const readRows = async (filePath) => {
    const absolute = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(absolute)) {
        throw new Error(`File not found: ${absolute}`);
    }
    const ext = path.extname(absolute).toLowerCase();
    if ([".xlsx", ".xls", ".xlsm"].includes(ext)) {
        const workbook = await (0, spreadsheet_util_1.loadWorkbook)(absolute);
        const sheet = (0, spreadsheet_util_1.getFirstWorksheet)(workbook);
        if (!sheet)
            return { headers: [], rows: [] };
        return (0, spreadsheet_util_1.worksheetToObjects)(sheet, { defval: "" });
    }
    const content = fs.readFileSync(absolute, "utf8");
    const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (!lines.length)
        return { headers: [], rows: [] };
    const headers = parseCsvLine(lines[0]).map((value) => value.trim());
    const rows = lines.slice(1).map((line) => {
        const cells = parseCsvLine(line);
        const row = {};
        headers.forEach((header, index) => {
            row[header] = cells[index] ?? "";
        });
        return row;
    });
    return { headers, rows };
};
const shortMonths = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
];
const buildPeriodKey = (date) => {
    const month = shortMonths[date.getMonth()] ?? "";
    return `${month}-${date.getFullYear()}`.toLowerCase();
};
const resolvePeriodDateFromInput = (value) => {
    if (!value)
        return null;
    const normalized = String(value).trim().toLowerCase();
    if (/^\d{4}[-/]\d{1,2}$/.test(normalized)) {
        const [yearPart, monthPart] = normalized.split(/[-/]/);
        const year = Number(yearPart);
        const monthIndex = Number(monthPart) - 1;
        if (monthIndex >= 0 && monthIndex < 12) {
            return new Date(year, monthIndex, 1);
        }
    }
    if (/^[a-z]{3}-\d{4}$/.test(normalized)) {
        const [monthPart, yearPart] = normalized.split("-");
        const idx = shortMonths.indexOf(monthPart);
        if (idx >= 0) {
            return new Date(Number(yearPart), idx, 1);
        }
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
        return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
    }
    return null;
};
const resolvePeriodFromNarration = (value) => {
    if (!value)
        return null;
    const normalized = value.toLowerCase();
    const match = normalized.match(/(\d{4})-(\d{1,2})/);
    if (match) {
        const year = Number(match[1]);
        const monthIndex = Number(match[2]) - 1;
        if (monthIndex >= 0 && monthIndex < 12) {
            return new Date(year, monthIndex, 1);
        }
    }
    const monthMatch = normalized.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/);
    const yearMatch = normalized.match(/\b(20\d{2})\b/);
    if (monthMatch && yearMatch) {
        const monthIndex = [
            "january",
            "february",
            "march",
            "april",
            "may",
            "june",
            "july",
            "august",
            "september",
            "october",
            "november",
            "december",
        ].indexOf(monthMatch[1]);
        if (monthIndex >= 0) {
            return new Date(Number(yearMatch[1]), monthIndex, 1);
        }
    }
    return null;
};
const resolvePeriodFromDateString = (value) => {
    if (!value)
        return null;
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    const parts = trimmed.split("/");
    if (parts.length === 3) {
        const day = Number(parts[0]);
        const month = Number(parts[1]) - 1;
        const year = Number(parts[2]);
        if (Number.isFinite(day) && Number.isFinite(month) && Number.isFinite(year)) {
            return new Date(year, month, 1);
        }
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
        return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
    }
    return null;
};
const resolvePeriod = (rows) => {
    const fromArg = resolvePeriodDateFromInput(periodDateArg) ??
        resolvePeriodDateFromInput(periodArg);
    if (fromArg) {
        return fromArg;
    }
    for (const row of rows) {
        const fromDate = resolvePeriodFromDateString(row?.date1 ?? row?.date ?? row?.Date ?? row?.Date1 ?? "");
        if (fromDate)
            return fromDate;
        const fromNarration = resolvePeriodFromNarration(row?.narration ?? row?.Narration ?? "");
        if (fromNarration)
            return fromNarration;
    }
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
};
const UserSchema = new mongoose_1.Schema({
    firstName: String,
    lastName: String,
    middleName: String,
    staffId: String,
    addosserAccount: String,
    atlasAccount: String,
    branch: mongoose_1.Schema.Types.ObjectId,
    level: mongoose_1.Schema.Types.ObjectId,
    entity: mongoose_1.Schema.Types.Mixed,
}, { strict: false });
const BranchSchema = new mongoose_1.Schema({ name: String, entity: mongoose_1.Schema.Types.Mixed }, { strict: false });
const LevelSchema = new mongoose_1.Schema({ name: String }, { strict: false });
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
    period: String,
    periodKey: String,
    periodDate: Date,
    status: String,
    payslipApproval: String,
}, { strict: false, timestamps: true });
const run = async () => {
    const mainConn = await mongoose_1.default.createConnection(config_1.config.mainDB).asPromise();
    const staffConn = await mongoose_1.default.createConnection(config_1.config.authDB).asPromise();
    const ProcessedModel = mainConn.model("ProcessedPayroll", ProcessedSchema);
    const SubsidiaryModel = staffConn.model("Subsidiary", new mongoose_1.Schema({ name: String, short: String, code: String }, { strict: false }), "subsidiaries");
    const UserModel = staffConn.model("User", UserSchema, "users");
    const BranchModel = staffConn.model("Branch", BranchSchema, "branches");
    const LevelModel = staffConn.model("Level", LevelSchema, "levels");
    try {
        const { entityId, entityDoc } = await resolveEntity(entityArg, SubsidiaryModel);
        const staffQuery = buildEntityQuery(entityId);
        const staffRows = await UserModel.find(staffQuery).lean();
        const branchIds = Array.from(new Set(staffRows
            .map((row) => row?.branch)
            .filter((value) => value && mongoose_1.Types.ObjectId.isValid(value)))).map((value) => new mongoose_1.Types.ObjectId(value));
        const levelIds = Array.from(new Set(staffRows
            .map((row) => row?.level)
            .filter((value) => value && mongoose_1.Types.ObjectId.isValid(value)))).map((value) => new mongoose_1.Types.ObjectId(value));
        const [branches, levels] = await Promise.all([
            branchIds.length ? BranchModel.find({ _id: { $in: branchIds } }).lean() : [],
            levelIds.length ? LevelModel.find({ _id: { $in: levelIds } }).lean() : [],
        ]);
        const branchMap = new Map();
        branches.forEach((branch) => {
            if (branch?._id) {
                branchMap.set(String(branch._id), String(branch.name ?? ""));
            }
        });
        const levelMap = new Map();
        levels.forEach((level) => {
            if (level?._id) {
                levelMap.set(String(level._id), String(level.name ?? ""));
            }
        });
        const addosserMap = new Map();
        const atlasMap = new Map();
        staffRows.forEach((row) => {
            const first = row?.firstName ? String(row.firstName).trim() : "";
            const middle = row?.middleName ? String(row.middleName).trim() : "";
            const last = row?.lastName ? String(row.lastName).trim() : "";
            const name = [first, middle, last].filter(Boolean).join(" ").trim();
            const staffId = row?.staffId ? String(row.staffId).trim() : undefined;
            const staffObjectId = row?._id ? String(row._id) : undefined;
            const grade = row?.level ? levelMap.get(String(row.level)) : undefined;
            const branch = row?.branch ? branchMap.get(String(row.branch)) : undefined;
            const addosserAccount = row?.addosserAccount
                ? String(row.addosserAccount).trim()
                : undefined;
            const atlasAccount = row?.atlasAccount
                ? String(row.atlasAccount).trim()
                : undefined;
            const info = {
                staffId,
                staffObjectId,
                name,
                grade,
                branch,
                addosserAccount,
                atlasAccount,
            };
            if (addosserAccount && !addosserMap.has(addosserAccount)) {
                addosserMap.set(addosserAccount, info);
            }
            if (atlasAccount && !atlasMap.has(atlasAccount)) {
                atlasMap.set(atlasAccount, info);
            }
        });
        const outputRecords = [];
        const unmatched = [];
        const allCsvRows = [];
        const parsedSources = [];
        for (const source of sources) {
            const parsed = await readRows(source.filePath);
            allCsvRows.push(...parsed.rows);
            parsedSources.push({ ...source, parsed });
        }
        const periodDate = resolvePeriod(allCsvRows);
        const periodKey = buildPeriodKey(periodDate);
        const periodLabel = periodDate.toLocaleString("en-US", {
            month: "long",
            year: "numeric",
        });
        parsedSources.forEach(({ type, parsed }) => {
            const normalizedType = String(type ?? "").toLowerCase();
            parsed.rows.forEach((row) => {
                const rowType = String(row?.type ?? "").trim().toUpperCase();
                if (rowType && rowType !== "CR")
                    return;
                const accountRaw = row?.account ??
                    row?.acct ??
                    row?.acc ??
                    row?.AccountNumber ??
                    row?.ACCOUNTNUMBER ??
                    row?.Account ??
                    row?.AccountNo ??
                    row?.accountNo ??
                    row?.accountNumber ??
                    "";
                const account = String(accountRaw).trim();
                if (!account)
                    return;
                const amount = parseNumber(row?.gross ??
                    row?.amount ??
                    row?.Amount ??
                    row?.AMOUNT ??
                    row?.value ??
                    row?.Value);
                if (!Number.isFinite(amount))
                    return;
                const lookup = normalizedType === "bank" || normalizedType === "individual"
                    ? atlasMap.get(account) ?? addosserMap.get(account)
                    : addosserMap.get(account) ?? atlasMap.get(account);
                if (!lookup) {
                    unmatched.push({ account, amount, type: normalizedType });
                    if (!includeUnmatched)
                        return;
                }
                const staff = lookup ?? {};
                const isVariableType = normalizedType === "bank" || normalizedType === "individual";
                const resolvedAccount = isVariableType
                    ? staff.atlasAccount ?? account
                    : staff.addosserAccount ?? account;
                const resolvedAccountNo = staff.addosserAccount ?? account;
                outputRecords.push({
                    batchId,
                    entity: entityId ?? entityArg,
                    type: normalizedType,
                    name: staff.name ?? undefined,
                    staffId: staff.staffId ?? undefined,
                    staffObjectId: staff.staffObjectId ?? undefined,
                    grade: staff.grade ?? undefined,
                    branch: staff.branch ?? undefined,
                    account: resolvedAccount,
                    accountNo: resolvedAccountNo,
                    amount,
                    period: periodLabel,
                    periodKey,
                    periodDate,
                    status: "Processed",
                    payslipApproval: "Pending",
                });
            });
        });
        const outputName = outArg ??
            `processed-${sanitizeFileName(entityArg || "export")}-${batchId}.json`;
        const outputPath = path.resolve(process.cwd(), outputName);
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        const payload = {
            generatedAt: new Date().toISOString(),
            batchId,
            entity: entityDoc
                ? {
                    id: String(entityDoc._id ?? ""),
                    name: entityDoc?.name ?? null,
                    short: entityDoc?.short ?? null,
                    code: entityDoc?.code ?? null,
                }
                : { input: entityArg, id: entityId ?? null },
            period: periodLabel,
            periodKey,
            periodDate,
            records: outputRecords,
            unmatchedAccounts: unmatched,
            sources: parsedSources.map((source) => ({
                type: source.type,
                filePath: source.filePath,
                rows: source.parsed.rows.length,
            })),
        };
        fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf8");
        console.log(`Generated processed payroll JSON at ${outputPath}`);
        console.log(`BatchId: ${batchId}`);
        console.log(`Records: ${outputRecords.length}`);
        if (unmatched.length) {
            console.warn(`Unmatched accounts: ${unmatched.length}`);
        }
        if (apply) {
            const existing = await ProcessedModel.exists({ batchId });
            if (existing) {
                console.warn(`Processed payroll already exists for batchId ${batchId}. Skipping insert.`);
            }
            else if (outputRecords.length) {
                await ProcessedModel.insertMany(outputRecords);
                console.log("Inserted processed payroll records.");
            }
            else {
                console.warn("No records to insert.");
            }
        }
    }
    finally {
        await mainConn.close();
        await staffConn.close();
    }
};
if (hasFlag("--help")) {
    console.log("Usage: npx ts-node --project tsconfig.json scripts/generate-processed-from-batch-export.ts --entity AIBL --bankCsv <bank.csv> --individualCsv <individual.csv> [--period Jan-2026] [--out <path>] [--apply]");
    process.exit(0);
}
run().catch((error) => {
    console.error("Processed payroll generation failed:", error);
    process.exitCode = 1;
});
//# sourceMappingURL=generate-processed-from-batch-export.js.map