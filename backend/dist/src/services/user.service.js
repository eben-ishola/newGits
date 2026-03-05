"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const spreadsheet_util_1 = require("../utils/spreadsheet.util");
const role_schema_1 = require("../schemas/role.schema");
const subsidiary_service_1 = require("./subsidiary.service");
const level_service_1 = require("./level.service");
const branch_service_1 = require("./branch.service");
const department_service_1 = require("./department.service");
const businessUnit_service_1 = require("./businessUnit.service");
const index_utils_1 = require("../utils/index.utils");
const access_control_util_1 = require("../utils/access-control.util");
const additional_roles_util_1 = require("../utils/additional-roles.util");
const moment = require("moment-timezone");
const schedule_1 = require("@nestjs/schedule");
const mail_service_1 = require("./mail.service");
const notice_service_1 = require("./notice.service");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const STAFF_SAFE_PROJECTION = '-password -__v';
const STAFF_DIRECTORY_FIELDS = [
    'firstName',
    'lastName',
    'middleName',
    'email',
    'staffId',
    'staffID',
    'userId',
    'userID',
    'position',
    'jobTitle',
    'role',
    'level',
    'transportLevel',
    'department',
    'entity',
    'addosserAccount',
];
const STAFF_DIRECTORY_PROJECTION = STAFF_DIRECTORY_FIELDS.join(' ');
const STAFF_LIST_FIELDS = [
    'firstName',
    'lastName',
    'middleName',
    'email',
    'staffId',
    'staffID',
    'userId',
    'userID',
    'status',
    'confirmed',
    'startDate',
    'exitDate',
    'role',
    'department',
    'branch',
    'additionalBranch',
    'businessUnit',
    'level',
    'transportLevel',
    'entity',
    'phoneNumber',
    'dateOfBirth',
    'orbitID',
    'addosserAccount',
    'atlasAccount',
    'aftaAccount',
    'additionalAfta',
    'supervisorId',
    'supervisor2Id',
    'allowMultiBranch',
    'rent',
    'rentStartDate',
    'rentEndDate',
    'rentStart',
    'rentEnd',
    'additionalRoles',
];
const STAFF_LIST_PROJECTION = STAFF_LIST_FIELDS.join(' ');
const STAFF_ATTENDANCE_FIELDS = [
    'firstName',
    'lastName',
    'middleName',
    'branch',
    'additionalBranch',
    'department',
    'businessUnit',
];
const STAFF_ATTENDANCE_PROJECTION = STAFF_ATTENDANCE_FIELDS.join(' ');
const STAFF_WORKFLOW_FIELDS = [
    ...STAFF_LIST_FIELDS,
    'supervisorStatus',
    'auditStatus',
    'itStatus',
    'hrStatus',
    'workflowType',
    'workflowStage',
    'workflowUpdatedAt',
    'requiresHrApproval',
    'pendingChanges',
    'createdAt',
    'updatedAt',
];
const STAFF_WORKFLOW_PROJECTION = STAFF_WORKFLOW_FIELDS.join(' ');
const STAFF_SUMMARY_POPULATE = [
    { path: 'branch', options: { lean: true } },
    { path: 'additionalBranch', select: 'name entity latitude longitude', options: { lean: true } },
    {
        path: 'level',
        options: { lean: true },
        populate: { path: 'category', options: { lean: true } },
    },
    { path: 'department', options: { lean: true } },
    {
        path: 'businessUnit',
        options: { lean: true },
        populate: { path: 'territory', options: { lean: true } },
    },
    { path: 'entity', options: { lean: true } },
    {
        path: 'role',
        options: { lean: true },
        skipInvalidIds: true,
        populate: { path: 'permissions', options: { lean: true }, skipInvalidIds: true },
    },
    {
        path: 'additionalRoles',
        options: { lean: true },
        populate: [
            {
                path: 'role',
                options: { lean: true },
                skipInvalidIds: true,
                populate: { path: 'permissions', options: { lean: true }, skipInvalidIds: true },
            },
            { path: 'entity', options: { lean: true }, skipInvalidIds: true },
        ],
    },
];
const STAFF_DIRECTORY_POPULATE = [
    { path: 'department', select: 'name entity', options: { lean: true } },
    { path: 'entity', select: 'name short', options: { lean: true } },
    { path: 'role', select: 'name', options: { lean: true }, skipInvalidIds: true },
    { path: 'level', select: 'name', options: { lean: true } },
];
const STAFF_LIST_POPULATE = [
    { path: 'branch', select: 'name entity', options: { lean: true } },
    { path: 'additionalBranch', select: 'name entity latitude longitude', options: { lean: true } },
    { path: 'department', select: 'name entity', options: { lean: true } },
    { path: 'businessUnit', select: 'BU_NM BU_ID BU_NO territory', options: { lean: true } },
    { path: 'level', select: 'name category', options: { lean: true } },
    { path: 'entity', select: 'name short', options: { lean: true } },
    {
        path: 'role',
        select: 'name app profileKey description',
        options: { lean: true },
        skipInvalidIds: true,
    },
    {
        path: 'additionalRoles',
        options: { lean: true },
        populate: [
            {
                path: 'role',
                select: 'name app profileKey description',
                options: { lean: true },
                skipInvalidIds: true,
            },
            { path: 'entity', select: 'name short', options: { lean: true }, skipInvalidIds: true },
        ],
    },
];
const STAFF_ATTENDANCE_POPULATE = [
    { path: 'branch', select: 'name entity', options: { lean: true } },
    { path: 'additionalBranch', select: 'name entity latitude longitude', options: { lean: true } },
    { path: 'department', select: 'name entity', options: { lean: true } },
    { path: 'businessUnit', select: 'BU_NM BU_ID BU_NO', options: { lean: true } },
];
const STAFF_SUPERVISOR_LITE_POPULATE = [
    {
        path: 'supervisorId',
        select: 'firstName lastName email staffId staffID userId userID',
        options: { lean: true },
        skipInvalidIds: true,
    },
    {
        path: 'supervisor2Id',
        select: 'firstName lastName email staffId staffID userId userID',
        options: { lean: true },
        skipInvalidIds: true,
    },
];
const STAFF_SUPERVISOR_POPULATE = [
    {
        path: 'supervisorId',
        select: STAFF_SAFE_PROJECTION,
        options: { lean: true },
        skipInvalidIds: true,
    },
    {
        path: 'supervisor2Id',
        select: STAFF_SAFE_PROJECTION,
        options: { lean: true },
        skipInvalidIds: true,
    },
];
const PASSWORD_RESET_TOKEN_TTL_MS = 1000 * 60 * 60;
let StaffService = class StaffService {
    constructor(staffModel, roleModel, entityService, levelService, branchService, departmentService, businessUnit, notificationService, noticeService) {
        this.staffModel = staffModel;
        this.roleModel = roleModel;
        this.entityService = entityService;
        this.levelService = levelService;
        this.branchService = branchService;
        this.departmentService = departmentService;
        this.businessUnit = businessUnit;
        this.notificationService = notificationService;
        this.noticeService = noticeService;
        this.LOOKUPS = [
            {
                $lookup: {
                    from: 'departments',
                    localField: 'department',
                    foreignField: '_id',
                    as: 'department'
                }
            },
            {
                $lookup: {
                    from: 'roles',
                    localField: 'role',
                    foreignField: '_id',
                    as: 'role'
                }
            },
            {
                $lookup: {
                    from: 'entities',
                    localField: 'entity',
                    foreignField: '_id',
                    as: 'entity'
                }
            }
        ];
        this.PROJECT_FIELDS = (dateField) => ({
            firstName: 1,
            lastName: 1,
            email: 1,
            [dateField]: {
                $dateToString: {
                    format: '%Y-%m-%d',
                    date: `$${dateField}`,
                    timezone: 'Africa/Lagos'
                }
            },
            years: {
                $subtract: [
                    { $year: { date: '$$NOW', timezone: 'Africa/Lagos' } },
                    { $year: { date: '$startDate', timezone: 'Africa/Lagos' } }
                ]
            },
            department: { $arrayElemAt: ['$department.name', 0] },
            role: { $arrayElemAt: ['$role.name', 0] },
            entity: { $arrayElemAt: ['$entity.name', 0] }
        });
        this.DATE_UPPER_BOUND = new Date('9999-12-31T23:59:59.999Z');
    }
    normalizeObjectId(value) {
        const candidate = this.extractObjectIdCandidate(value);
        if (!candidate)
            return null;
        const trimmed = candidate.trim();
        if (!trimmed) {
            return null;
        }
        const lowered = trimmed.toLowerCase();
        if (lowered === 'undefined' || lowered === 'null' || lowered === 'all') {
            return null;
        }
        if (mongoose_2.default.Types.ObjectId.isValid(trimmed)) {
            return new mongoose_2.default.Types.ObjectId(trimmed);
        }
        return null;
    }
    extractObjectIdCandidate(value) {
        if (value == null)
            return null;
        if (typeof value === 'string')
            return value;
        if (typeof value === 'number' && Number.isFinite(value))
            return String(value);
        if (value instanceof mongoose_2.default.Types.ObjectId) {
            return value.toHexString();
        }
        if (typeof value === 'object') {
            if (typeof value?.toHexString === 'function') {
                return value.toHexString();
            }
            const fields = ['_id', 'id', 'value', '$oid'];
            for (const field of fields) {
                if (field in value) {
                    const resolved = this.extractObjectIdCandidate(value[field]);
                    if (resolved) {
                        return resolved;
                    }
                }
            }
        }
        const stringified = String(value);
        if (stringified && stringified !== '[object Object]') {
            return stringified;
        }
        return null;
    }
    extractPermissionNames(user) {
        const sources = [];
        const register = (input) => {
            if (!input)
                return;
            if (Array.isArray(input))
                sources.push(...input);
            else
                sources.push(input);
        };
        register(user?.permissions);
        register(user?.role?.permissions);
        const registerAdditional = (assignment) => {
            if (!assignment)
                return;
            register(assignment?.permissions);
            register(assignment?.role?.permissions);
        };
        if (Array.isArray(user?.additionalRoles)) {
            user.additionalRoles.forEach(registerAdditional);
        }
        else {
            registerAdditional(user?.additionalRoles);
        }
        return sources
            .map((permission) => {
            if (!permission)
                return null;
            if (typeof permission === 'string')
                return permission;
            if (typeof permission?.name === 'string')
                return permission.name;
            return null;
        })
            .filter((name) => Boolean(name))
            .map((name) => name.toLowerCase());
    }
    userHasGlobalEntityAccess(user) {
        const scopeSet = (0, access_control_util_1.deriveUserScopes)(user);
        if (scopeSet.has('group')) {
            return true;
        }
        const names = this.extractPermissionNames(user);
        const globalFlags = new Set([
            'all',
            'super admin',
            'hr super admin',
            'view subsidiaries',
            'view all subsidiaries',
            'all entities',
        ]);
        return names.some((name) => globalFlags.has(name));
    }
    resolveEntityConstraint(user, requestedEntityId) {
        if (this.userHasGlobalEntityAccess(user)) {
            return requestedEntityId;
        }
        const userEntity = user?.entity;
        const normalizedUserEntity = requestedEntityId || this.normalizeObjectId(userEntity?._id ?? userEntity);
        if (!normalizedUserEntity) {
            return requestedEntityId;
        }
        if (requestedEntityId && !normalizedUserEntity.equals(requestedEntityId)) {
            throw new common_1.ForbiddenException('You do not have permission to view this entity.');
        }
        return normalizedUserEntity;
    }
    isObjectIdEqual(a, b) {
        if (!a && !b)
            return true;
        if (!a || !b)
            return false;
        try {
            const aStr = mongoose_2.default.Types.ObjectId.isValid(a) ? String(a) : String(a?._id ?? a);
            const bStr = mongoose_2.default.Types.ObjectId.isValid(b) ? String(b) : String(b?._id ?? b);
            return aStr === bStr;
        }
        catch {
            return false;
        }
    }
    normalizeValue(value) {
        if (value == null)
            return null;
        if (mongoose_2.default.Types.ObjectId.isValid(value)) {
            return String(value);
        }
        if (value instanceof Date) {
            return value.toISOString();
        }
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }
        return String(value);
    }
    escapeRegex(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    normalizeOptionalObjectIds(payload, fields) {
        if (!payload || typeof payload !== 'object')
            return payload;
        for (const field of fields) {
            const value = payload[field];
            if (typeof value === 'string' && value.trim() === '') {
                payload[field] = null;
            }
        }
        return payload;
    }
    normalizeAdditionalBranchIds(payload) {
        if (!payload || typeof payload !== 'object')
            return;
        if (!('additionalBranch' in payload))
            return;
        const raw = payload.additionalBranch;
        if (raw == null) {
            payload.additionalBranch = [];
            return;
        }
        const values = Array.isArray(raw) ? raw : [raw];
        const normalized = values
            .map((value) => this.normalizeObjectId(value))
            .filter((value) => Boolean(value));
        payload.additionalBranch = normalized;
    }
    stripEmptyPayloadFields(payload) {
        if (!payload || typeof payload !== 'object')
            return {};
        const cleaned = {};
        Object.entries(payload).forEach(([key, value]) => {
            if (value === null || value === undefined)
                return;
            if (typeof value === 'string' && value.trim() === '')
                return;
            cleaned[key] = value;
        });
        return cleaned;
    }
    extractRoleNameValue(value) {
        if (!value)
            return null;
        if (typeof value === 'string')
            return value.trim();
        if (typeof value === 'object') {
            if (typeof value?.name === 'string')
                return value.name.trim();
            if (typeof value?.label === 'string')
                return value.label.trim();
        }
        return null;
    }
    serializeRoleAssignmentsSnapshot(input) {
        const list = Array.isArray(input) ? input : input ? [input] : [];
        const normalized = list
            .map((entry) => {
            const roleId = this.normalizeObjectId(typeof entry === 'object' ? entry?.role ?? entry?.roleId ?? entry?.value ?? entry : entry);
            if (!roleId)
                return null;
            const entityId = this.normalizeObjectId(typeof entry === 'object' ? entry?.entity ?? entry?.entityId ?? entry?.subsidiary ?? entry?.tenant : undefined);
            return {
                role: roleId.toHexString(),
                entity: entityId ? entityId.toHexString() : null,
            };
        })
            .filter((entry) => Boolean(entry))
            .sort((a, b) => {
            const left = `${a.role}::${a.entity ?? ''}`;
            const right = `${b.role}::${b.entity ?? ''}`;
            return left.localeCompare(right);
        });
        return JSON.stringify(normalized);
    }
    async resolveAdditionalRoleAssignments(input) {
        const values = Array.isArray(input) ? input : input ? [input] : [];
        if (!values.length)
            return [];
        const assignments = [];
        const pending = [];
        values.forEach((entry) => {
            if (!entry)
                return;
            const directRoleValue = typeof entry === 'object'
                ? entry?.role ?? entry?.roleId ?? entry?.value
                : entry;
            const roleObjectId = this.normalizeObjectId(directRoleValue);
            const entityObjectId = this.normalizeObjectId(typeof entry === 'object' ? entry?.entity ?? entry?.entityId ?? entry?.subsidiary ?? entry?.tenant : undefined);
            if (roleObjectId) {
                assignments.push({ role: roleObjectId, entity: entityObjectId ?? undefined });
                return;
            }
            const roleName = this.extractRoleNameValue(typeof entry === 'object' ? entry?.role ?? entry : entry);
            if (roleName) {
                pending.push({ name: roleName.trim().toLowerCase(), entity: entityObjectId ?? undefined });
            }
        });
        if (pending.length) {
            const pendingNames = Array.from(new Set(pending.map((item) => item.name)));
            const regexes = pendingNames.map((name) => new RegExp(`^${this.escapeRegex(name)}$`, 'i'));
            const roles = await this.roleModel.find({ name: { $in: regexes } }).select('_id name').lean();
            const resolvedByName = new Map(roles.map((role) => [
                String(role?.name ?? '')
                    .trim()
                    .toLowerCase(),
                role?._id,
            ]));
            const missing = pendingNames.filter((name) => !resolvedByName.has(name));
            if (missing.length) {
                throw new Error(`Role(s) not found: ${missing.join(', ')}`);
            }
            pending.forEach((item) => {
                const resolvedRoleId = resolvedByName.get(item.name);
                if (resolvedRoleId) {
                    assignments.push({ role: resolvedRoleId, entity: item.entity });
                }
            });
        }
        const unique = new Map();
        assignments.forEach((assignment) => {
            const key = `${assignment.role.toHexString()}::${assignment.entity?.toHexString() ?? ''}`;
            if (!unique.has(key)) {
                unique.set(key, assignment);
            }
        });
        return Array.from(unique.values());
    }
    normalizeEntityCandidates(entity) {
        const candidates = [];
        const raw = String(entity?._id ?? entity ?? '').trim();
        if (!raw)
            return candidates;
        candidates.push(raw);
        if (mongoose_2.default.Types.ObjectId.isValid(raw)) {
            candidates.push(new mongoose_2.default.Types.ObjectId(raw));
        }
        return candidates;
    }
    normalizeSupervisorScope(scope) {
        if (!scope)
            return [];
        const rawValues = Array.isArray(scope)
            ? scope
            : String(scope)
                .split(',')
                .map((value) => value.trim())
                .filter((value) => value.length > 0);
        return rawValues
            .map((value) => this.normalizeObjectId(value))
            .filter((id) => Boolean(id));
    }
    async resolveRoleByNameAndEntity(name, entity) {
        const normalizedName = name?.trim();
        if (!normalizedName)
            return null;
        const baseQuery = {
            name: { $regex: new RegExp(`^${this.escapeRegex(normalizedName)}$`, 'i') },
        };
        const candidates = this.normalizeEntityCandidates(entity);
        if (candidates.length) {
            baseQuery.entity = { $in: candidates };
        }
        const role = (await this.roleModel.findOne(baseQuery).lean()) ??
            (await this.roleModel
                .findOne({ name: baseQuery.name })
                .lean());
        return role;
    }
    async sanitizeStaffPayload(payload) {
        if (!payload)
            return {};
        const result = { ...payload };
        this.normalizeOptionalObjectIds(result, [
            'supervisorId',
            'supervisor2Id',
            'branch',
            'department',
            'entity',
            'businessUnit',
            'level',
            'role',
        ]);
        let scopedEntity = this.normalizeObjectId(typeof result.entity === 'object'
            ? result.entity?._id ?? result.entity?.id ?? result.entity
            : result.entity) ??
            this.normalizeObjectId(result.entityId ?? result.subsidiary ?? result.subsidiaryId);
        const refKeys = [
            'entity',
            'department',
            'role',
            'businessUnit',
            'branch',
            'level',
            'supervisor',
            'supervisorId',
            'supervisor2Id',
        ];
        for (const key of refKeys) {
            const current = result[key];
            if (!current)
                continue;
            const resolved = await this.resolveReferenceId(key, current, scopedEntity);
            if (resolved) {
                result[key] = resolved;
                if (key === 'entity') {
                    scopedEntity = resolved;
                }
            }
        }
        if ('additionalBranch' in result) {
            const entries = Array.isArray(result.additionalBranch)
                ? result.additionalBranch
                : result.additionalBranch
                    ? [result.additionalBranch]
                    : [];
            const resolvedEntries = await Promise.all(entries.map((entry) => this.resolveReferenceId('branch', entry, scopedEntity)));
            result.additionalBranch = resolvedEntries.filter(Boolean);
        }
        if ('additionalRoles' in result) {
            const resolved = await this.resolveAdditionalRoleAssignments(result.additionalRoles);
            result.additionalRoles = resolved;
        }
        if ('additionalAfta' in result) {
            const raw = result.additionalAfta;
            if (raw === '' || raw === null || raw === undefined) {
                result.additionalAfta = 0;
            }
            else {
                const parsed = Number(String(raw).replace(/,/g, '').trim());
                result.additionalAfta = Number.isFinite(parsed) ? parsed : 0;
            }
        }
        if ('allowMultiBranch' in result) {
            const raw = result.allowMultiBranch;
            if (typeof raw === 'string') {
                const normalized = raw.trim().toLowerCase();
                result.allowMultiBranch = ['true', '1', 'yes', 'y', 'on'].includes(normalized);
            }
            else {
                result.allowMultiBranch = Boolean(raw);
            }
        }
        return result;
    }
    computePendingChanges(existing, updates) {
        const diff = {};
        const ignored = new Set([
            '_id',
            'createdAt',
            'updatedAt',
            '__v',
            'pendingChanges',
            'requiresHrApproval',
            'workflowStage',
            'workflowType',
            'workflowUpdatedAt',
            'supervisorStatus',
            'auditStatus',
            'itStatus',
            'hrStatus',
            'hodApproval',
            'auditApproval',
            'itApproval',
            'supervisorApproverId',
            'auditApproverId',
            'itApproverId',
            'hrApproverId',
        ]);
        for (const [key, value] of Object.entries(updates)) {
            if (ignored.has(key))
                continue;
            if (typeof value === 'undefined')
                continue;
            const current = existing?.[key];
            if (key === 'additionalRoles') {
                const currentSnapshot = this.serializeRoleAssignmentsSnapshot(current);
                const nextSnapshot = this.serializeRoleAssignmentsSnapshot(value);
                if (currentSnapshot !== nextSnapshot) {
                    diff[key] = value;
                }
                continue;
            }
            if (mongoose_2.default.Types.ObjectId.isValid(value) || mongoose_2.default.Types.ObjectId.isValid(current)) {
                if (!this.isObjectIdEqual(current, value)) {
                    diff[key] = value;
                }
                continue;
            }
            const normalizedCurrent = this.normalizeValue(current);
            const normalizedNext = this.normalizeValue(value);
            if (normalizedCurrent !== normalizedNext) {
                diff[key] = value;
            }
        }
        return diff;
    }
    async resolveReferenceId(field, value, entityId) {
        const directObjectId = this.normalizeObjectId(typeof value === 'object' ? value?._id ?? value?.id ?? value?.value ?? value : value);
        if (directObjectId) {
            return directObjectId;
        }
        const name = typeof value === 'string'
            ? value.trim()
            : typeof value === 'object'
                ? String(value?.name ?? value?.label ?? '').trim()
                : '';
        if (!name)
            return null;
        try {
            switch (field) {
                case 'entity': {
                    const entity = (await this.entityService.getSubsidiaryByShort(name)) ??
                        (await this.entityService.getSubsidiaryByName(name));
                    return this.normalizeObjectId(entity?._id ?? entity?.id);
                }
                case 'department': {
                    const department = (await this.departmentService.getDepartmentByNameAndEntity(name, entityId ?? undefined)) ??
                        (await this.departmentService.getDepartmentByName(name));
                    return this.normalizeObjectId(department?._id ?? department?.id);
                }
                case 'businessUnit': {
                    const bu = await this.businessUnit.getBusinessUnitByName(name);
                    return this.normalizeObjectId(bu?._id ?? bu?.id);
                }
                case 'branch': {
                    const branch = await this.branchService.getBranchByName(name);
                    return this.normalizeObjectId(branch?._id ?? branch?.id);
                }
                case 'level': {
                    const level = await this.levelService.getLevelByNameAndEntity(name);
                    return this.normalizeObjectId(level?._id ?? level?.id);
                }
                case 'role': {
                    const role = await this.resolveRoleByNameAndEntity(name, entityId ?? undefined);
                    return this.normalizeObjectId(role?._id ?? role?.id);
                }
                case 'supervisor':
                case 'supervisorId': {
                    const supervisor = await this.getById(name).catch(() => null);
                    return supervisor?._id ? new mongoose_2.default.Types.ObjectId(supervisor._id) : null;
                }
                case 'supervisor2Id': {
                    const supervisor = await this.getById(name).catch(() => null);
                    return supervisor?._id ? new mongoose_2.default.Types.ObjectId(supervisor._id) : null;
                }
                default:
                    return null;
            }
        }
        catch {
            return null;
        }
    }
    async normalizePendingReferenceIds(pending, staff) {
        if (!pending || typeof pending !== 'object')
            return pending;
        const normalized = { ...pending };
        let scopedEntity = this.normalizeObjectId(typeof normalized.entity === 'object' ? normalized.entity?._id ?? normalized.entity?.id ?? normalized.entity : normalized.entity) ?? this.normalizeObjectId(staff?.entity);
        const refKeys = [
            'department',
            'role',
            'businessUnit',
            'branch',
            'level',
            'supervisor',
            'supervisorId',
            'entity',
        ];
        for (const key of refKeys) {
            const current = normalized[key];
            if (!current)
                continue;
            const resolved = await this.resolveReferenceId(key, current, scopedEntity);
            if (resolved) {
                normalized[key] = resolved;
                if (key === 'entity') {
                    scopedEntity = resolved;
                }
            }
        }
        if (normalized.additionalBranch) {
            const entries = Array.isArray(normalized.additionalBranch)
                ? normalized.additionalBranch
                : [normalized.additionalBranch];
            const resolvedEntries = await Promise.all(entries.map((entry) => this.resolveReferenceId('branch', entry, scopedEntity)));
            normalized.additionalBranch = resolvedEntries.filter(Boolean);
        }
        return normalized;
    }
    async createNotice(userId, message, link, type) {
        if (!userId)
            return;
        try {
            await this.noticeService.createNotice({
                userId: String(userId),
                message,
                link,
                type,
            });
        }
        catch (error) {
        }
    }
    async getStaffByRoleKeywords(keywords, entity) {
        return this.findActiveStaffByRoleKeywords(keywords, entity);
    }
    async findActiveStaffByRoleKeywords(keywords, entity) {
        const lowered = keywords.map((name) => name.toLowerCase());
        const query = { status: 'Active' };
        if (entity) {
            query.$or = [{ entity }, { entity: (0, index_utils_1.toObjectId)(entity) }];
        }
        const staff = await this.staffModel
            .find(query)
            .select(STAFF_SAFE_PROJECTION)
            .populate(STAFF_SUMMARY_POPULATE)
            .lean();
        return staff.filter((member) => {
            const roleName = member?.role?.name;
            return roleName && lowered.some((target) => roleName.toLowerCase().includes(target));
        });
    }
    async notifySupervisorStage(staff) {
        const candidate = staff?.supervisor2Id ?? staff?.supervisorId ?? null;
        const targetId = candidate && mongoose_2.default.Types.ObjectId.isValid(String(candidate))
            ? new mongoose_2.default.Types.ObjectId(String(candidate))
            : null;
        if (!targetId) {
            staff.supervisorStatus = 'Approved';
            await this.progressToAuditStage(staff, null);
            return;
        }
        await this.createNotice(targetId, `Staff onboarding approval requested for ${staff.firstName} ${staff.lastName}.`, `/employees/${staff._id}`, 'enrollment-supervisor');
    }
    async progressToAuditStage(staff, approverId) {
        staff.workflowStage = 'AUDIT';
        staff.auditStatus = 'Pending';
        staff.workflowUpdatedAt = new Date();
        if (approverId) {
            staff.hodApproval = approverId;
        }
        await staff.save();
        const auditApprover = await this.findActiveStaffByRoleKeywords(['head of audit'], staff.entity);
        const auditUser = auditApprover?.[0];
        if (auditUser?._id) {
            await this.createNotice(auditUser._id, `Audit approval required for ${staff.firstName} ${staff.lastName}'s onboarding.`, `/employees/${staff._id}`, 'enrollment-audit');
        }
    }
    async notifyItStage(staff) {
        const itUsers = await this.findActiveStaffByRoleKeywords(['it'], staff.entity);
        await Promise.all(itUsers.map((user) => this.createNotice(user._id, `IT action required for ${staff.firstName} ${staff.lastName}'s onboarding.`, `/employees/${staff._id}`, 'enrollment-it')));
    }
    async notifyHrStage(staff) {
        const hrUsers = await this.findActiveStaffByRoleKeywords(['hr super admin'], staff.entity);
        await Promise.all(hrUsers.map((user) => this.createNotice(user._id, `HR review required for updates to ${staff.firstName} ${staff.lastName}.`, `/employees/${staff._id}`, 'update-hr')));
    }
    async notifyStaffOutcome(staff, status, context) {
        const message = context === 'enrollment'
            ? status === 'Approved'
                ? 'Your onboarding has been completed.'
                : 'Your onboarding request was rejected.'
            : status === 'Approved'
                ? 'Your profile update has been approved.'
                : 'Your profile update was rejected.';
        await this.createNotice(staff._id, message, `/employees/${staff._id}`, context === 'enrollment' ? 'enrollment-outcome' : 'update-outcome');
    }
    async createOrUpdateStaff(createStaffDto) {
        try {
            const { email, staffId, ...updateData } = createStaffDto;
            if (!email && !staffId) {
                throw new Error('Either email or staffId must be provided to identify the staff record.');
            }
            const query = {};
            if (staffId)
                query.staffId = staffId;
            if (email)
                query.email = email;
            const existing = await this.staffModel.findOne(query);
            const now = new Date();
            if (existing) {
                const normalizedUpdates = await this.sanitizeStaffPayload({ email, staffId, ...updateData });
                const diffs = this.computePendingChanges(existing, normalizedUpdates);
                if (!Object.keys(diffs).length) {
                    return existing;
                }
                existing.pendingChanges = {
                    ...(existing.pendingChanges || {}),
                    ...diffs,
                };
                existing.requiresHrApproval = true;
                existing.workflowType = 'update';
                existing.workflowStage = 'HR_REVIEW';
                existing.hrStatus = 'Pending';
                existing.workflowUpdatedAt = now;
                await existing.save();
                await this.notifyHrStage(existing);
                return existing;
            }
            const normalizedPayload = await this.sanitizeStaffPayload(createStaffDto);
            const payload = {
                ...normalizedPayload,
                status: 'Pending',
                supervisorStatus: 'Pending',
                auditStatus: 'Pending',
                itStatus: 'Pending',
                hrStatus: 'Pending',
                workflowType: 'enrollment',
                workflowStage: 'SUPERVISOR',
                requiresHrApproval: false,
                workflowUpdatedAt: now,
            };
            if (payload.supervisor2Id === '') {
                payload.supervisor2Id = null;
            }
            const staff = new this.staffModel(payload);
            await staff.save();
            await this.notifySupervisorStage(staff);
            return staff;
        }
        catch (e) {
            console.error('createOrUpdateStaff failed:', e);
            throw new Error(e.message || 'Unable to create/update staff');
        }
    }
    async createStaff(createStaffDto) {
        try {
            const { email, staffId, ...updateData } = createStaffDto;
            if (!email && !staffId) {
                throw new Error('Either email or staffId must be provided to identify the staff record.');
            }
            const query = {};
            if (staffId)
                query.staffId = staffId;
            if (email)
                query.email = email;
            const existing = await this.staffModel.findOne(query);
            const now = new Date();
            if (existing) {
                const normalizedUpdates = await this.sanitizeStaffPayload({ email, staffId, ...updateData });
                const diffs = this.computePendingChanges(existing, normalizedUpdates);
                if (!Object.keys(diffs).length) {
                    return existing;
                }
                existing.pendingChanges = {
                    ...(existing.pendingChanges || {}),
                    ...diffs,
                };
                existing.requiresHrApproval = true;
                existing.workflowType = 'update';
                existing.workflowStage = 'HR_REVIEW';
                existing.hrStatus = 'Pending';
                existing.workflowUpdatedAt = now;
                await existing.save();
                await this.notifyHrStage(existing);
                return existing;
            }
            const normalizedPayload = await this.sanitizeStaffPayload(createStaffDto);
            const payload = {
                ...normalizedPayload,
                status: 'Active',
                supervisorStatus: 'Pending',
                auditStatus: 'Pending',
                itStatus: 'Pending',
                hrStatus: 'Pending',
                workflowType: 'enrollment',
                workflowStage: 'SUPERVISOR',
                requiresHrApproval: false,
                workflowUpdatedAt: now,
            };
            if (payload.supervisorId === '') {
                payload.supervisorId = null;
            }
            if (payload.supervisor2Id === '') {
                payload.supervisor2Id = null;
            }
            const staff = new this.staffModel(payload);
            await staff.save();
            await this.notifySupervisorStage(staff);
            return staff;
        }
        catch (e) {
            console.error('createOrUpdateStaff failed:', e);
            throw new Error(e.message || 'Unable to create staff');
        }
    }
    async updateUploadedStaff(createStaffDto, options) {
        try {
            const { email, staffId, ...updateData } = createStaffDto;
            if (!email && !staffId) {
                throw new Error('Either email or staffId must be provided to identify the staff record.');
            }
            let existing = null;
            if (staffId) {
                existing = await this.staffModel.findOne({ staffId });
            }
            if (!existing && email) {
                existing = await this.staffModel.findOne({ email });
            }
            if (!existing) {
                if (!options?.allowCreate) {
                    return null;
                }
                const now = new Date();
                const normalizedPayload = await this.sanitizeStaffPayload(createStaffDto);
                const payload = {
                    ...normalizedPayload,
                    status: normalizedPayload.status ?? 'Active',
                    supervisorStatus: 'Pending',
                    auditStatus: 'Pending',
                    itStatus: 'Pending',
                    hrStatus: 'Pending',
                    workflowType: 'enrollment',
                    workflowStage: 'SUPERVISOR',
                    requiresHrApproval: false,
                    workflowUpdatedAt: now,
                };
                const staff = new this.staffModel(payload);
                await staff.save();
                await this.notifySupervisorStage(staff);
                return staff;
            }
            const now = new Date();
            const normalizedUpdates = await this.sanitizeStaffPayload({ email, staffId, ...updateData });
            const diffs = this.computePendingChanges(existing, normalizedUpdates);
            if (!Object.keys(diffs).length) {
                return existing;
            }
            existing.pendingChanges = {
                ...(existing.pendingChanges || {}),
                ...diffs,
            };
            existing.requiresHrApproval = true;
            existing.workflowType = 'update';
            existing.workflowStage = 'HR_REVIEW';
            existing.hrStatus = 'Pending';
            existing.workflowUpdatedAt = now;
            await existing.save({ validateBeforeSave: false });
            await this.notifyHrStage(existing);
            return existing;
        }
        catch (e) {
            console.error('updateUploadedStaff failed:', e);
            throw new Error(e.message || 'Unable to update staff');
        }
    }
    async resetPassword(userId, preferredPassword, actingUserId) {
        const user = await this.staffModel.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        const email = (user.email ?? '').trim();
        const resetRequestedBy = actingUserId && mongoose_2.default.Types.ObjectId.isValid(actingUserId)
            ? new mongoose_2.default.Types.ObjectId(actingUserId)
            : null;
        if (email) {
            const rawToken = crypto.randomBytes(32).toString('hex');
            const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
            user.passwordResetToken = hashedToken;
            user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
            user.passwordResetRequestedAt = new Date();
            user.passwordResetRequestedBy = resetRequestedBy;
            await user.save();
            const resetLink = `${this.getPortalBaseUrl()}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;
            try {
                await this.notificationService.sendMail({
                    to: email,
                    templateType: 'admin-password-reset',
                    templateVariables: {
                        fullName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || email,
                        resetLink,
                        token: rawToken,
                        expiresAt: user.passwordResetExpires?.toISOString() ?? null,
                    },
                });
            }
            catch (_) {
            }
            await this.createNotice(user._id, 'An administrator initiated a password reset for your account.');
            return {
                emailed: true,
                expiresAt: user.passwordResetExpires?.toISOString() ?? null,
            };
        }
        const finalPassword = preferredPassword && preferredPassword.trim().length >= 6
            ? preferredPassword.trim()
            : this.generateRandomPassword();
        const hashedPassword = await bcrypt.hash(finalPassword, 10);
        user.password = hashedPassword;
        user.passwordResetToken = null;
        user.passwordResetExpires = null;
        user.passwordResetRequestedAt = new Date();
        user.passwordResetRequestedBy = resetRequestedBy;
        await user.save();
        await this.createNotice(user._id, 'An administrator reset your password. Use the temporary password provided to sign in.');
        return {
            emailed: false,
            generatedPassword: finalPassword,
        };
    }
    async updateStaff(createStaffDto) {
        try {
            const { id, ...updateData } = createStaffDto;
            const staff = await this.staffModel.findById(id);
            if (!staff) {
                throw new Error('Staff not found');
            }
            if (updateData.exitDate) {
                const exit = new Date(updateData.exitDate);
                if (!isNaN(exit.getTime())) {
                    updateData.exitDate = exit;
                    const isBefore2020 = exit.getFullYear() < 2020;
                    const isPast = exit.getTime() <= Date.now();
                    updateData.status = (!isBefore2020 && isPast) ? 'Inactive' : 'Active';
                }
                else {
                    delete updateData.exitDate;
                }
            }
            const diffs = this.computePendingChanges(staff, updateData);
            if (!Object.keys(diffs).length) {
                return staff;
            }
            staff.pendingChanges = {
                ...(staff.pendingChanges || {}),
                ...diffs,
            };
            staff.requiresHrApproval = true;
            staff.workflowType = 'update';
            staff.workflowStage = 'HR_REVIEW';
            staff.hrStatus = 'Pending';
            staff.workflowUpdatedAt = new Date();
            await staff.save({ validateBeforeSave: false });
            await this.notifyHrStage(staff);
            return staff;
        }
        catch (e) {
            throw new Error(e.message || 'Unable to update staff');
        }
    }
    async resetRent(staffId) {
        const staff = await this.staffModel.findById(staffId);
        if (!staff) {
            throw new Error('Staff not found');
        }
        return this.updateStaff({
            id: staffId,
            rent: null,
            rentStartDate: null,
            rentEndDate: null,
            rentStart: null,
            rentEnd: null,
            rentReceipt: null,
            rentSupporting: null,
        });
    }
    async updateSupervisor(data) {
        try {
            const { staffId, supervisorId, supervisor2Id } = data;
            if (!staffId) {
                throw new Error('staffId is required');
            }
            const updateData = {};
            if (supervisorId) {
                const supervisor = await this.staffModel.findOne({ staffId: supervisorId });
                if (!supervisor) {
                    throw new Error('Supervisor not found');
                }
                updateData.supervisorId = supervisor._id;
            }
            if (supervisor2Id) {
                const supervisor2 = await this.staffModel.findOne({ staffId: supervisor2Id });
                if (!supervisor2) {
                    throw new Error('Supervisor 2 not found');
                }
                updateData.supervisor2Id = supervisor2._id;
            }
            const staff = await this.staffModel.updateOne({ staffId }, updateData);
            if (!staff)
                throw new Error('Staff not found');
            return { msg: 'Supervisor updated successfully', supervisorId: updateData.supervisorId };
        }
        catch (e) {
            console.error('Update supervisor error:', e);
            throw new Error(e.message);
        }
    }
    async uploadSupervisor(source, fileName) {
        try {
            const normalizedName = String(fileName ?? '').toLowerCase();
            if (normalizedName.endsWith('.xls')) {
                throw new Error('Legacy .xls files are not supported. Please save as .xlsx or .csv.');
            }
            let rows = [];
            if (normalizedName.endsWith('.csv')) {
                rows = (0, spreadsheet_util_1.csvBufferToObjects)(source, { defval: '', trim: true }).rows;
            }
            else {
                try {
                    const workbook = await (0, spreadsheet_util_1.loadWorkbook)(source, fileName);
                    const sheet = (0, spreadsheet_util_1.getFirstWorksheet)(workbook);
                    if (!sheet) {
                        throw new Error('No worksheet found in uploaded file.');
                    }
                    rows = (0, spreadsheet_util_1.worksheetToObjects)(sheet, { defval: '', useText: true }).rows;
                }
                catch (error) {
                    const fallback = (0, spreadsheet_util_1.csvBufferToObjects)(source, { defval: '', trim: true }).rows;
                    if (!fallback.length) {
                        throw error;
                    }
                    rows = fallback;
                }
            }
            const errors = [];
            const updates = [];
            for (const [index, row] of rows.entries()) {
                const { staffId, supervisorId } = row;
                if (!staffId) {
                    errors.push({ row: index + 2, error: 'Missing staffId' });
                    continue;
                }
                try {
                    const result = await this.updateSupervisor({ staffId, supervisorId });
                    updates.push(result.staff?.staffId || staffId);
                }
                catch (err) {
                    errors.push({ row: index + 2, error: err.message });
                }
            }
            return {
                message: 'Supervisor upload completed',
                updated: updates.length,
                failed: errors.length,
                errors,
            };
        }
        catch (e) {
            throw new Error(`uploadSupervisor failed: ${e.message}`);
        }
    }
    async getWorkflowSummary(type, entity, supervisorId) {
        const allowedTypes = type ? [type] : ['enrollment', 'update'];
        const filter = {
            workflowType: { $in: allowedTypes },
        };
        if (entity) {
            filter.$or = [{ entity }, { entity: (0, index_utils_1.toObjectId)(entity) }];
        }
        const normalizedSupervisor = this.normalizeObjectId(supervisorId);
        if (normalizedSupervisor) {
            filter.$and = [
                ...(filter.$and ?? []),
                { $or: [{ supervisorId: normalizedSupervisor }, { supervisor2Id: normalizedSupervisor }] },
            ];
        }
        const data = await this.staffModel
            .find(filter)
            .select(STAFF_WORKFLOW_PROJECTION)
            .populate([
            { path: 'department', select: 'name entity', options: { lean: true } },
            { path: 'role', select: 'name app profileKey', options: { lean: true }, skipInvalidIds: true },
            { path: 'branch', select: 'name entity', options: { lean: true } },
            { path: 'entity', select: 'name short', options: { lean: true } },
            ...STAFF_SUPERVISOR_LITE_POPULATE,
        ])
            .sort({ workflowUpdatedAt: -1, updatedAt: -1 })
            .lean();
        return data.map((item) => ({
            _id: item._id,
            staffId: item.staffId,
            name: `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim(),
            department: item?.department?.name ?? null,
            role: item?.role?.name ?? null,
            branch: item?.branch?.name ?? null,
            entity: item?.entity?.name ?? item?.entity ?? null,
            supervisorStatus: item?.supervisorStatus ?? 'Pending',
            auditStatus: item?.auditStatus ?? 'Pending',
            itStatus: item?.itStatus ?? 'Pending',
            hrStatus: item?.hrStatus ?? 'Pending',
            workflowType: item?.workflowType ?? null,
            workflowStage: item?.workflowStage ?? 'NONE',
            workflowUpdatedAt: item?.workflowUpdatedAt ?? item?.updatedAt ?? item?.createdAt,
            requiresHrApproval: !!item?.requiresHrApproval,
            pendingChanges: item?.pendingChanges ?? null,
            status: item?.status,
            supervisor: item?.supervisorId ? `${item.supervisorId?.firstName ?? ''} ${item.supervisorId?.lastName ?? ''}`.trim() : null,
            supervisor2: item?.supervisor2Id ? `${item.supervisor2Id?.firstName ?? ''} ${item.supervisor2Id?.lastName ?? ''}`.trim() : null,
        }));
    }
    async approveUser(userId, approverId, type, action = 'approve', payload) {
        try {
            const staff = await this.staffModel.findById(userId);
            if (!staff) {
                throw new Error('Staff not found');
            }
            const optionalRefs = [
                'supervisorId',
                'supervisor2Id',
                'businessUnit',
                'role',
                'department',
                'branch',
                'entity',
                'level',
            ];
            this.normalizeOptionalObjectIds(staff, optionalRefs);
            this.normalizeAdditionalBranchIds(staff);
            if (staff.pendingChanges && typeof staff.pendingChanges === 'object') {
                this.normalizeOptionalObjectIds(staff.pendingChanges, optionalRefs);
            }
            const now = new Date();
            const isApprove = action === 'approve';
            if (type === 'supervisor') {
                if (staff.workflowStage !== 'SUPERVISOR') {
                    throw new Error('Staff is not awaiting supervisor approval.');
                }
                staff.supervisorStatus = isApprove ? 'Approved' : 'Rejected';
                staff.workflowUpdatedAt = now;
                if (isApprove) {
                    await this.progressToAuditStage(staff, approverId);
                }
                else {
                    staff.status = 'Rejected';
                    staff.workflowStage = 'REJECTED';
                    await staff.save();
                    await this.notifyStaffOutcome(staff, 'Rejected', 'enrollment');
                }
                return {
                    message: `Supervisor ${isApprove ? 'approval' : 'rejection'} recorded successfully`,
                    data: staff,
                };
            }
            if (type === 'audit') {
                if (staff.workflowStage !== 'AUDIT') {
                    throw new Error('Staff is not awaiting audit approval.');
                }
                staff.auditStatus = isApprove ? 'Approved' : 'Rejected';
                staff.auditApproval = isApprove ? approverId : staff.auditApproval;
                staff.workflowUpdatedAt = now;
                if (isApprove) {
                    staff.workflowStage = 'IT';
                    await staff.save();
                    await this.notifyItStage(staff);
                }
                else {
                    staff.status = 'Rejected';
                    staff.workflowStage = 'REJECTED';
                    await staff.save();
                    await this.notifyStaffOutcome(staff, 'Rejected', 'enrollment');
                }
                return {
                    message: `Audit ${isApprove ? 'approval' : 'rejection'} recorded successfully`,
                    data: staff,
                };
            }
            if (type === 'it') {
                if (staff.workflowStage !== 'IT') {
                    throw new Error('Staff is not awaiting IT action.');
                }
                staff.itStatus = isApprove ? 'Approved' : 'Rejected';
                staff.itApproval = isApprove ? approverId : staff.itApproval;
                staff.workflowUpdatedAt = now;
                if (isApprove) {
                    if (payload?.orbitID) {
                        staff.orbitID = payload.orbitID;
                    }
                    if (payload?.email) {
                        staff.email = payload.email;
                    }
                    staff.status = 'Active';
                    staff.workflowStage = 'COMPLETED';
                    staff.hrStatus = 'Approved';
                    staff.requiresHrApproval = false;
                    staff.pendingChanges = null;
                    staff.workflowType = 'enrollment';
                    await staff.save();
                    await this.notifyStaffOutcome(staff, 'Approved', 'enrollment');
                }
                else {
                    staff.status = 'Rejected';
                    staff.workflowStage = 'REJECTED';
                    await staff.save();
                    await this.notifyStaffOutcome(staff, 'Rejected', 'enrollment');
                }
                return {
                    message: `IT ${isApprove ? 'completion' : 'rejection'} recorded successfully`,
                    data: staff,
                };
            }
            if (type === 'hr') {
                if (!staff.requiresHrApproval) {
                    throw new Error('Staff is not pending HR review.');
                }
                staff.hrStatus = isApprove ? 'Approved' : 'Rejected';
                staff.workflowUpdatedAt = now;
                if (isApprove) {
                    const pendingRaw = await this.normalizePendingReferenceIds(staff.pendingChanges || {}, staff);
                    const pending = this.stripEmptyPayloadFields(pendingRaw);
                    const pendingExitDate = pending?.exitDate;
                    const resolvedExitDate = pendingExitDate instanceof Date ? pendingExitDate : new Date(pendingExitDate);
                    const hasExitUpdate = pendingExitDate !== undefined &&
                        pendingExitDate !== null &&
                        !Number.isNaN(resolvedExitDate.getTime());
                    if (hasExitUpdate) {
                        staff.exitDate = resolvedExitDate;
                        if (Object.prototype.hasOwnProperty.call(pending, 'status')) {
                            staff.status = pending.status;
                        }
                        staff.pendingChanges = null;
                        staff.requiresHrApproval = false;
                        staff.workflowStage = 'COMPLETED';
                        staff.workflowType = null;
                        await staff.save({ validateBeforeSave: false });
                        await this.notifyStaffOutcome(staff, 'Approved', 'update');
                        return {
                            message: `HR ${isApprove ? 'approval' : 'rejection'} recorded successfully`,
                            data: staff,
                        };
                    }
                    for (const [key, value] of Object.entries(pending)) {
                        if (key === 'additionalRoles') {
                            staff[key] = await this.resolveAdditionalRoleAssignments(value);
                            continue;
                        }
                        staff[key] = value;
                    }
                    staff.pendingChanges = null;
                    staff.requiresHrApproval = false;
                    staff.workflowStage = 'COMPLETED';
                    staff.workflowType = null;
                    await staff.save();
                    await this.notifyStaffOutcome(staff, 'Approved', 'update');
                }
                else {
                    staff.pendingChanges = null;
                    staff.requiresHrApproval = false;
                    staff.workflowStage = 'REJECTED';
                    staff.workflowType = null;
                    await staff.save();
                    await this.notifyStaffOutcome(staff, 'Rejected', 'update');
                }
                return {
                    message: `HR ${isApprove ? 'approval' : 'rejection'} recorded successfully`,
                    data: staff,
                };
            }
            throw new Error('Invalid approval type');
        }
        catch (e) {
            throw new Error(`approveUser failed: ${e.message}`);
        }
    }
    async uploadXlsx(source, fileName, _user) {
        try {
            const normalizedName = String(fileName ?? '').toLowerCase();
            if (normalizedName.endsWith('.xls')) {
                throw new Error('Legacy .xls files are not supported. Please save as .xlsx or .csv.');
            }
            let jsonData = [];
            if (normalizedName.endsWith('.csv')) {
                jsonData = (0, spreadsheet_util_1.csvBufferToObjects)(source, { defval: '', trim: true }).rows;
            }
            else {
                try {
                    const workbook = await (0, spreadsheet_util_1.loadWorkbook)(source, fileName);
                    const sheet = (0, spreadsheet_util_1.getFirstWorksheet)(workbook);
                    if (!sheet) {
                        throw new Error('No worksheet found in uploaded file.');
                    }
                    jsonData = (0, spreadsheet_util_1.worksheetToObjects)(sheet, { defval: '', useText: true }).rows;
                }
                catch (error) {
                    const fallback = (0, spreadsheet_util_1.csvBufferToObjects)(source, { defval: '', trim: true }).rows;
                    if (!fallback.length) {
                        throw error;
                    }
                    jsonData = fallback;
                }
            }
            const skippedRows = [];
            const errors = [];
            let successCount = 0;
            const createRequiredFields = new Set(['firstName', 'lastName', 'branch', 'department', 'entity']);
            for (const [index, row] of jsonData.entries()) {
                const rowNumber = index + 2;
                const rawStaffId = row['staffId'] ?? row['staffID'];
                const rawEmail = row['email'] ?? row['Email'];
                const staffId = String(rawStaffId || '').trim();
                const email = String(rawEmail || '').trim();
                if (!staffId && !email) {
                    skippedRows.push({ row: rowNumber, reason: 'Missing staffId/email' });
                    continue;
                }
                let existingStaff = await this.staffModel
                    .findOne(staffId ? { staffId } : { email })
                    .select('employeeInformation')
                    .lean();
                if (!existingStaff && staffId && email) {
                    existingStaff = await this.staffModel
                        .findOne({ email })
                        .select('employeeInformation')
                        .lean();
                }
                const shouldCreate = !existingStaff;
                const entityCode = row['entity'] ? String(row['entity']).trim() : '';
                const departmentName = row['department'] ? String(row['department']).trim() : '';
                const businessUnitName = row['businessUnit'] ? String(row['businessUnit']).trim() : '';
                const roleName = row['role'] ? String(row['role']).trim() : '';
                const levelName = row['level'] ? String(row['level']).trim() : '';
                const branchName = row['branch'] ? String(row['branch']).trim() : '';
                const supervisorCode = row['supervisor'] ? String(row['supervisor']).trim() : '';
                const supervisor2Code = row['supervisor2'] ? String(row['supervisor2']).trim() : '';
                const rowIssues = [];
                const addIssue = (field, message) => rowIssues.push({ field, message });
                const entity = entityCode ? await this.entityService.getSubsidiaryByShort(entityCode) : null;
                if (entityCode && !entity) {
                    addIssue('entity', `Entity '${entityCode}' not found`);
                }
                const entityIdentifier = entity?._id ?? entityCode ?? null;
                if (!entityIdentifier && (departmentName || roleName)) {
                    addIssue('entity', 'Entity code is required to map department/role');
                }
                const department = departmentName
                    ? await this.departmentService.getDepartmentByNameAndEntity(departmentName, entityIdentifier)
                        ?? await this.departmentService.getDepartmentByName(departmentName)
                    : null;
                if (departmentName && !department) {
                    addIssue('department', `Department '${departmentName}' not found${entityCode ? ` for entity '${entityCode}'` : ''}`);
                }
                const businessUnit = businessUnitName ? await this.businessUnit.getBusinessUnitByName(businessUnitName) : null;
                if (businessUnitName && !businessUnit) {
                    addIssue('businessUnit', `Business unit '${businessUnitName}' not found`);
                }
                const level = levelName ? await this.levelService.getLevelByNameAndEntity(levelName) : null;
                if (levelName && !level) {
                    addIssue('level', `Level '${levelName}' not found`);
                }
                const branch = branchName ? await this.branchService.getBranchByName(branchName) : null;
                if (branchName && !branch) {
                    addIssue('branch', `Branch '${branchName}' not found`);
                }
                const roleRecord = roleName
                    ? await this.resolveRoleByNameAndEntity(roleName, entityIdentifier)
                    : null;
                if (roleName && !roleRecord) {
                    addIssue('role', `Role '${roleName}' not found${entityCode ? ` for entity '${entityCode}'` : ''}`);
                }
                if (shouldCreate) {
                    if (!String(row['firstName'] ?? '').trim()) {
                        addIssue('firstName', 'First name is required');
                    }
                    if (!String(row['lastName'] ?? '').trim()) {
                        addIssue('lastName', 'Last name is required');
                    }
                    if (!entity?._id && !entityCode) {
                        addIssue('entity', 'Entity is required');
                    }
                    if (!department?._id && !departmentName) {
                        addIssue('department', 'Department is required');
                    }
                    if (!branch?._id && !branchName) {
                        addIssue('branch', 'Branch is required');
                    }
                }
                if (shouldCreate && rowIssues.some((issue) => createRequiredFields.has(issue.field))) {
                    for (const issue of rowIssues) {
                        errors.push({ row: rowNumber, staffId, field: issue.field, error: issue.message });
                    }
                    continue;
                }
                const startDate = row['startDate'] ? await this.convertDate(row['startDate']) : null;
                const exitDate = row['exitDate'] ? await this.convertDate(row['exitDate']) : null;
                const dateOfBirth = row['dateOfBirth'] ? await this.convertDate(row['dateOfBirth']) : null;
                let supervisorId = null;
                let supervisor2Id = null;
                if (supervisorCode) {
                    const supervisor = await this.staffModel.findOne({ staffId: supervisorCode }).select('_id').lean();
                    if (supervisor?._id) {
                        supervisorId = new mongoose_2.default.Types.ObjectId(supervisor._id);
                    }
                    else {
                        addIssue('supervisor', `Supervisor with staffId '${supervisorCode}' not found`);
                    }
                }
                if (supervisor2Code && supervisor2Code.trim()) {
                    const supervisor2 = await this.staffModel.findOne({ staffId: supervisor2Code.trim() }).select('_id').lean();
                    if (supervisor2?._id) {
                        supervisor2Id = new mongoose_2.default.Types.ObjectId(supervisor2._id);
                    }
                    else {
                        addIssue('supervisor2', `Supervisor 2 with staffId '${supervisor2Code}' not found`);
                    }
                }
                const { entity: _entity, department: _department, businessUnit: _businessUnit, level: _level, branch: _branch, role: _role, supervisorId: _supervisorId, startDate: _startDate, exitDate: _exitDate, dateOfBirth: _dateOfBirth, firstName: _firstName, lastName: _lastName, middleName: _middleName, email: _email, phoneNumber: _phoneNumber, addosserAccount: _addosserAccount, atlasAccount: _atlasAccount, aftaAccount: _aftaAccount, status: _status, orbitID: _orbitID, confirmed: _confirmed, staffId: _staffId, staffID: _staffID, supervisor: _supervisor, supervisor2: _supervisor2, transportLevel: _transportLevel, ...rest } = row;
                let createStaffDto = {
                    staffId,
                    firstName: row['firstName'] ? String(row['firstName']).toUpperCase().trim() : '',
                    lastName: row['lastName'] ? String(row['lastName']).toUpperCase().trim() : '',
                    middleName: row['middleName'] ? String(row['middleName']).toUpperCase().trim() : '',
                    email,
                    phoneNumber: row['phoneNumber'] ? String(row['phoneNumber']).trim() : '',
                    branch: branch?._id ? new mongoose_2.default.Types.ObjectId(branch._id) : null,
                    department: department?._id ? new mongoose_2.default.Types.ObjectId(department._id) : null,
                    businessUnit: businessUnit?._id ? new mongoose_2.default.Types.ObjectId(businessUnit._id) : null,
                    entity: entity?._id ? new mongoose_2.default.Types.ObjectId(entity._id) : null,
                    level: level?._id ? new mongoose_2.default.Types.ObjectId(level._id) : null,
                    role: roleRecord?._id ? new mongoose_2.default.Types.ObjectId(roleRecord._id) : null,
                    startDate: startDate || '',
                    exitDate: exitDate || '',
                    dateOfBirth: dateOfBirth || '',
                    addosserAccount: row['addosserAccount'] ? String(row['addosserAccount']).trim() : '',
                    atlasAccount: row['atlasAccount'] ? String(row['atlasAccount']).trim() : '',
                    aftaAccount: row['aftaAccount'] ? String(row['aftaAccount']).trim() : '',
                    status: row['status'] ? String(row['status']).trim() : 'Active',
                    orbitID: row['orbitID'] ? String(row['orbitID']).trim() : '',
                    confirmed: row['confirmed'] !== undefined && row['confirmed'] !== null ? String(row['confirmed']) : '',
                    transportLevel: row['transportLevel'] ? String(row['transportLevel']).trim().toLowerCase() : '',
                    supervisorId,
                    supervisor2Id,
                    ...rest
                };
                const accountDetailFields = [
                    'bankName',
                    'accountName',
                    'accountNumber',
                    'bvn',
                    'nhf',
                    'pensionAccount',
                    'pensionProvider',
                    'payeAccount',
                    'swiftCode',
                    'sortCode'
                ];
                const accountDetail = {};
                const baseAccountDetail = {};
                if (existingStaff?.employeeInformation && typeof existingStaff.employeeInformation === 'object') {
                    accountDetailFields.forEach((field) => {
                        const existingValue = existingStaff.employeeInformation?.accountDetail?.[field] ??
                            existingStaff.employeeInformation?.[field];
                        if (existingValue !== undefined && existingValue !== null) {
                            baseAccountDetail[field] = existingValue;
                        }
                    });
                }
                accountDetailFields.forEach((field) => {
                    const value = row[field];
                    if (value !== undefined && value !== null && String(value).trim() !== '') {
                        accountDetail[field] = typeof value === 'string' ? value.trim() : value;
                    }
                });
                const mergedAccountDetail = Object.keys({ ...baseAccountDetail, ...accountDetail }).length
                    ? { ...baseAccountDetail, ...accountDetail }
                    : null;
                if (mergedAccountDetail) {
                    createStaffDto.employeeInformation = {
                        ...(existingStaff?.employeeInformation || {}),
                        ...(createStaffDto.employeeInformation || {}),
                        accountDetail: mergedAccountDetail,
                    };
                }
                createStaffDto = Object.fromEntries(Object.entries(createStaffDto).filter(([key, value]) => key === 'staffId' || (value !== '' && value !== null && value !== undefined)));
                const result = await this.updateUploadedStaff(createStaffDto, { allowCreate: true });
                if (result) {
                    successCount++;
                }
                else {
                    addIssue('record', 'Staff record could not be created or updated.');
                }
                for (const issue of rowIssues) {
                    errors.push({ row: rowNumber, staffId, field: issue.field, error: issue.message });
                }
            }
            return {
                message: 'Upload complete',
                successCount,
                skippedRowsCount: skippedRows.length,
                skippedRows,
                errors
            };
        }
        catch (error) {
            console.error("Error uploading staff XLSX:", error);
            throw error;
        }
    }
    async getBySupervisor(short, options) {
        try {
            const supervisorId = (0, index_utils_1.toObjectId)(short);
            const useLight = options?.light === true;
            const projection = useLight ? STAFF_ATTENDANCE_PROJECTION : STAFF_SAFE_PROJECTION;
            const populate = useLight
                ? STAFF_ATTENDANCE_POPULATE
                : [
                    { path: "branch", options: { lean: true } },
                    { path: "level", options: { lean: true } },
                ];
            return this.staffModel
                .find({
                $or: [
                    { supervisorId: { $in: [short, supervisorId] } },
                    { supervisor2Id: { $in: [short, supervisorId] } },
                ],
                status: "Active"
            })
                .select(projection)
                .populate(populate)
                .lean();
        }
        catch (e) {
            throw new Error(e.message);
        }
    }
    resolvePayrollMonthRange(value) {
        if (!value)
            return null;
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            const start = new Date(value.getFullYear(), value.getMonth(), 1);
            const end = new Date(value.getFullYear(), value.getMonth() + 1, 1);
            return { start, end };
        }
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed)
                return null;
            if (/^\d{4}[-/]\d{1,2}$/.test(trimmed)) {
                const [yearPart, monthPart] = trimmed.split(/[-/]/);
                const year = Number(yearPart);
                const month = Number(monthPart);
                if (Number.isFinite(year) && Number.isFinite(month)) {
                    const start = new Date(year, month - 1, 1);
                    const end = new Date(year, month, 1);
                    return { start, end };
                }
            }
            const parsed = new Date(trimmed);
            if (!Number.isNaN(parsed.getTime())) {
                const start = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
                const end = new Date(parsed.getFullYear(), parsed.getMonth() + 1, 1);
                return { start, end };
            }
        }
        return null;
    }
    async getStaffList(short, options) {
        try {
            const entity = (0, index_utils_1.toObjectId)(short);
            const useLight = options?.light === true;
            const projection = useLight ? STAFF_ATTENDANCE_PROJECTION : STAFF_SAFE_PROJECTION;
            const populate = useLight
                ? STAFF_ATTENDANCE_POPULATE
                : [
                    { path: "branch", options: { lean: true } },
                    { path: "level", options: { lean: true } },
                ];
            const matchConditions = [{ $or: [{ entity: String(short) }, { entity }] }];
            const exitWindow = this.resolvePayrollMonthRange(options?.includeExitedInMonth);
            if (exitWindow) {
                matchConditions.push({
                    $or: [
                        { status: "Active" },
                        { exitDate: { $gte: exitWindow.start, $lt: exitWindow.end } },
                    ],
                });
            }
            else {
                matchConditions.push({ status: "Active" });
            }
            const query = matchConditions.length === 1
                ? matchConditions[0]
                : { $and: matchConditions };
            return this.staffModel
                .find(query)
                .select(projection)
                .populate(populate)
                .lean();
        }
        catch (e) {
            throw new Error(e.message);
        }
    }
    async findFirstActiveByRoleNames(roleNames, entity) {
        try {
            const lowered = roleNames.map((name) => name.toLowerCase());
            const query = { status: "Active" };
            if (entity) {
                query.$or = [{ entity }, { entity: (0, index_utils_1.toObjectId)(entity) }];
            }
            const staff = await this.staffModel
                .find(query)
                .select(STAFF_SAFE_PROJECTION)
                .populate([
                ...STAFF_SUMMARY_POPULATE,
                ...STAFF_SUPERVISOR_POPULATE,
            ])
                .lean();
            const candidate = staff.find((member) => {
                const roleName = member?.role?.name;
                return roleName && lowered.some((target) => roleName.toLowerCase().includes(target));
            });
            if (!candidate) {
                return null;
            }
            return this.getById(candidate._id);
        }
        catch (e) {
            throw new Error(e.message);
        }
    }
    async findFirstActiveByPermission(permissionName, entity) {
        try {
            const target = permissionName?.trim().toLowerCase();
            if (!target) {
                return null;
            }
            const query = { status: 'Active' };
            if (entity) {
                query.$or = [{ entity }, { entity: (0, index_utils_1.toObjectId)(entity) }];
            }
            const population = [
                ...STAFF_SUMMARY_POPULATE,
                ...STAFF_SUPERVISOR_POPULATE,
                {
                    path: 'role',
                    skipInvalidIds: true,
                    populate: { path: 'permissions', options: { lean: true }, skipInvalidIds: true },
                },
            ];
            const staff = await this.staffModel
                .find(query)
                .select(STAFF_SAFE_PROJECTION)
                .populate(population)
                .lean();
            const candidate = staff.find((member) => {
                const permissions = this.extractPermissionNames(member);
                return permissions.some((perm) => perm === target);
            });
            if (!candidate) {
                return null;
            }
            return this.getById(candidate._id);
        }
        catch (e) {
            throw new Error(e.message);
        }
    }
    async getStaffList2(subsidiaryId, supervisorScope) {
        try {
            const matchConditions = [{ status: "Active" }];
            if (subsidiaryId) {
                const normalizedEntityId = this.normalizeObjectId(subsidiaryId);
                const entityConditions = [];
                if (normalizedEntityId) {
                    entityConditions.push({ entity: normalizedEntityId });
                    entityConditions.push({ entity: subsidiaryId });
                }
                if (entityConditions.length === 1) {
                    matchConditions.push(entityConditions[0]);
                }
                else if (entityConditions.length > 1) {
                    matchConditions.push({ $or: entityConditions });
                }
            }
            const supervisorIds = this.normalizeSupervisorScope(supervisorScope);
            if (supervisorIds.length) {
                matchConditions.push({
                    $or: [
                        { supervisorId: { $in: supervisorIds } },
                        { supervisor2Id: { $in: supervisorIds } },
                    ],
                });
            }
            const query = matchConditions.length === 1
                ? matchConditions[0]
                : { $and: matchConditions };
            return this.staffModel
                .find(query)
                .select(STAFF_DIRECTORY_PROJECTION)
                .populate(STAFF_DIRECTORY_POPULATE)
                .lean();
        }
        catch (e) {
            throw new Error(e.message);
        }
    }
    async exportUser(params) {
        const pipeline = [];
        const matchConditions = [];
        const hasFilterValue = (value) => {
            if (value == null)
                return false;
            const trimmed = String(value).trim();
            if (!trimmed)
                return false;
            const lowered = trimmed.toLowerCase();
            return lowered !== 'all' && lowered !== 'null' && lowered !== 'undefined';
        };
        if (hasFilterValue(params?.status)) {
            matchConditions.push({ status: String(params.status).trim() });
        }
        if (hasFilterValue(params?.subsidiaryId)) {
            const normalizedEntityId = this.normalizeObjectId(params?.subsidiaryId);
            const entityConditions = [];
            if (normalizedEntityId) {
                entityConditions.push({ entity: normalizedEntityId });
            }
            entityConditions.push({ entity: params?.subsidiaryId });
            if (entityConditions.length === 1) {
                matchConditions.push(entityConditions[0]);
            }
            else {
                matchConditions.push({ $or: entityConditions });
            }
        }
        if (hasFilterValue(params?.branch)) {
            matchConditions.push({ branch: { $in: [params.branch, (0, index_utils_1.toObjectId)(params.branch)] } });
        }
        if (hasFilterValue(params?.department)) {
            matchConditions.push({
                department: { $in: [params.department, (0, index_utils_1.toObjectId)(params.department)] },
            });
        }
        if (hasFilterValue(params?.confirmed)) {
            matchConditions.push({ confirmed: String(params.confirmed).trim() });
        }
        const searchValue = params?.searchText?.trim();
        if (searchValue) {
            const regex = new RegExp(searchValue, 'i');
            matchConditions.push({
                $or: [
                    { firstName: regex },
                    { lastName: regex },
                    { middleName: regex },
                    { email: regex },
                    { staffId: regex },
                ],
            });
        }
        const supervisorIds = this.normalizeSupervisorScope(params?.supervisorScope);
        if (supervisorIds.length) {
            matchConditions.push({
                $or: [
                    { supervisorId: { $in: supervisorIds } },
                    { supervisor2Id: { $in: supervisorIds } },
                ],
            });
        }
        if (matchConditions.length === 1) {
            pipeline.push({ $match: matchConditions[0] });
        }
        else if (matchConditions.length > 1) {
            pipeline.push({ $match: { $and: matchConditions } });
        }
        pipeline.push({
            $lookup: {
                from: 'branches',
                localField: 'branch',
                foreignField: '_id',
                as: 'branches',
            },
        }, {
            $lookup: {
                from: 'businessunits',
                localField: 'businessUnit',
                foreignField: '_id',
                as: 'businessunits',
            },
        }, {
            $lookup: {
                from: 'roles',
                localField: 'role',
                foreignField: '_id',
                as: 'roles',
            },
        }, {
            $lookup: {
                from: 'subsidiaries',
                localField: 'entity',
                foreignField: '_id',
                as: 'subsidiaries',
            },
        }, {
            $lookup: {
                from: 'departments',
                localField: 'department',
                foreignField: '_id',
                as: 'departments',
            },
        }, {
            $lookup: {
                from: 'levels',
                localField: 'level',
                foreignField: '_id',
                as: 'levels',
            },
        }, {
            $lookup: {
                from: 'users',
                localField: 'supervisorId',
                foreignField: '_id',
                as: 'supervisor',
            },
        }, {
            $lookup: {
                from: 'users',
                localField: 'supervisor2Id',
                foreignField: '_id',
                as: 'supervisor2',
            },
        }, {
            $addFields: {
                branch: { $ifNull: [{ $arrayElemAt: ['$branches.name', 0] }, null] },
                role: { $ifNull: [{ $arrayElemAt: ['$roles.name', 0] }, null] },
                businessUnit: { $ifNull: [{ $arrayElemAt: ['$businessunits.BU_NM', 0] }, null] },
                entity: { $ifNull: [{ $arrayElemAt: ['$subsidiaries.short', 0] }, null] },
                department: { $ifNull: [{ $arrayElemAt: ['$departments.name', 0] }, null] },
                level: { $ifNull: [{ $arrayElemAt: ['$levels.name', 0] }, null] },
                supervisor: { $ifNull: [{ $arrayElemAt: ['$supervisor.staffId', 0] }, null] },
                supervisor2: { $ifNull: [{ $arrayElemAt: ['$supervisor2.staffId', 0] }, null] },
                nhfAccount: {
                    $ifNull: [
                        '$employeeInformation.accountDetail.nhf',
                        '$employeeInformation.accountDetail.nhfAccount',
                        '$employeeInformation.nhf',
                        '$employeeInformation.nhfAccount',
                    ],
                },
                payeAccount: {
                    $ifNull: [
                        '$employeeInformation.accountDetail.payeAccount',
                        '$employeeInformation.accountDetail.taxProfileId',
                        '$employeeInformation.payeAccount',
                        '$employeeInformation.taxProfileId',
                    ],
                },
                pensionAccount: {
                    $ifNull: [
                        '$employeeInformation.accountDetail.pensionAccount',
                        '$employeeInformation.accountDetail.rsaNumber',
                        '$employeeInformation.pensionAccount',
                        '$employeeInformation.rsaNumber',
                    ],
                },
                pensionProvider: {
                    $ifNull: [
                        '$employeeInformation.accountDetail.pensionProvider',
                        '$employeeInformation.accountDetail.pfa',
                        '$employeeInformation.pensionProvider',
                        '$employeeInformation.pfa',
                    ],
                },
            },
        }, {
            $project: {
                _id: 0,
                firstName: 1,
                lastName: 1,
                middleName: 1,
                branch: 1,
                role: 1,
                department: 1,
                businessUnit: 1,
                entity: 1,
                level: 1,
                startDate: 1,
                exitDate: 1,
                addosserAccount: 1,
                atlasAccount: 1,
                aftaAccount: 1,
                staffId: 1,
                email: 1,
                status: 1,
                orbitID: 1,
                supervisor: 1,
                supervisor2: 1,
                __rest: { $mergeObjects: '$$ROOT' },
            },
        }, {
            $replaceRoot: {
                newRoot: {
                    $mergeObjects: [
                        {
                            firstName: '$firstName',
                            lastName: '$lastName',
                            middleName: '$middleName',
                            branch: '$branch',
                            role: '$role',
                            department: '$department',
                            businessUnit: '$businessUnit',
                            entity: '$entity',
                            level: '$level',
                            startDate: '$startDate',
                            exitDate: '$exitDate',
                            addosserAccount: '$addosserAccount',
                            atlasAccount: '$atlasAccount',
                            aftaAccount: '$aftaAccount',
                            staffId: '$staffId',
                            email: '$email',
                            status: '$status',
                            orbitID: '$orbitID',
                            supervisor: '$supervisor',
                            supervisor2: '$supervisor2',
                        },
                        '$__rest',
                    ],
                },
            },
        });
        return this.staffModel.aggregate(pipeline);
    }
    async getRecentlyJoined(subsidiaryId, startDate, endDate, supervisorScope) {
        try {
            const matchConditions = [{ status: "Active" }];
            const normalizedSubsidiary = this.normalizeObjectId(subsidiaryId);
            if (normalizedSubsidiary) {
                matchConditions.push({ entity: normalizedSubsidiary });
            }
            const supervisorIds = this.normalizeSupervisorScope(supervisorScope);
            if (supervisorIds.length) {
                matchConditions.push({
                    $or: [
                        { supervisorId: { $in: supervisorIds } },
                        { supervisor2Id: { $in: supervisorIds } },
                    ],
                });
            }
            const now = new Date();
            const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
            const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);
            matchConditions.push({ startDate: { $gte: start, $lte: end } });
            const query = matchConditions.length === 1
                ? matchConditions[0]
                : { $and: matchConditions };
            return await this.staffModel
                .find(query)
                .select(STAFF_LIST_PROJECTION)
                .populate([
                { path: 'department', select: 'name entity', options: { lean: true } },
                ...STAFF_SUPERVISOR_LITE_POPULATE,
            ])
                .sort({ startDate: -1 })
                .lean();
        }
        catch (e) {
            throw new Error(`getRecentlyJoined failed: ${e.message}`);
        }
    }
    async getRecentlyExit(subsidiaryId, startDate, endDate, supervisorScope) {
        try {
            const matchConditions = [];
            const normalizedSubsidiary = this.normalizeObjectId(subsidiaryId);
            if (normalizedSubsidiary) {
                matchConditions.push({ entity: normalizedSubsidiary });
            }
            const supervisorIds = this.normalizeSupervisorScope(supervisorScope);
            if (supervisorIds.length) {
                matchConditions.push({
                    $or: [
                        { supervisorId: { $in: supervisorIds } },
                        { supervisor2Id: { $in: supervisorIds } },
                    ],
                });
            }
            const now = new Date();
            const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
            const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);
            matchConditions.push({ exitDate: { $gte: start, $lte: end } });
            const query = matchConditions.length === 1
                ? matchConditions[0]
                : { $and: matchConditions };
            return await this.staffModel
                .find(query)
                .select(STAFF_LIST_PROJECTION)
                .populate([
                { path: 'department', select: 'name entity', options: { lean: true } },
                ...STAFF_SUPERVISOR_LITE_POPULATE,
            ])
                .sort({ exitDate: -1 })
                .lean();
        }
        catch (e) {
            throw new Error(`getRecentlyExit failed: ${e.message}`);
        }
    }
    async getStaffTurnover(subsidiaryId, startDate, endDate) {
        try {
            const query = {};
            const normalizedSubsidiary = this.normalizeObjectId(subsidiaryId);
            if (normalizedSubsidiary) {
                query.entity = normalizedSubsidiary;
            }
            const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
            const end = endDate ? new Date(endDate) : new Date();
            const exitedCount = await this.staffModel.countDocuments({
                ...query,
                exitDate: { $gte: start, $lte: end },
            });
            const startCount = await this.staffModel.countDocuments({
                ...query,
                createdAt: { $lte: start },
                $or: [{ exitDate: null }, { exitDate: { $gt: start } }]
            });
            const endCount = await this.staffModel.countDocuments({
                ...query,
                createdAt: { $lte: end },
                $or: [{ exitDate: null }, { exitDate: { $gt: end } }]
            });
            const avgCount = (startCount + endCount) / 2;
            const turnoverRate = avgCount > 0 ? (exitedCount / avgCount) * 100 : 0;
            return {
                period: `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`,
                exitedCount,
                startCount,
                endCount,
                avgCount,
                turnoverRate: Number(turnoverRate.toFixed(2)) + '%',
            };
        }
        catch (e) {
            throw new Error(`getStaffTurnover failed: ${e.message}`);
        }
    }
    async getPaginatedStaff(quer, user) {
        try {
            const { page = 1, limit = 12, searchText, subsidiaryId, department, branch, confirmed, status, supervisorScope, } = quer;
            const pageNumber = Math.max(Number(page) || 1, 1);
            const pageSize = Math.max(Number(limit) || 0, 1);
            const skip = (pageNumber - 1) * pageSize;
            const query = { status: status && status !== 'all' ? status : 'Active' };
            const requestedEntityId = this.normalizeObjectId(subsidiaryId);
            const enforcedEntityId = this.resolveEntityConstraint(user, requestedEntityId);
            if (requestedEntityId) {
                query.entity = { $in: [requestedEntityId] };
            }
            if (!requestedEntityId && enforcedEntityId) {
                query.entity = enforcedEntityId;
            }
            if (department && department !== 'all') {
                query.department = { $in: [department, (0, index_utils_1.toObjectId)(department)] };
            }
            if (branch && branch !== 'all') {
                query.branch = { $in: [branch, (0, index_utils_1.toObjectId)(branch)] };
            }
            if (confirmed && confirmed !== 'all') {
                query.confirmed = confirmed;
            }
            if (searchText?.trim()) {
                const regex = new RegExp(searchText.trim(), 'i');
                query.$or = [
                    { firstName: regex },
                    { lastName: regex },
                    { middleName: regex },
                    { email: regex },
                    { staffId: regex },
                ];
            }
            if (supervisorScope) {
                const rawValues = Array.isArray(supervisorScope)
                    ? supervisorScope
                    : String(supervisorScope)
                        .split(',')
                        .map((value) => value.trim())
                        .filter((value) => value.length > 0);
                const supervisorIds = rawValues
                    .filter((value) => mongoose_2.default.Types.ObjectId.isValid(value))
                    .map((value) => new mongoose_2.default.Types.ObjectId(value));
                if (supervisorIds.length) {
                    const supervisorFilter = {
                        $or: [
                            { supervisorId: { $in: supervisorIds } },
                            { supervisor2Id: { $in: supervisorIds } },
                        ],
                    };
                    query.$and = [...(query.$and ?? []), supervisorFilter];
                }
            }
            if (query.entity &&
                typeof query.entity === 'object' &&
                '$in' in query.entity) {
                const cleanedValues = query.entity.$in
                    .map((value) => this.normalizeObjectId(value))
                    .filter((value) => Boolean(value));
                if (cleanedValues.length) {
                    query.entity.$in = cleanedValues;
                }
                else {
                    delete query.entity;
                }
            }
            if (typeof query.entity === 'string') {
                const normalisedEntity = query.entity.trim().toLowerCase();
                if (!normalisedEntity ||
                    normalisedEntity === 'undefined' ||
                    normalisedEntity === 'null' ||
                    normalisedEntity === 'all') {
                    delete query.entity;
                }
            }
            const [totalItems, data] = await Promise.all([
                this.staffModel.countDocuments(query),
                this.staffModel
                    .find(query)
                    .select(STAFF_LIST_PROJECTION)
                    .populate(STAFF_LIST_POPULATE)
                    .skip(skip)
                    .limit(pageSize)
                    .lean(),
            ]);
            return {
                currentPage: pageNumber,
                totalPages: Math.ceil(totalItems / pageSize),
                totalItems,
                data,
            };
        }
        catch (e) {
            throw new Error(`getPaginatedStaff failed: ${e.message}`);
        }
    }
    async getStaffById(staffId) {
        try {
            const conditions = [
                { staffId: String(staffId) }
            ];
            if (mongoose_2.Types.ObjectId.isValid(staffId)) {
                conditions.push({ staffId: new mongoose_2.Types.ObjectId(staffId) });
            }
            const staff = await this.staffModel
                .findOne({ $or: conditions })
                .select(STAFF_SAFE_PROJECTION)
                .lean();
            return staff;
        }
        catch (e) {
            throw new Error(e.message);
        }
    }
    async resolveStaffDirectory(staffIds, entity, options) {
        const list = Array.isArray(staffIds) ? staffIds : staffIds ? [staffIds] : [];
        const normalized = list
            .map((value) => String(value ?? '').trim())
            .filter((value) => value.length > 0);
        const unique = Array.from(new Set(normalized));
        if (!unique.length) {
            return { data: [], missing: [] };
        }
        const candidateIds = new Set();
        unique.forEach((value) => {
            candidateIds.add(value);
            candidateIds.add(value.toLowerCase());
            candidateIds.add(value.toUpperCase());
        });
        const objectIds = unique
            .filter((value) => mongoose_2.Types.ObjectId.isValid(value))
            .map((value) => new mongoose_2.Types.ObjectId(value));
        const query = {
            $or: [
                { staffId: { $in: Array.from(candidateIds) } },
                { email: { $in: Array.from(candidateIds) } },
                { userId: { $in: Array.from(candidateIds) } },
                { orbitID: { $in: Array.from(candidateIds) } },
                ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
            ],
        };
        const normalizedEntity = this.normalizeObjectId(entity);
        if (normalizedEntity) {
            query.entity = normalizedEntity;
        }
        const selectFields = [
            'staffId',
            'firstName',
            'middleName',
            'lastName',
            'email',
            'userId',
            'orbitID',
            ...(options?.includeAccounts ? ['addosserAccount', 'atlasAccount', 'aftaAccount'] : []),
        ]
            .filter(Boolean)
            .join(' ');
        const staff = await this.staffModel.find(query).select(selectFields).lean();
        const data = (staff ?? []).map((member) => {
            const firstName = typeof member?.firstName === 'string' ? member.firstName.trim() : '';
            const middleName = typeof member?.middleName === 'string' ? member.middleName.trim() : '';
            const lastName = typeof member?.lastName === 'string' ? member.lastName.trim() : '';
            const name = [firstName, middleName, lastName].filter(Boolean).join(' ').trim();
            const orbitID = typeof member?.orbitID === 'string' ? member.orbitID.trim() : '';
            const addosserAccount = typeof member?.addosserAccount === 'string' ? member.addosserAccount.trim() : '';
            const atlasAccount = typeof member?.atlasAccount === 'string' ? member.atlasAccount.trim() : '';
            const aftaAccount = typeof member?.aftaAccount === 'string' ? member.aftaAccount.trim() : '';
            return {
                staffId: String(member?.staffId ?? '').trim(),
                userId: String(member?.userId ?? '').trim(),
                email: String(member?.email ?? '').trim(),
                name: name || String(member?.staffId ?? '').trim(),
                staffObjectId: member?._id ? String(member._id) : undefined,
                orbitID: orbitID || undefined,
                ...(options?.includeAccounts
                    ? {
                        addosserAccount: addosserAccount || undefined,
                        atlasAccount: atlasAccount || undefined,
                        aftaAccount: aftaAccount || undefined,
                    }
                    : {}),
            };
        });
        const foundKeys = new Set();
        (staff ?? []).forEach((member) => {
            if (member?.staffId) {
                const key = String(member.staffId).trim().toLowerCase();
                if (key)
                    foundKeys.add(key);
            }
            if (member?._id) {
                const key = String(member._id).trim().toLowerCase();
                if (key)
                    foundKeys.add(key);
            }
            if (member?.email) {
                const key = String(member.email).trim().toLowerCase();
                if (key)
                    foundKeys.add(key);
            }
            if (member?.userId) {
                const key = String(member.userId).trim().toLowerCase();
                if (key)
                    foundKeys.add(key);
            }
            if (member?.orbitID) {
                const key = String(member.orbitID).trim().toLowerCase();
                if (key)
                    foundKeys.add(key);
            }
        });
        const missing = unique.filter((value) => !foundKeys.has(value.trim().toLowerCase()));
        return { data, missing };
    }
    async getById(id) {
        try {
            const rawId = this.extractObjectIdCandidate(id);
            const trimmed = rawId?.toString?.().trim?.() ?? '';
            const lowered = trimmed.toLowerCase();
            const isMeaningful = trimmed.length > 0 &&
                lowered !== 'undefined' &&
                lowered !== 'null' &&
                lowered !== 'all' &&
                lowered !== 'nan';
            const orConditions = [];
            if (isMeaningful) {
                if (mongoose_2.default.Types.ObjectId.isValid(trimmed)) {
                    orConditions.push({ _id: new mongoose_2.default.Types.ObjectId(trimmed) });
                }
                orConditions.push({ staffId: trimmed });
                orConditions.push({ email: trimmed });
                orConditions.push({ userId: trimmed });
            }
            if (!orConditions.length) {
                throw new Error('Invalid ID');
            }
            const staff = await this.staffModel
                .findOne({ $or: orConditions })
                .select(STAFF_SAFE_PROJECTION)
                .populate([
                ...STAFF_SUMMARY_POPULATE,
                ...STAFF_SUPERVISOR_POPULATE,
            ])
                .lean();
            return staff;
        }
        catch (e) {
            throw new Error("Invalid ID or query failed: " + e.message);
        }
    }
    async normalizeAndPopulateAdditionalRolesForRecord(record) {
        if (!record)
            return;
        const { assignments, mutated } = (0, additional_roles_util_1.normalizeAdditionalRoleAssignments)(record.additionalRoles);
        if (mutated && record._id) {
            await this.staffModel
                .updateOne({ _id: record._id }, {
                $set: {
                    additionalRoles: assignments.map(({ role, entity }) => ({ role, entity })),
                },
            })
                .exec();
        }
        record.additionalRoles = assignments;
        await this.staffModel.populate(record, {
            path: 'additionalRoles',
            options: { lean: true },
            populate: [
                {
                    path: 'role',
                    options: { lean: true },
                    skipInvalidIds: true,
                    populate: { path: 'permissions', options: { lean: true }, skipInvalidIds: true },
                },
                { path: 'entity', options: { lean: true }, skipInvalidIds: true },
            ],
        });
    }
    async deactivateExitedStaff() {
        const now = new Date();
        const result = await this.staffModel.updateMany({
            exitDate: {
                $gte: new Date("2020-01-01"),
                $lte: now
            },
            status: { $ne: 'Active' },
        }, {
            $set: { status: 'Inactive' },
        });
        return result;
    }
    async getStaffByLevel(payGrade, subsidiaryId) {
        try {
            const query = { level: payGrade, status: "Active" };
            const normalizedSubsidiary = this.normalizeObjectId(subsidiaryId);
            if (normalizedSubsidiary) {
                query.entity = normalizedSubsidiary;
            }
            else if (subsidiaryId) {
                return [];
            }
            return this.staffModel
                .find(query)
                .select(STAFF_LIST_PROJECTION)
                .lean();
        }
        catch (e) {
            throw new Error(e.message);
        }
    }
    async getStaffByBranch(branch) {
        try {
            return this.staffModel
                .find({ branch, status: "Active" })
                .select(STAFF_SAFE_PROJECTION)
                .lean();
        }
        catch (e) {
            throw new Error(e.message);
        }
    }
    async convertDate(input) {
        try {
            if (input === null || input === undefined || input === '') {
                return null;
            }
            if (input instanceof Date) {
                return isNaN(input.getTime()) ? null : input;
            }
            const asNumber = typeof input === 'number' ? input : Number(input);
            if (!Number.isNaN(asNumber) &&
                String(input).trim() !== '' &&
                asNumber > 59 &&
                asNumber < 2958465) {
                const excelEpoch = moment.utc('1899-12-30', 'YYYY-MM-DD');
                return excelEpoch.clone().add(asNumber, 'days').toDate();
            }
            if (typeof input === 'string') {
                const trimmed = input.trim();
                if (!trimmed) {
                    return null;
                }
                const supportedFormats = [
                    'DD-MMM-YY',
                    'DD-MMM-YYYY',
                    'D-MMM-YY',
                    'D-MMM-YYYY',
                    'DD/MM/YYYY',
                    'DD/MM/YY',
                    'D/M/YYYY',
                    'D/M/YY',
                    'DD-MM-YYYY',
                    'DD-MM-YY',
                    'D-M-YYYY',
                    'D-M-YY',
                    'DD-MM-YYYY HH:mm:ss',
                    'YYYY-MM-DD',
                    'YYYY/MM/DD',
                    'YYYY-MM-DD HH:mm:ss',
                    'YYYY/MM/DD HH:mm:ss',
                    'MM/DD/YYYY',
                    'MM/DD/YY',
                    'M/D/YYYY',
                    'M/D/YY',
                    'DD/MM/YYYY HH:mm:ss',
                    'MM/DD/YYYY HH:mm:ss',
                    'DD.MM.YYYY',
                    'D.MM.YYYY',
                    'MMM DD, YYYY',
                    'MMMM DD, YYYY',
                ];
                const parsed = moment(trimmed, supportedFormats, true);
                if (parsed.isValid()) {
                    return parsed.toDate();
                }
                const isoDate = new Date(trimmed);
                if (!isNaN(isoDate.getTime())) {
                    return isoDate;
                }
            }
            return null;
        }
        catch (error) {
            console.error('Failed to convert date:', input, error?.message || error);
            return null;
        }
    }
    formatDateValue(input) {
        if (!input)
            return '';
        if (typeof input === 'string')
            return input;
        if (input instanceof Date && !isNaN(input.getTime())) {
            return input.toISOString().split('T')[0];
        }
        const parsed = new Date(input);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0];
        }
        return '';
    }
    async getBirthdaysToday() {
        const today = moment().tz('Africa/Lagos').format('MM-DD');
        return this.staffModel.aggregate([
            {
                $match: {
                    status: { $regex: '^active$', $options: 'i' },
                    dateOfBirth: {
                        $exists: true,
                        $type: 'date',
                        $lte: this.DATE_UPPER_BOUND,
                    },
                },
            },
            {
                $addFields: {
                    lagosBirthday: {
                        $dateToString: {
                            date: '$dateOfBirth',
                            format: '%m-%d',
                            timezone: 'Africa/Lagos'
                        }
                    }
                }
            },
            { $match: { lagosBirthday: today } },
            ...this.LOOKUPS,
            { $project: this.PROJECT_FIELDS('dateOfBirth') }
        ]);
    }
    async getBirthdaysThisMonth() {
        const currentMonth = moment().tz('Africa/Lagos').format('MM');
        return this.staffModel.aggregate([
            {
                $match: {
                    status: { $regex: '^active$', $options: 'i' },
                    dateOfBirth: {
                        $exists: true,
                        $type: 'date',
                        $lte: this.DATE_UPPER_BOUND,
                    },
                },
            },
            {
                $addFields: {
                    lagosBirthMonth: {
                        $dateToString: {
                            date: '$dateOfBirth',
                            format: '%m',
                            timezone: 'Africa/Lagos'
                        }
                    }
                }
            },
            { $match: { lagosBirthMonth: currentMonth } },
            ...this.LOOKUPS,
            { $project: this.PROJECT_FIELDS('dateOfBirth') }
        ]);
    }
    async getWorkAnniversaryToday() {
        const today = moment().tz('Africa/Lagos').format('MM-DD');
        return this.staffModel.aggregate([
            {
                $match: {
                    startDate: {
                        $exists: true,
                        $type: 'date',
                        $lte: this.DATE_UPPER_BOUND,
                    },
                },
            },
            {
                $addFields: {
                    lagosStartDay: {
                        $dateToString: {
                            date: '$startDate',
                            format: '%m-%d',
                            timezone: 'Africa/Lagos'
                        }
                    }
                }
            },
            { $match: { lagosStartDay: today } },
            ...this.LOOKUPS,
            { $project: this.PROJECT_FIELDS('startDate') }
        ]);
    }
    async getWorkAnniversaryThisMonth() {
        const currentMonth = moment().tz('Africa/Lagos').format('MM');
        return this.staffModel.aggregate([
            {
                $match: {
                    startDate: {
                        $exists: true,
                        $type: 'date',
                        $lte: this.DATE_UPPER_BOUND,
                    },
                },
            },
            {
                $addFields: {
                    lagosStartMonth: {
                        $dateToString: {
                            date: '$startDate',
                            format: '%m',
                            timezone: 'Africa/Lagos'
                        }
                    }
                }
            },
            { $match: { lagosStartMonth: currentMonth } },
            ...this.LOOKUPS,
            { $project: this.PROJECT_FIELDS('startDate') }
        ]);
    }
    getPortalBaseUrl() {
        const candidates = [
            process.env.HR_PORTAL_WEB_URL,
            process.env.HR_PORTAL_BASE_URL,
            process.env.FRONTEND_BASE_URL,
            process.env.FRONTEND_URL,
        ];
        const fallback = 'https://hrms.addosser.com';
        const base = candidates.find((value) => typeof value === 'string' && value.trim().length > 0) ?? fallback;
        return base.replace(/\/+$/, '');
    }
    generateRandomPassword(length = 12) {
        const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
        const bytes = crypto.randomBytes(length);
        let password = '';
        for (let i = 0; i < length; i++) {
            password += charset[bytes[i] % charset.length];
        }
        return password;
    }
    async handleBirthdayTodayCron() {
        const birthdays = await this.getBirthdaysToday();
        for (const staff of birthdays) {
            const formattedDob = this.formatDateValue(staff?.dateOfBirth);
            if (!formattedDob) {
                continue;
            }
            await this.notificationService.sendMail({
                to: staff.email,
                templateType: 'birthday-message',
                templateVariables: {
                    firstName: staff.firstName,
                    lastName: staff.lastName,
                    dateOfBirth: formattedDob,
                    logo: 'https://intranet.addosser.com/img/logo.png',
                },
            });
        }
    }
    async handleWorkAnniversaryCron() {
        const anniversaries = await this.getWorkAnniversaryToday();
        for (const staff of anniversaries) {
            const formattedStart = this.formatDateValue(staff?.startDate);
            if (!formattedStart) {
                continue;
            }
            await this.notificationService.sendMail({
                to: staff.email,
                templateType: 'anniversary-message',
                templateVariables: {
                    firstName: staff.firstName,
                    lastName: staff.lastName,
                    startDate: formattedStart,
                    logo: 'https://intranet.addosser.com/img/logo.png',
                },
            });
        }
    }
};
exports.StaffService = StaffService;
__decorate([
    (0, schedule_1.Cron)('30 0 * * *', {
        timeZone: 'Africa/Lagos',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StaffService.prototype, "handleBirthdayTodayCron", null);
__decorate([
    (0, schedule_1.Cron)('0 8 * * *', {
        timeZone: 'Africa/Lagos',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StaffService.prototype, "handleWorkAnniversaryCron", null);
exports.StaffService = StaffService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('User')),
    __param(1, (0, mongoose_1.InjectModel)(role_schema_1.Role.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        subsidiary_service_1.SubsidiaryService,
        level_service_1.LevelService,
        branch_service_1.BranchService,
        department_service_1.DepartmentService,
        businessUnit_service_1.BusinessUnitService,
        mail_service_1.MailService,
        notice_service_1.NoticeService])
], StaffService);
//# sourceMappingURL=user.service.js.map