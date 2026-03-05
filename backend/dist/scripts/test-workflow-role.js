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
const entityArg = getArg("--entity") ?? getArg("--entityId") ?? getArg("--entity-id");
const scanAll = hasFlag("--scanAll") || hasFlag("--scan-all");
const debug = hasFlag("--debug") || hasFlag("--verbose");
const userFile = getArg("--userFile") ?? getArg("--user-file");
const userJson = getArg("--userJson") ?? getArg("--user-json");
const emailArg = getArg("--email");
const userIdArg = getArg("--userId") ?? getArg("--user") ?? getArg("--id");
const staffIdArg = getArg("--staffId") ?? getArg("--staffID");
const employeeIdArg = getArg("--employeeId");
const identifiersArg = getArg("--identifiers") ?? getArg("--identifier");
const parseList = (value) => value
    ? value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];
const usage = [
    "Usage:",
    "  npx ts-node --project tsconfig.json scripts/test-workflow-role.ts --email user@example.com --entity <entityId>",
    "  npx ts-node --project tsconfig.json scripts/test-workflow-role.ts --userId <id> --entity <entityId>",
    "  npx ts-node --project tsconfig.json scripts/test-workflow-role.ts --userFile path\\to\\user.json --entity <entityId>",
    "",
    "Options:",
    "  --scanAll               Scan all workflow configs instead of a single entity",
    "  --identifiers id1,id2   Comma-delimited identifiers to find or construct a user",
    "  --debug                 Print identifiers used for matching",
].join("\n");
if (hasFlag("--help")) {
    console.log(usage);
    process.exit(0);
}
const tokens = new Set();
parseList(identifiersArg).forEach((token) => tokens.add(token));
[userIdArg, staffIdArg, employeeIdArg, emailArg].forEach((value) => {
    if (value)
        tokens.add(value);
});
if (!userFile && !userJson && tokens.size === 0) {
    console.error("Missing user identifiers.");
    console.log(usage);
    process.exit(1);
}
const WorkflowSchema = new mongoose_1.Schema({
    entity: mongoose_1.Schema.Types.Mixed,
    approverIds: [String],
    postingIds: [String],
    auditViewerIds: [String],
}, { strict: false, timestamps: true });
const UserSchema = new mongoose_1.Schema({}, { strict: false });
const normalizeUserId = (value) => {
    if (value == null)
        return null;
    const candidate = typeof value === "object"
        ? value?._id ?? value?.id ?? value?.userId ?? value
        : value;
    const normalized = String(candidate ?? "").trim();
    if (!normalized ||
        normalized.toLowerCase() === "undefined" ||
        normalized.toLowerCase() === "null") {
        return null;
    }
    if (!mongoose_1.Types.ObjectId.isValid(normalized)) {
        return null;
    }
    return normalized;
};
const collectIdentifierValues = (...values) => {
    const identifiers = new Set();
    const seen = new Set();
    const addValue = (value) => {
        if (value === null || value === undefined)
            return;
        let current = value;
        while (current !== null && current !== undefined) {
            if (typeof current === "object") {
                if (seen.has(current))
                    return;
                seen.add(current);
                if (current instanceof mongoose_1.Types.ObjectId) {
                    identifiers.add(current.toHexString());
                    return;
                }
                if (typeof current.toHexString === "function") {
                    try {
                        const hex = current.toHexString();
                        if (hex) {
                            identifiers.add(String(hex));
                            return;
                        }
                    }
                    catch {
                    }
                }
                const candidate = current?._id ??
                    current?.id ??
                    current?.userId ??
                    current?.staffId ??
                    current?.employeeId ??
                    current?.email ??
                    current?.value;
                if (candidate && candidate !== current) {
                    current = candidate;
                    continue;
                }
                const fallback = typeof current.toString === "function"
                    ? current.toString()
                    : "";
                if (fallback &&
                    fallback !== "[object Object]" &&
                    fallback.toLowerCase() !== "undefined" &&
                    fallback.toLowerCase() !== "null") {
                    identifiers.add(fallback);
                }
                return;
            }
            const str = String(current).trim();
            if (!str ||
                str.toLowerCase() === "undefined" ||
                str.toLowerCase() === "null") {
                return;
            }
            identifiers.add(str);
            return;
        }
    };
    values.forEach(addValue);
    return Array.from(identifiers);
};
const buildUserFromArgs = () => {
    const userId = userIdArg ?? undefined;
    const objectId = userId && mongoose_1.Types.ObjectId.isValid(userId) ? new mongoose_1.Types.ObjectId(userId) : undefined;
    return {
        _id: objectId,
        id: userId,
        userId,
        staffId: staffIdArg ?? undefined,
        staffID: staffIdArg ?? undefined,
        employeeId: employeeIdArg ?? undefined,
        email: emailArg ?? undefined,
        value: identifiersArg ?? undefined,
    };
};
const loadUser = async (UserModel) => {
    if (userFile) {
        const fullPath = path.resolve(process.cwd(), userFile);
        const raw = fs.readFileSync(fullPath, "utf8");
        return { user: JSON.parse(raw), source: "file" };
    }
    if (userJson) {
        return { user: JSON.parse(userJson), source: "json" };
    }
    if (!tokens.size) {
        return { user: buildUserFromArgs(), source: "manual" };
    }
    const or = [];
    tokens.forEach((token) => {
        const trimmed = token.trim();
        if (!trimmed)
            return;
        if (mongoose_1.Types.ObjectId.isValid(trimmed)) {
            or.push({ _id: new mongoose_1.Types.ObjectId(trimmed) });
        }
        or.push({ userId: trimmed });
        or.push({ staffId: trimmed });
        or.push({ staffID: trimmed });
        or.push({ employeeId: trimmed });
        or.push({ email: trimmed });
    });
    const user = or.length ? await UserModel.findOne({ $or: or }).lean() : null;
    if (user) {
        return { user, source: "db" };
    }
    return { user: buildUserFromArgs(), source: "manual" };
};
const getWorkflowRole = async (WorkflowModel, user, entityValue, scanAllFlag = false) => {
    const userIdentifiers = collectIdentifierValues(user?._id, user?.id, user?.userId, user?.staffId ?? user?.staffID, user?.employeeId, user?.email, user)
        .map((value) => String(value).trim())
        .filter((value) => value &&
        value.toLowerCase() !== "null" &&
        value.toLowerCase() !== "undefined" &&
        value.toLowerCase() !== "[object object]");
    const identifierSet = new Set(userIdentifiers.map((value) => value.toLowerCase()));
    const normalizedUserId = normalizeUserId(user?._id ??
        user?.id ??
        user?.userId ??
        user?.staffId ??
        user?.staffID ??
        user?.employeeId);
    const readList = (...values) => values.flatMap((value) => Array.isArray(value) ? value : value ? [value] : []);
    const matchesNormalizedUserId = (value) => {
        if (!normalizedUserId || value == null)
            return false;
        if (Array.isArray(value)) {
            return value.some((entry) => matchesNormalizedUserId(entry));
        }
        const normalized = normalizeUserId(value);
        if (normalized) {
            return normalized === normalizedUserId;
        }
        const raw = typeof value === "string" ? value.trim() : "";
        return raw ? raw.toLowerCase() === normalizedUserId.toLowerCase() : false;
    };
    const matchesIdentifier = (value) => {
        if (matchesNormalizedUserId(value)) {
            return true;
        }
        const candidates = collectIdentifierValues(value);
        return candidates.some((candidate) => {
            const normalized = String(candidate ?? "").trim();
            if (!normalized)
                return false;
            const tokens = normalized
                .split(",")
                .map((part) => part.trim())
                .filter(Boolean);
            return tokens.some((token) => {
                const lowered = token.toLowerCase();
                if (lowered === "null" ||
                    lowered === "undefined" ||
                    lowered === "[object object]") {
                    return false;
                }
                return identifierSet.has(lowered);
            });
        });
    };
    if (!identifierSet.size) {
        return {
            response: {
                status: 200,
                data: {
                    entity: null,
                    isFinalApprover: false,
                    isPoster: false,
                    isAuditViewer: false,
                },
            },
            userIdentifiers,
        };
    }
    let entityId = null;
    let entityString = null;
    if (entityValue) {
        try {
            entityId = new mongoose_1.Types.ObjectId(entityValue);
        }
        catch {
            entityString = String(entityValue).trim();
        }
    }
    if (scanAllFlag) {
        const configs = (await WorkflowModel.find({}, { approverIds: 1, postingIds: 1, auditViewerIds: 1 }).lean());
        const isFinalApprover = configs.some((workflow) => readList(workflow?.approverIds, workflow?.approvers).some(matchesIdentifier));
        const isPoster = configs.some((workflow) => readList(workflow?.postingIds, workflow?.posters, workflow?.posterIds).some(matchesIdentifier));
        const isAuditViewer = configs.some((workflow) => readList(workflow?.auditViewerIds, workflow?.auditViewers).some(matchesIdentifier));
        return {
            response: {
                status: 200,
                data: {
                    entity: entityId ?? entityString,
                    isFinalApprover: Boolean(isFinalApprover),
                    isPoster: Boolean(isPoster),
                    isAuditViewer: Boolean(isAuditViewer),
                },
            },
            userIdentifiers,
        };
    }
    if (!entityId && !entityString) {
        return {
            response: {
                status: 200,
                data: {
                    entity: null,
                    isFinalApprover: false,
                    isPoster: false,
                    isAuditViewer: false,
                },
            },
            userIdentifiers,
        };
    }
    const configDoc = (await WorkflowModel.findOne({
        $or: [
            entityId ? { entity: entityId } : null,
            entityString ? { entity: entityString } : null,
        ].filter(Boolean),
    }).lean());
    if (!configDoc) {
        return {
            response: {
                status: 200,
                data: {
                    entity: entityId ?? entityString,
                    isFinalApprover: false,
                    isPoster: false,
                    isAuditViewer: false,
                },
            },
            userIdentifiers,
        };
    }
    const approverIds = readList(configDoc.approverIds, configDoc.approvers);
    const postingIds = readList(configDoc.postingIds, configDoc.posters, configDoc.posterIds);
    const auditViewerIds = readList(configDoc.auditViewerIds, configDoc.auditViewers);
    return {
        response: {
            status: 200,
            data: {
                entity: entityId ?? entityString,
                isFinalApprover: approverIds.some(matchesIdentifier),
                isPoster: postingIds.some(matchesIdentifier),
                isAuditViewer: auditViewerIds.some(matchesIdentifier),
            },
        },
        userIdentifiers,
    };
};
const run = async () => {
    const mainConn = await mongoose_1.default.createConnection(config_1.config.mainDB).asPromise();
    const staffConn = await mongoose_1.default.createConnection(config_1.config.authDB).asPromise();
    const WorkflowModel = mainConn.model("PayrollWorkflowConfig", WorkflowSchema, "payrollworkflowconfigs");
    const UserModel = staffConn.model("User", UserSchema, "users");
    try {
        const { user, source } = await loadUser(UserModel);
        if (!user) {
            throw new Error("Unable to load or construct a user object.");
        }
        const { response, userIdentifiers } = await getWorkflowRole(WorkflowModel, user, entityArg, scanAll);
        if (debug) {
            console.log(`User source: ${source}`);
            console.log("Identifiers:", userIdentifiers);
        }
        console.log(JSON.stringify(response, null, 2));
    }
    finally {
        await mainConn.close();
        await staffConn.close();
    }
};
run().catch((error) => {
    console.error("Workflow role test failed:", error);
    process.exitCode = 1;
});
//# sourceMappingURL=test-workflow-role.js.map