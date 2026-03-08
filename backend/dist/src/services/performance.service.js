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
var PerformanceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const performance_review_schema_1 = require("../schemas/performance-review.schema");
const kpi_schema_1 = require("../schemas/kpi.schema");
const performance_kpi_result_schema_1 = require("../schemas/performance-kpi-result.schema");
const user_schema_1 = require("../schemas/user.schema");
const performance_workflow_schema_1 = require("../schemas/performance-workflow.schema");
const performance_core_value_schema_1 = require("../schemas/performance-core-value.schema");
const performance_appraisal_cycle_schema_1 = require("../schemas/performance-appraisal-cycle.schema");
const moment = require("moment-timezone");
const notice_service_1 = require("./notice.service");
const mail_service_1 = require("./mail.service");
let PerformanceService = PerformanceService_1 = class PerformanceService {
    constructor(reviewModel, kpiModel, kpiResultModel, userModel, workflowModel, coreValueModel, appraisalCycleModel, noticeService, mailService) {
        this.reviewModel = reviewModel;
        this.kpiModel = kpiModel;
        this.kpiResultModel = kpiResultModel;
        this.userModel = userModel;
        this.workflowModel = workflowModel;
        this.coreValueModel = coreValueModel;
        this.appraisalCycleModel = appraisalCycleModel;
        this.noticeService = noticeService;
        this.mailService = mailService;
    }
    normalizeRating(value) {
        if (value === null || value === undefined || value === '')
            return null;
        const numeric = typeof value === 'number' ? value : Number(value);
        if (!Number.isFinite(numeric))
            return null;
        return Math.min(5, Math.max(0, numeric));
    }
    normalizeCoreValueRatings(input) {
        if (!Array.isArray(input))
            return [];
        return input
            .map((entry) => {
            if (!entry)
                return null;
            const idCandidate = entry.coreValueId ?? entry.id ?? entry._id;
            const normalizedId = idCandidate && mongoose_2.Types.ObjectId.isValid(String(idCandidate))
                ? new mongoose_2.Types.ObjectId(String(idCandidate))
                : undefined;
            const rating = this.normalizeRating(entry.rating);
            if (rating === null)
                return null;
            const weight = entry.weight !== undefined && entry.weight !== null && entry.weight !== ''
                ? Number(entry.weight)
                : undefined;
            return {
                coreValueId: normalizedId,
                title: entry.title ? String(entry.title).trim() : undefined,
                description: entry.description ? String(entry.description).trim() : undefined,
                weight: Number.isFinite(weight) ? weight : undefined,
                rating,
            };
        })
            .filter(Boolean);
    }
    extractRoleNames(roleLike) {
        const names = [];
        const register = (value) => {
            if (typeof value === 'string' && value.trim()) {
                names.push(value.trim().toLowerCase());
            }
        };
        if (!roleLike)
            return names;
        if (typeof roleLike === 'string') {
            register(roleLike);
            return names;
        }
        register(roleLike?.name);
        register(roleLike?.label);
        if (roleLike?.role) {
            register(roleLike?.role?.name);
            register(roleLike?.role?.label);
        }
        return names;
    }
    extractPermissionNames(user) {
        const names = new Set();
        const register = (source) => {
            if (!source)
                return;
            const values = Array.isArray(source) ? source : [source];
            values.forEach((permission) => {
                if (!permission)
                    return;
                if (typeof permission === 'string') {
                    names.add(permission.trim().toLowerCase());
                }
                else if (typeof permission?.name === 'string') {
                    names.add(permission.name.trim().toLowerCase());
                }
            });
        };
        register(user?.permissions);
        register(user?.role?.permissions);
        if (Array.isArray(user?.roles)) {
            user.roles.forEach((role) => {
                register(role?.permissions);
                register(role?.role?.permissions);
            });
        }
        const additional = Array.isArray(user?.additionalRoles)
            ? user.additionalRoles
            : user?.additionalRoles
                ? [user.additionalRoles]
                : [];
        additional.forEach((assignment) => {
            const roleNode = assignment?.role ?? assignment;
            register(roleNode?.permissions);
        });
        return names;
    }
    userHasPermission(user, required) {
        const permissions = this.extractPermissionNames(user);
        if (permissions.has('all'))
            return true;
        const list = Array.isArray(required) ? required : [required];
        return list.some((perm) => permissions.has(perm.toLowerCase()));
    }
    normalizeRoleNameTokens(roleName) {
        const base = String(roleName).trim().toLowerCase();
        if (!base)
            return [];
        const condensed = base.replace(/[\s_-]+/g, '');
        const hyphenated = base.replace(/[\s_]+/g, '-');
        return Array.from(new Set([base, condensed, hyphenated]));
    }
    userHasWorkflowRole(user) {
        const additional = Array.isArray(user?.additionalRoles)
            ? user.additionalRoles.map((assignment) => assignment?.role ?? assignment)
            : [];
        const sources = [
            user?.role,
            ...(Array.isArray(user?.roles) ? user.roles : []),
            ...additional,
        ];
        return sources.some((roleLike) => this.extractRoleNames(roleLike).some((name) => this.normalizeRoleNameTokens(name).some((token) => PerformanceService_1.PERFORMANCE_WORKFLOW_ROLE_NAMES.has(token))));
    }
    canManagePerformanceWorkflow(user) {
        return (this.userHasSuperAdminRole(user) ||
            this.userHasAdminRole(user) ||
            this.userHasPermission(user, ['performance management']) ||
            this.userHasWorkflowRole(user));
    }
    userHasSuperAdminRole(user) {
        const permissions = this.extractPermissionNames(user);
        if (permissions.has('all'))
            return true;
        for (const name of permissions) {
            if (PerformanceService_1.SUPER_ADMIN_ROLE_NAMES.has(name)) {
                return true;
            }
        }
        const additional = Array.isArray(user?.additionalRoles)
            ? user.additionalRoles.map((assignment) => assignment?.role ?? assignment)
            : [];
        const sources = [
            user?.role,
            ...(Array.isArray(user?.roles) ? user.roles : []),
            ...additional,
        ];
        return sources.some((roleLike) => this.extractRoleNames(roleLike).some((name) => PerformanceService_1.SUPER_ADMIN_ROLE_NAMES.has(name)));
    }
    userHasAdminRole(user) {
        const permissions = this.extractPermissionNames(user);
        if (permissions.has('all'))
            return true;
        for (const name of permissions) {
            if (PerformanceService_1.ADMIN_ROLE_NAMES.has(name)) {
                return true;
            }
        }
        const additional = Array.isArray(user?.additionalRoles)
            ? user.additionalRoles.map((assignment) => assignment?.role ?? assignment)
            : [];
        const sources = [
            user?.role,
            ...(Array.isArray(user?.roles) ? user.roles : []),
            ...additional,
        ];
        return sources.some((roleLike) => this.extractRoleNames(roleLike).some((name) => this.normalizeRoleNameTokens(name).some((token) => PerformanceService_1.ADMIN_ROLE_NAMES.has(token))));
    }
    assertCanManageWorkflow(user) {
        if (!this.canManagePerformanceWorkflow(user)) {
            throw new common_1.ForbiddenException('You do not have permission to manage performance workflow.');
        }
    }
    isPrivilegedUser(user) {
        return this.canManagePerformanceWorkflow(user);
    }
    normalizeMatchKey(value) {
        if (value === null || value === undefined)
            return undefined;
        const trimmed = String(value).trim();
        return trimmed ? trimmed.toLowerCase() : undefined;
    }
    collectUserIdentifiers(user) {
        const candidates = [
            user?._id,
            user?.id,
            user?.userId,
            user?.staffId,
            user?.employeeId,
            user?.email,
        ];
        const ids = new Set();
        candidates.forEach((candidate) => {
            const key = this.normalizeMatchKey(candidate);
            if (key) {
                ids.add(key);
            }
        });
        return ids;
    }
    buildSupervisorScopeFilter(scope, subordinateEmployeeIds) {
        const normalized = this.normalizeIdentifier(scope);
        if (!normalized)
            return null;
        const objectId = this.normalizeUserId(normalized);
        const scopeValue = objectId ?? normalized;
        const conditions = [
            { reviewerId: scopeValue },
            {
                reviewer2Id: scopeValue,
                reviewStage: { $in: ['supervisor2', 'hr', 'completed'] },
            },
        ];
        if (objectId) {
            conditions.push({
                hrReviewerIds: objectId,
                reviewStage: { $in: ['hr', 'completed'] },
            });
        }
        if (subordinateEmployeeIds?.length) {
            conditions.push({ employeeId: { $in: subordinateEmployeeIds } });
        }
        return conditions.length ? { $or: conditions } : null;
    }
    async getSubordinateChainIds(supervisorId, maxDepth = 5) {
        const objectId = this.normalizeUserId(supervisorId);
        if (!objectId)
            return [];
        const allSubordinateIds = new Set();
        let currentLevelIds = [objectId];
        for (let depth = 0; depth < maxDepth; depth++) {
            if (!currentLevelIds.length)
                break;
            const subordinates = await this.userModel
                .find({
                $or: [
                    { supervisorId: { $in: currentLevelIds } },
                    { supervisor2Id: { $in: currentLevelIds } },
                ],
            })
                .select('_id staffId')
                .lean()
                .exec();
            if (!subordinates.length)
                break;
            const nextLevelIds = [];
            for (const sub of subordinates) {
                const id = String(sub._id);
                if (!allSubordinateIds.has(id)) {
                    allSubordinateIds.add(id);
                    if (sub.staffId)
                        allSubordinateIds.add(String(sub.staffId));
                    nextLevelIds.push(sub._id);
                }
            }
            currentLevelIds = nextLevelIds;
        }
        return Array.from(allSubordinateIds);
    }
    buildUserAccessFilter(user) {
        const identifiers = this.collectUserIdentifiers(user);
        const actorId = this.normalizeUserId(user?._id ?? user?.id ?? user?.userId ?? user?.staffId) ??
            this.normalizeIdentifier(user?._id ?? user?.id ?? user?.userId ?? user?.staffId);
        const conditions = [];
        if (identifiers.size) {
            conditions.push({ employeeId: { $in: Array.from(identifiers) } });
        }
        if (actorId) {
            conditions.push({ reviewerId: actorId });
            conditions.push({
                reviewer2Id: actorId,
                reviewStage: { $in: ['supervisor2', 'hr', 'completed'] },
            });
            conditions.push({
                hrReviewerIds: actorId,
                reviewStage: { $in: ['hr', 'completed'] },
            });
        }
        return conditions.length ? { $or: conditions } : null;
    }
    normalizeEntityIdStrict(value) {
        const candidate = value?._id ??
            value?.id ??
            value?.entityId ??
            value?.value ??
            (typeof value === 'string' || typeof value === 'number' ? value : undefined);
        if (!candidate) {
            throw new common_1.BadRequestException('Entity is required.');
        }
        const normalized = String(candidate).trim();
        if (!mongoose_2.Types.ObjectId.isValid(normalized)) {
            throw new common_1.BadRequestException('Entity is invalid.');
        }
        return new mongoose_2.Types.ObjectId(normalized).toHexString();
    }
    normalizeEntityId(value) {
        const candidate = value?._id ??
            value?.id ??
            value?.entityId ??
            value?.value ??
            (typeof value === 'string' || typeof value === 'number' ? value : undefined);
        if (!candidate) {
            return null;
        }
        const normalized = String(candidate).trim();
        if (!normalized || !mongoose_2.Types.ObjectId.isValid(normalized)) {
            return null;
        }
        return new mongoose_2.Types.ObjectId(normalized).toHexString();
    }
    normalizeUserId(value) {
        if (value == null)
            return null;
        const candidate = typeof value === 'object'
            ? value?._id ?? value?.id ?? value?.userId ?? value
            : value;
        const normalized = String(candidate ?? '').trim();
        if (!normalized || normalized.toLowerCase() === 'undefined' || normalized.toLowerCase() === 'null') {
            return null;
        }
        if (!mongoose_2.Types.ObjectId.isValid(normalized)) {
            return null;
        }
        return normalized;
    }
    normalizeUserIdList(values) {
        const list = Array.isArray(values) ? values : values ? [values] : [];
        const unique = new Set();
        list.forEach((value) => {
            const normalized = this.normalizeUserId(value);
            if (normalized) {
                unique.add(normalized);
            }
        });
        return Array.from(unique);
    }
    normalizeIdentifier(value) {
        if (value === null || value === undefined)
            return undefined;
        const trimmed = String(value).trim();
        if (!trimmed)
            return undefined;
        const lower = trimmed.toLowerCase();
        if (lower === 'undefined' || lower === 'null')
            return undefined;
        return trimmed;
    }
    normalizeEmail(value) {
        if (typeof value !== 'string')
            return null;
        const trimmed = value.trim();
        return trimmed ? trimmed : null;
    }
    getPortalBaseUrl() {
        const candidates = [
            process.env.FRONTEND_BASE_URL,
            process.env.FRONTEND_URL,
        ];
        const fallback = 'https://hrms.addosser.com';
        const base = candidates.find((value) => typeof value === 'string' && value.trim().length > 0) ?? fallback;
        return base.replace(/\/+$/, '');
    }
    buildPortalUrl(path) {
        const base = this.getPortalBaseUrl();
        if (!path)
            return base;
        if (/^https?:\/\//i.test(path)) {
            return path;
        }
        return `${base}${path.startsWith('/') ? path : `/${path}`}`;
    }
    async collectNotificationEmails(userIds) {
        const recipients = new Set();
        const uniqueIds = Array.from(new Set((userIds ?? []).map((value) => String(value)).filter(Boolean)));
        const objectIds = uniqueIds
            .map((id) => (mongoose_2.Types.ObjectId.isValid(id) ? new mongoose_2.Types.ObjectId(id) : null))
            .filter(Boolean);
        if (!objectIds.length)
            return [];
        const users = await this.userModel
            .find({ _id: { $in: objectIds } })
            .select('email')
            .lean()
            .exec();
        users.forEach((user) => {
            const email = this.normalizeEmail(user?.email);
            if (email)
                recipients.add(email);
        });
        return Array.from(recipients);
    }
    async notifyUsers(options) {
        const normalizedIds = this.normalizeUserIdList(options.userIds);
        if (!normalizedIds.length)
            return;
        await Promise.all(normalizedIds.map((userId) => this.noticeService.createNotice({
            userId,
            message: options.message,
            link: options.link,
            type: options.type,
        })));
        if (!this.mailService)
            return;
        const recipients = await this.collectNotificationEmails(normalizedIds);
        if (!recipients.length)
            return;
        const subject = options.emailSubject ?? 'Performance appraisal notification';
        const link = options.link ? this.buildPortalUrl(options.link) : undefined;
        const text = options.emailText ??
            `${options.message}${link ? `\n\nView: ${link}` : ''}`;
        const results = await Promise.allSettled(recipients.map((to) => this.mailService.sendMail({
            to,
            subject,
            text,
        })));
        results.forEach((result) => {
            if (result.status === 'rejected') {
                console.error('Failed to send performance email', result.reason);
            }
        });
    }
    resolveInitialReviewStage(input) {
        if (input.reviewerId)
            return 'supervisor';
        if (input.reviewer2Id)
            return 'supervisor2';
        if (input.hrReviewerIds?.length)
            return 'hr';
        return 'completed';
    }
    async resolveEmployeeUserId(employeeId) {
        const direct = this.normalizeUserId(employeeId);
        if (direct)
            return direct;
        const profile = await this.resolveEmployeeProfile(employeeId);
        return this.normalizeUserId(profile?._id ?? profile?.id);
    }
    normalizeRaters(values) {
        const list = Array.isArray(values) ? values : values ? [values] : [];
        const allowed = new Set(['employee', 'line-manager', 'peer', 'subordinate']);
        const unique = new Set();
        list.forEach((value) => {
            if (!value)
                return;
            const normalized = String(value).trim().toLowerCase();
            if (!normalized)
                return;
            if (allowed.has(normalized)) {
                unique.add(normalized);
            }
        });
        return Array.from(unique);
    }
    normalizeWeight(value) {
        if (value === null || value === undefined || value === '')
            return 0;
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
            throw new common_1.BadRequestException('Weight must be a number between 0 and 100.');
        }
        if (parsed < 0 || parsed > 100) {
            throw new common_1.BadRequestException('Weight must be between 0 and 100.');
        }
        return parsed;
    }
    normalizeCycleStatus(value) {
        const normalized = String(value ?? '').trim();
        if (!normalized)
            return 'Draft';
        const lower = normalized.toLowerCase();
        if (lower === 'active')
            return 'Active';
        if (lower === 'closed')
            return 'Closed';
        return 'Draft';
    }
    normalizeStringList(value) {
        const list = Array.isArray(value) ? value : value ? [value] : [];
        const unique = new Set();
        list.forEach((item) => {
            const trimmed = String(item ?? '').trim();
            if (trimmed) {
                unique.add(trimmed);
            }
        });
        return Array.from(unique);
    }
    normalizeRatingTags(value) {
        if (!Array.isArray(value))
            return [];
        return value
            .map((tag) => {
            if (!tag || typeof tag !== 'object')
                return null;
            const normalized = {
                lower: tag?.lower ?? '',
                upper: tag?.upper ?? '',
                tag: tag?.tag ?? '',
                avatar: tag?.avatar ?? '',
            };
            return normalized;
        })
            .filter(Boolean);
    }
    parseCycleDate(value, label) {
        if (!value) {
            throw new common_1.BadRequestException(`${label} date is required.`);
        }
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return value;
        }
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) {
                throw new common_1.BadRequestException(`${label} date is required.`);
            }
            const parsed = moment(trimmed, ['DD-MM-YYYY', 'YYYY-MM-DD', moment.ISO_8601], true);
            if (parsed.isValid()) {
                return parsed.toDate();
            }
            const fallback = new Date(trimmed);
            if (!Number.isNaN(fallback.getTime())) {
                return fallback;
            }
        }
        throw new common_1.BadRequestException(`${label} date is invalid.`);
    }
    assertReviewWindowWithinCycle(reviewStartDate, reviewEndDate, cycleStartDate, cycleEndDate) {
        if (reviewEndDate < reviewStartDate) {
            throw new common_1.BadRequestException('Review end date cannot be earlier than review start date.');
        }
        if (reviewStartDate < cycleStartDate) {
            throw new common_1.BadRequestException('Review start date cannot be earlier than appraisal start date.');
        }
    }
    serializeAppraisalCycle(record) {
        if (!record)
            return record;
        const raw = typeof record?.toJSON === 'function' ? record.toJSON() : record;
        const id = String(raw?._id ?? '');
        return {
            id,
            _id: id,
            entity: raw?.entity ? String(raw.entity) : undefined,
            title: raw?.title ?? '',
            description: raw?.description ?? '',
            year: raw?.year ?? '',
            startDate: raw?.startDate,
            endDate: raw?.endDate,
            reviewStartDate: raw?.reviewStartDate,
            reviewEndDate: raw?.reviewEndDate,
            status: raw?.status ?? 'Draft',
            types: Array.isArray(raw?.types) ? raw.types : [],
            scoreType: raw?.scoreType,
            scoreTypeLabel: raw?.scoreTypeLabel,
            ratingTagsEnabled: raw?.ratingTagsEnabled ?? false,
            arcEnabled: raw?.arcEnabled ?? false,
            ratingTags: Array.isArray(raw?.ratingTags) ? raw.ratingTags : [],
            formSnapshot: raw?.formSnapshot ?? raw?.form_snapshot,
            createdBy: raw?.createdBy ? String(raw.createdBy) : undefined,
            createdAt: raw?.createdAt,
            updatedAt: raw?.updatedAt,
        };
    }
    validateReviewPeriod(value) {
        const raw = (value ?? '').trim();
        if (!raw) {
            throw new common_1.BadRequestException('Review period is required');
        }
        const normalized = raw.toLowerCase();
        if (PerformanceService_1.REVIEW_PERIOD_LABELS.has(normalized)) {
            return;
        }
        const patterns = [
            /^\d{4}-(0[1-9]|1[0-2])$/,
            /^\d{4}\s*Q[1-4]$/i,
            /^\d{4}\s*H[1-2]$/i,
            /^\d{4}\s*HY[1-2]$/i,
            /^FY\s?\d{4}$/i,
        ];
        if (patterns.some((pattern) => pattern.test(raw))) {
            return;
        }
        throw new common_1.BadRequestException('Review period must be Monthly, Quarterly, Bi-Annual, Annual, or a period like YYYY-MM, YYYY Q1, YYYY H1, or FY2026.');
    }
    buildFilters(query) {
        const filters = {};
        const orConditions = [];
        const collectIds = (value) => {
            const ids = new Set();
            const normalized = (value ?? '').trim();
            if (!normalized)
                return ids;
            normalized.split(',').forEach((segment) => {
                const trimmed = segment.trim();
                if (!trimmed)
                    return;
                ids.add(trimmed);
                ids.add(trimmed.toLowerCase());
            });
            return ids;
        };
        if (query.entity) {
            filters.entity = query.entity;
        }
        if (query.appraisalCycleId) {
            filters.appraisalCycleId = new mongoose_2.Types.ObjectId(query.appraisalCycleId);
        }
        if (query.status) {
            filters.status = query.status;
        }
        if (query.department) {
            filters.department = query.department;
        }
        if (query.reviewer) {
            orConditions.push({ reviewerName: new RegExp(query.reviewer, 'i') }, { reviewerId: query.reviewer });
        }
        if (query.employeeId) {
            const ids = Array.from(collectIds(query.employeeId));
            if (ids.length) {
                orConditions.push({ employeeId: { $in: ids } }, { staffId: { $in: ids } }, { userId: { $in: ids } });
            }
        }
        if (query.search) {
            const regex = new RegExp(query.search, 'i');
            orConditions.push({ employeeName: regex }, { department: regex }, { position: regex }, { reviewType: regex }, { reviewPeriod: regex }, { status: regex }, { reviewerName: regex });
        }
        if (orConditions.length) {
            filters.$or = orConditions;
        }
        return filters;
    }
    async assertCanAccessReview(user, review) {
        if (this.isPrivilegedUser(user))
            return;
        const identifiers = this.collectUserIdentifiers(user);
        const employeeKey = this.normalizeMatchKey(review?.employeeId);
        if (employeeKey && identifiers.has(employeeKey)) {
            return;
        }
        const actorId = this.normalizeUserId(user?._id ?? user?.id ?? user?.userId ?? user?.staffId) ??
            this.normalizeIdentifier(user?._id ?? user?.id ?? user?.userId ?? user?.staffId);
        if (!actorId) {
            throw new common_1.ForbiddenException('You do not have permission to access this performance review.');
        }
        const reviewerId = this.normalizeIdentifier(review?.reviewerId);
        const reviewer2Id = this.normalizeIdentifier(review?.reviewer2Id);
        const hrReviewerIds = this.normalizeUserIdList(review?.hrReviewerIds);
        const stage = review?.reviewStage ??
            this.resolveInitialReviewStage({
                reviewerId: reviewerId,
                reviewer2Id: reviewer2Id,
                hrReviewerIds,
            });
        if (reviewerId && reviewerId === actorId) {
            return;
        }
        if (reviewer2Id &&
            reviewer2Id === actorId &&
            ['supervisor2', 'hr', 'completed'].includes(String(stage))) {
            return;
        }
        if (hrReviewerIds.includes(actorId) &&
            ['hr', 'completed'].includes(String(stage))) {
            return;
        }
        const subordinateIds = await this.getSubordinateChainIds(actorId);
        if (subordinateIds.length && employeeKey) {
            const employeeIdNorm = employeeKey.toLowerCase();
            const isSubordinate = subordinateIds.some((id) => id.toLowerCase() === employeeIdNorm);
            if (isSubordinate)
                return;
        }
        throw new common_1.ForbiddenException('You do not have permission to access this performance review.');
    }
    normalizeKey(value) {
        if (value === null || value === undefined)
            return undefined;
        const trimmed = String(value).trim();
        return trimmed ? trimmed.toLowerCase() : undefined;
    }
    matchesDimension(kpiId, kpiName, employeeId, employeeName) {
        const kpiIdKey = this.normalizeKey(kpiId);
        const kpiNameKey = this.normalizeKey(kpiName);
        if (!kpiIdKey && !kpiNameKey) {
            return true;
        }
        const employeeIdKey = this.normalizeKey(employeeId);
        const employeeNameKey = this.normalizeKey(employeeName);
        return Boolean((kpiIdKey && employeeIdKey && kpiIdKey === employeeIdKey) ||
            (kpiNameKey && employeeNameKey && kpiNameKey === employeeNameKey));
    }
    isKpiActive(kpi, reviewStartDate, reviewEndDate) {
        const windowStart = reviewStartDate;
        const windowEnd = reviewEndDate ?? reviewStartDate;
        const start = kpi?.startDate ? new Date(kpi.startDate) : undefined;
        const end = kpi?.endDate ? new Date(kpi.endDate) : undefined;
        if (start && !Number.isNaN(start.getTime()) && start > windowEnd)
            return false;
        if (end && !Number.isNaN(end.getTime()) && end < windowStart)
            return false;
        return true;
    }
    async resolveEmployeeProfile(employeeId) {
        const query = [];
        if (employeeId) {
            query.push({ staffId: employeeId });
            if (mongoose_2.Types.ObjectId.isValid(employeeId)) {
                query.push({ _id: new mongoose_2.Types.ObjectId(employeeId) });
            }
        }
        if (!query.length)
            return null;
        return this.userModel
            .findOne({ $or: query })
            .populate('role')
            .populate('level')
            .populate('department')
            .populate('businessUnit')
            .populate('branch')
            .lean()
            .exec();
    }
    async resolveReviewerName(reviewerId) {
        const trimmed = (reviewerId ?? '').trim();
        if (!trimmed)
            return undefined;
        const profile = await this.resolveEmployeeProfile(trimmed);
        return this.formatEmployeeName(profile, undefined, trimmed);
    }
    resolveRefValue(value, nameKeys) {
        if (!value)
            return {};
        if (typeof value === 'string' || typeof value === 'number') {
            return { id: String(value) };
        }
        if (typeof value === 'object') {
            const id = value?._id ?? value?.id ?? value?.value ?? value?.code ?? value?.key;
            const name = nameKeys
                .map((key) => value?.[key])
                .find((candidate) => Boolean(candidate));
            return {
                id: id ? String(id) : undefined,
                name: name ? String(name) : undefined,
            };
        }
        return {};
    }
    formatEmployeeName(profile, fallbackName, fallbackId) {
        const trimmedFallback = (fallbackName ?? '').trim();
        if (trimmedFallback)
            return trimmedFallback;
        const name = (profile?.fullName ??
            [profile?.firstName, profile?.lastName].filter(Boolean).join(' '))?.trim?.() ?? '';
        if (name)
            return name;
        return (profile?.email ??
            profile?.staffId ??
            fallbackId ??
            'Unknown employee');
    }
    buildRegex(value) {
        if (!value)
            return undefined;
        const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`^${escaped}$`, 'i');
    }
    async resolveInitialKpis(input) {
        const employeeId = input.employeeId?.trim();
        const employeeName = input.employeeName?.trim();
        if (!employeeId) {
            return { kpiIds: [], kpiSnapshot: [] };
        }
        const profile = await this.resolveEmployeeProfile(employeeId);
        const employeeIdCandidates = new Set();
        const normalizedEmployeeIds = new Set();
        const addEmployeeId = (value) => {
            if (value === null || value === undefined)
                return;
            const raw = String(value).trim();
            if (!raw)
                return;
            employeeIdCandidates.add(raw);
            employeeIdCandidates.add(raw.toLowerCase());
            const normalized = this.normalizeKey(raw);
            if (normalized) {
                normalizedEmployeeIds.add(normalized);
            }
        };
        addEmployeeId(employeeId);
        addEmployeeId(profile?.staffId);
        addEmployeeId(profile?._id);
        addEmployeeId(profile?.id);
        const role = this.resolveRefValue(profile?.role, ['name', 'title', 'roleName']);
        const level = this.resolveRefValue(profile?.level, ['name', 'title', 'levelName']);
        const department = this.resolveRefValue(profile?.department, ['name', 'title', 'departmentName']);
        const businessUnit = this.resolveRefValue(profile?.businessUnit, ['name', 'title', 'businessUnitName']);
        const branch = this.resolveRefValue(profile?.branch, ['name', 'title', 'branchName']);
        const orConditions = [];
        if (employeeIdCandidates.size) {
            orConditions.push({ employeeId: { $in: Array.from(employeeIdCandidates) } });
        }
        if (employeeName) {
            orConditions.push({ employeeName: this.buildRegex(employeeName) });
        }
        const addDimension = (value, idKey = '', nameKey = '') => {
            if (value?.id) {
                orConditions.push({ [idKey]: value.id });
            }
            if (value?.name) {
                orConditions.push({ [nameKey]: this.buildRegex(value.name) });
            }
        };
        addDimension(role, 'roleId', 'roleName');
        addDimension(level, 'levelId', 'levelName');
        addDimension(department, 'departmentId', 'departmentName');
        addDimension(businessUnit, 'businessUnitId', 'businessUnitName');
        addDimension(branch, 'branchId', 'branchName');
        const query = orConditions.length ? { $or: orConditions } : {};
        const candidates = await this.kpiModel.find(query).lean().exec();
        const windowStart = input?.reviewStartDate && !Number.isNaN(input.reviewStartDate.getTime())
            ? input.reviewStartDate
            : input.reviewDate;
        const windowEnd = input?.reviewEndDate && !Number.isNaN(input.reviewEndDate.getTime())
            ? input.reviewEndDate
            : windowStart;
        const applicable = candidates.filter((kpi) => {
            if (!this.isKpiActive(kpi, windowStart, windowEnd)) {
                return false;
            }
            if (kpi?.employeeId) {
                const normalized = this.normalizeKey(kpi.employeeId);
                return normalized ? normalizedEmployeeIds.has(normalized) : false;
            }
            if (!this.matchesDimension(kpi?.roleId, kpi?.roleName, role?.id, role?.name)) {
                return false;
            }
            if (!this.matchesDimension(kpi?.levelId, kpi?.levelName, level?.id, level?.name)) {
                return false;
            }
            if (!this.matchesDimension(kpi?.departmentId, kpi?.departmentName, department?.id, department?.name)) {
                return false;
            }
            if (!this.matchesDimension(kpi?.businessUnitId, kpi?.businessUnitName, businessUnit?.id, businessUnit?.name)) {
                return false;
            }
            if (!this.matchesDimension(kpi?.branchId, kpi?.branchName, branch?.id, branch?.name)) {
                return false;
            }
            return true;
        });
        const kpiIds = applicable.map((kpi) => kpi._id);
        const kpiSnapshot = applicable.map((kpi) => ({
            kpiId: kpi._id,
            title: kpi.title,
            description: kpi.description,
            targetValue: kpi.targetValue,
            measurementUnit: kpi.measurementUnit,
            weight: kpi.weight,
            type: kpi.type,
            kpa: kpi.kpa,
            categoryName: kpi.categoryName ?? (kpi.category ? String(kpi.category) : undefined),
            startDate: kpi.startDate ? new Date(kpi.startDate) : undefined,
            endDate: kpi.endDate ? new Date(kpi.endDate) : undefined,
        }));
        return { kpiIds, kpiSnapshot };
    }
    computeKpiWeightTotal(kpiSnapshot) {
        if (!Array.isArray(kpiSnapshot) || !kpiSnapshot.length)
            return 0;
        return kpiSnapshot.reduce((sum, item) => {
            const parsed = typeof item?.weight === 'number' ? item.weight : Number(item?.weight ?? NaN);
            if (!Number.isFinite(parsed) || parsed <= 0)
                return sum;
            return sum + parsed;
        }, 0);
    }
    allocateBehaviouralWeights(ratings, kpiSnapshot) {
        if (!Array.isArray(ratings) || !ratings.length)
            return [];
        const behaviouralBudget = Math.max(0, 100 - this.computeKpiWeightTotal(kpiSnapshot));
        const normalizedBudget = Number(behaviouralBudget.toFixed(2));
        const baseWeights = ratings.map((entry) => {
            const parsed = Number(entry?.weight ?? NaN);
            return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
        });
        const baseWeightTotal = baseWeights.reduce((sum, value) => sum + value, 0);
        if (baseWeightTotal <= 0) {
            return ratings.map((entry) => ({ ...entry, weight: 0 }));
        }
        let allocated = 0;
        return ratings.map((entry, index) => {
            const isLast = index === ratings.length - 1;
            const proportional = normalizedBudget <= 0
                ? 0
                : (normalizedBudget * baseWeights[index]) / baseWeightTotal;
            const nextWeight = isLast
                ? Math.max(0, Number((normalizedBudget - allocated).toFixed(2)))
                : Number(proportional.toFixed(2));
            allocated += nextWeight;
            return {
                ...entry,
                weight: nextWeight,
            };
        });
    }
    formatPeriodKey(value) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }
    resolvePeriodRange(review) {
        const startDate = review?.reviewStartDate ?? review?.reviewDate ?? review?.reviewEndDate;
        const endDate = review?.reviewEndDate ?? review?.reviewDate ?? review?.reviewStartDate;
        if (!startDate || !endDate)
            return null;
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return null;
        }
        const startKey = this.formatPeriodKey(start);
        const endKey = this.formatPeriodKey(end);
        if (startKey > endKey) {
            return { start: endKey, end: startKey };
        }
        return { start: startKey, end: endKey };
    }
    computeWeightedAverage(values) {
        const valid = values.filter((entry) => Number.isFinite(entry.value));
        if (!valid.length)
            return null;
        let totalWeight = 0;
        let weightedSum = 0;
        valid.forEach((entry) => {
            const weight = typeof entry.weight === 'number' && Number.isFinite(entry.weight) && entry.weight > 0
                ? entry.weight
                : 1;
            totalWeight += weight;
            weightedSum += entry.value * weight;
        });
        if (totalWeight <= 0)
            return null;
        return weightedSum / totalWeight;
    }
    computeCoreValueScore(ratings) {
        if (!Array.isArray(ratings) || !ratings.length)
            return null;
        const entries = ratings
            .map((entry) => {
            const rating = this.normalizeRating(entry?.rating ?? null);
            if (rating === null)
                return null;
            const weight = entry?.weight !== undefined && entry?.weight !== null && entry?.weight !== ''
                ? Number(entry.weight)
                : undefined;
            return { value: rating, weight };
        })
            .filter(Boolean);
        return this.computeWeightedAverage(entries);
    }
    async computeOkrScore(review) {
        const employeeId = (review?.employeeId ?? '').trim();
        if (!employeeId)
            return null;
        const kpiIds = Array.isArray(review?.kpiIds) ? review.kpiIds.filter(Boolean) : [];
        const baseQuery = {
            employeeId,
        };
        if (kpiIds.length) {
            baseQuery.kpiId = { $in: kpiIds };
        }
        const candidateQueries = [];
        const range = this.resolvePeriodRange(review);
        if (range) {
            candidateQueries.push({
                ...baseQuery,
                period: { $gte: range.start, $lte: range.end },
            });
        }
        const reviewPeriod = String(review?.reviewPeriod ?? '').trim();
        if (/^\d{4}-\d{2}$/.test(reviewPeriod)) {
            const alreadyCoveredByRange = range && reviewPeriod >= range.start && reviewPeriod <= range.end;
            if (!alreadyCoveredByRange) {
                candidateQueries.push({
                    ...baseQuery,
                    period: reviewPeriod,
                });
            }
        }
        if (!candidateQueries.length)
            return null;
        let results = [];
        for (const query of candidateQueries) {
            results = await this.kpiResultModel
                .find(query)
                .populate({ path: 'kpiId', select: 'weight' })
                .lean()
                .exec();
            if (results.length)
                break;
        }
        if (!results.length)
            return null;
        const entries = [];
        results.forEach((result) => {
            const weightRaw = result?.kpiId?.weight;
            const weight = typeof weightRaw === 'number' && Number.isFinite(weightRaw) && weightRaw > 0
                ? weightRaw
                : 1;
            let achievement = typeof result?.achievement === 'number' && Number.isFinite(result.achievement)
                ? result.achievement
                : null;
            if (achievement === null) {
                const score = typeof result?.score === 'number' && Number.isFinite(result.score)
                    ? result.score
                    : null;
                if (score !== null && weight > 0) {
                    achievement = score / weight;
                }
            }
            if (achievement === null)
                return;
            const normalized = Math.max(0, Math.min(1, achievement));
            entries.push({ value: normalized * 5, weight });
        });
        const average = this.computeWeightedAverage(entries);
        if (average === null)
            return null;
        return Math.max(0, Math.min(5, average));
    }
    async resolveWorkflowScoreWeights(employeeId) {
        const defaults = { employee: 40, reviewer: 60 };
        const profile = employeeId ? await this.resolveEmployeeProfile(employeeId) : null;
        const entityId = this.normalizeEntityId(profile?.entity);
        if (!entityId)
            return defaults;
        const workflow = await this.workflowModel
            .findOne({ entity: new mongoose_2.Types.ObjectId(entityId) })
            .lean()
            .exec();
        const employeeWeight = Number(workflow?.employeeScoreWeight);
        const reviewerWeight = Number(workflow?.reviewerScoreWeight);
        if (!Number.isFinite(employeeWeight) || !Number.isFinite(reviewerWeight)) {
            return defaults;
        }
        const total = employeeWeight + reviewerWeight;
        if (total <= 0 || Math.abs(total - 100) > 0.01) {
            return defaults;
        }
        return { employee: employeeWeight, reviewer: reviewerWeight };
    }
    async applyComputedScores(review) {
        const okrScore = await this.computeOkrScore(review);
        const employeeCoreScore = this.computeCoreValueScore(review?.coreValueRatings);
        const reviewerCoreScore = this.computeCoreValueScore(review?.reviewerCoreValueRatings);
        const reviewerRating = this.normalizeRating(review?.rating ?? null) ??
            this.normalizeRating(review?.reviewer2Rating ?? null);
        const kpiWeightTotal = this.computeKpiWeightTotal(review?.kpiSnapshot);
        const behaviouralWeight = Math.max(0, 100 - kpiWeightTotal);
        const weightedBlend = (okrValue, coreValue) => {
            if (kpiWeightTotal > 0 && behaviouralWeight > 0) {
                return (okrValue * kpiWeightTotal + coreValue * behaviouralWeight) / 100;
            }
            if (kpiWeightTotal > 0)
                return okrValue;
            if (behaviouralWeight > 0)
                return coreValue;
            return (okrValue + coreValue) / 2;
        };
        let employeeScore = null;
        if (okrScore !== null && employeeCoreScore !== null) {
            employeeScore = weightedBlend(okrScore, employeeCoreScore);
        }
        else {
            employeeScore = okrScore ?? employeeCoreScore ?? null;
        }
        let reviewerScore = null;
        if (reviewerRating !== null) {
            reviewerScore = reviewerRating;
        }
        else if (reviewerCoreScore !== null && okrScore !== null) {
            reviewerScore = weightedBlend(okrScore, reviewerCoreScore);
        }
        else {
            reviewerScore = reviewerCoreScore ?? okrScore ?? null;
        }
        let finalScore = null;
        if (employeeScore !== null && reviewerScore !== null) {
            const weights = await this.resolveWorkflowScoreWeights(review.employeeId);
            finalScore = (employeeScore * weights.employee + reviewerScore * weights.reviewer) / 100;
        }
        else {
            finalScore = reviewerScore ?? employeeScore ?? null;
        }
        const clamp = (value) => {
            if (value === null)
                return null;
            const safe = Math.max(0, Math.min(5, value));
            return Number.isFinite(safe) ? Number(safe.toFixed(2)) : null;
        };
        review.employeeScore = clamp(employeeScore);
        review.reviewerScore = clamp(reviewerScore);
        review.finalScore = clamp(finalScore);
    }
    async listReviews(user, query, page = 1, limit = 10) {
        const safePage = Math.max(Number(page) || 1, 1);
        const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
        const skip = (safePage - 1) * safeLimit;
        const filters = this.buildFilters(query);
        const supervisorScope = this.normalizeIdentifier(query.supervisorScope);
        const isPrivileged = this.isPrivilegedUser(user);
        if (supervisorScope && !isPrivileged) {
            const actorId = this.normalizeUserId(user?._id ?? user?.id ?? user?.userId ?? user?.staffId) ??
                this.normalizeIdentifier(user?._id ?? user?.id ?? user?.userId ?? user?.staffId);
            if (!actorId || actorId !== supervisorScope) {
                throw new common_1.ForbiddenException('You do not have permission to access these reviews.');
            }
        }
        const subordinateIds = supervisorScope
            ? await this.getSubordinateChainIds(supervisorScope)
            : [];
        const scopeFilter = supervisorScope
            ? this.buildSupervisorScopeFilter(supervisorScope, subordinateIds)
            : null;
        const accessFilter = !isPrivileged && !scopeFilter
            ? this.buildUserAccessFilter(user)
            : scopeFilter;
        if (accessFilter) {
            filters.$and = [...(filters.$and ?? []), accessFilter];
        }
        const [data, total] = await Promise.all([
            this.reviewModel
                .find(filters)
                .sort({ reviewDate: -1 })
                .skip(skip)
                .limit(safeLimit)
                .lean()
                .exec(),
            this.reviewModel.countDocuments(filters),
        ]);
        return {
            data,
            total,
            page: safePage,
            limit: safeLimit,
            totalPages: Math.ceil(total / safeLimit) || 1,
        };
    }
    async getReview(id, user) {
        const review = await this.reviewModel.findById(id).lean().exec();
        if (!review) {
            throw new common_1.NotFoundException('Performance review not found');
        }
        if (user) {
            await this.assertCanAccessReview(user, review);
        }
        return review;
    }
    async createReview(payload) {
        if (!payload.employeeId) {
            throw new common_1.BadRequestException('Employee ID is required');
        }
        const reviewType = String(payload.reviewType ?? '').trim();
        const reviewPeriod = String(payload.reviewPeriod ?? '').trim();
        if (!reviewType || !reviewPeriod) {
            throw new common_1.BadRequestException('Review type and period are required');
        }
        this.validateReviewPeriod(reviewPeriod);
        const reviewStartDate = new Date(payload.reviewStartDate);
        if (Number.isNaN(reviewStartDate.getTime())) {
            throw new common_1.BadRequestException('Review start date is invalid');
        }
        const reviewEndDate = new Date(payload.reviewEndDate);
        if (Number.isNaN(reviewEndDate.getTime())) {
            throw new common_1.BadRequestException('Review end date is invalid');
        }
        if (reviewEndDate < reviewStartDate) {
            throw new common_1.BadRequestException('Review end date cannot be earlier than start date');
        }
        const reviewDate = payload.reviewDate !== undefined
            ? new Date(payload.reviewDate)
            : reviewEndDate;
        if (Number.isNaN(reviewDate.getTime())) {
            throw new common_1.BadRequestException('Review date is invalid');
        }
        const employeeId = payload.employeeId.trim();
        const existingReview = await this.reviewModel
            .findOne({ employeeId, reviewPeriod })
            .lean()
            .exec();
        if (existingReview) {
            throw new common_1.BadRequestException(`An appraisal for ${reviewPeriod} has already been submitted.`);
        }
        const profile = await this.resolveEmployeeProfile(employeeId);
        const role = this.resolveRefValue(profile?.role, ['name', 'title', 'roleName']);
        const department = this.resolveRefValue(profile?.department, ['name', 'title', 'departmentName']);
        const employeeName = this.formatEmployeeName(profile, undefined, employeeId);
        const departmentName = department?.name;
        const positionName = role?.name;
        const payloadReviewerId = this.normalizeIdentifier(payload.reviewerId);
        const payloadReviewer2Id = this.normalizeIdentifier(payload.reviewer2Id);
        const shouldAutoAssign = !payloadReviewerId && !payloadReviewer2Id;
        const supervisorIdRaw = this.normalizeUserId(profile?.supervisorId) ?? this.normalizeIdentifier(profile?.supervisorId);
        const supervisor2IdRaw = this.normalizeUserId(profile?.supervisor2Id) ?? this.normalizeIdentifier(profile?.supervisor2Id);
        const employeeRecordId = this.normalizeUserId(profile?._id ?? profile?.id) ??
            this.normalizeIdentifier(profile?._id ?? profile?.id);
        const supervisorId = supervisorIdRaw && supervisorIdRaw !== employeeRecordId ? supervisorIdRaw : undefined;
        const supervisor2Id = shouldAutoAssign &&
            supervisor2IdRaw &&
            supervisor2IdRaw !== employeeRecordId &&
            supervisor2IdRaw !== supervisorId
            ? supervisor2IdRaw
            : undefined;
        const entityId = this.normalizeEntityId(profile?.entity);
        let hrReviewerIds = [];
        if (entityId) {
            const workflowConfig = await this.workflowModel
                .findOne({ entity: new mongoose_2.Types.ObjectId(entityId), enabled: true })
                .lean()
                .exec();
            hrReviewerIds = this.normalizeUserIdList(workflowConfig?.hrReviewerIds);
        }
        let reviewerId = payloadReviewerId ?? (shouldAutoAssign ? supervisorId : undefined);
        let reviewer2Id = payloadReviewer2Id ?? (shouldAutoAssign ? supervisor2Id : undefined);
        if (shouldAutoAssign && !reviewerId && hrReviewerIds.length) {
            reviewerId = hrReviewerIds[0];
        }
        if (shouldAutoAssign && !reviewer2Id && hrReviewerIds.length) {
            reviewer2Id = hrReviewerIds.find((id) => id !== reviewerId);
        }
        if (reviewer2Id && reviewer2Id === reviewerId) {
            reviewer2Id = undefined;
        }
        const reviewerName = await this.resolveReviewerName(reviewerId);
        const reviewer2Name = await this.resolveReviewerName(reviewer2Id);
        const { kpiIds, kpiSnapshot } = await this.resolveInitialKpis({
            employeeId,
            employeeName,
            reviewStartDate,
            reviewEndDate,
            reviewDate,
        });
        const normalizedCoreValueRatings = this.normalizeCoreValueRatings(payload.coreValueRatings);
        const coreValueRatings = this.allocateBehaviouralWeights(normalizedCoreValueRatings, kpiSnapshot);
        const normalizedReviewerCoreValueRatings = this.normalizeCoreValueRatings(payload.reviewerCoreValueRatings);
        const reviewerCoreValueRatings = this.allocateBehaviouralWeights(normalizedReviewerCoreValueRatings, kpiSnapshot);
        const reviewStage = this.resolveInitialReviewStage({
            reviewerId,
            reviewer2Id,
            hrReviewerIds,
        });
        const record = new this.reviewModel({
            employeeId,
            employeeName,
            department: departmentName,
            entity: entityId ?? undefined,
            ...(payload.appraisalCycleId ? { appraisalCycleId: new mongoose_2.Types.ObjectId(String(payload.appraisalCycleId)), appraisalCycleName: payload.appraisalCycleName } : {}),
            position: positionName,
            reviewType,
            reviewPeriod,
            reviewDate,
            reviewStartDate,
            reviewEndDate,
            status: payload.status ?? 'Pending',
            rating: this.normalizeRating(payload.rating),
            reviewerId,
            reviewerName,
            reviewer2Id,
            reviewer2Name,
            hrReviewerIds,
            summary: payload.summary,
            recommendation: payload.recommendation,
            exceptionalAchievement: payload.exceptionalAchievement,
            trainingRecommendation: payload.trainingRecommendation,
            kpiIds,
            kpiSnapshot,
            kpiSnapshotAt: new Date(),
            coreValueRatings,
            coreValueSnapshotAt: coreValueRatings.length ? new Date() : undefined,
            reviewerCoreValueRatings,
            reviewerCoreValueSnapshotAt: reviewerCoreValueRatings.length ? new Date() : undefined,
            reviewStage,
            reviewStageUpdatedAt: new Date(),
        });
        await this.applyComputedScores(record);
        const saved = await record.save();
        const reviewId = saved._id?.toString?.() ?? '';
        const employeeUserId = employeeRecordId ?? (await this.resolveEmployeeUserId(employeeId));
        const reviewerLink = '/performance-management';
        const employeeLink = reviewId ? `/my-performance/reviews/${reviewId}` : '/my-performance';
        const stageRecipients = reviewStage === 'supervisor'
            ? [reviewerId].filter(Boolean)
            : reviewStage === 'supervisor2'
                ? [reviewer2Id].filter(Boolean)
                : reviewStage === 'hr'
                    ? hrReviewerIds
                    : [];
        if (stageRecipients.length) {
            await this.notifyUsers({
                userIds: stageRecipients,
                message: `New appraisal submitted by ${employeeName} for ${reviewPeriod}.`,
                link: reviewerLink,
                type: 'performance-review',
                emailSubject: `Appraisal review required: ${employeeName}`,
                emailText: `Hello,\n\n${employeeName} has submitted a self appraisal for ${reviewPeriod}.\n` +
                    `Please review the submission in the HR portal.\n\nView: ${this.buildPortalUrl(reviewerLink)}`,
            });
        }
        if (employeeUserId) {
            await this.notifyUsers({
                userIds: [employeeUserId],
                message: `Your appraisal for ${reviewPeriod} has been submitted for review.`,
                link: employeeLink,
                type: 'performance-review',
                emailSubject: `Your appraisal was submitted`,
                emailText: `Hi ${employeeName},\n\nYour appraisal for ${reviewPeriod} has been submitted and is awaiting review.\n\n` +
                    `View: ${this.buildPortalUrl(employeeLink)}`,
            });
        }
        return saved;
    }
    async updateReview(id, updates, actor) {
        const review = await this.reviewModel.findById(id).exec();
        if (!review) {
            throw new common_1.NotFoundException('Performance review not found');
        }
        const previousStatus = String(review.status ?? 'Pending');
        const previousStage = review.reviewStage ??
            this.resolveInitialReviewStage({
                reviewerId: this.normalizeIdentifier(review.reviewerId),
                reviewer2Id: this.normalizeIdentifier(review.reviewer2Id),
                hrReviewerIds: this.normalizeUserIdList(review.hrReviewerIds),
            });
        const actorId = this.normalizeUserId(actor?._id ?? actor?.id ?? actor?.userId ?? actor?.staffId) ??
            this.normalizeIdentifier(actor?._id ?? actor?.id ?? actor?.userId ?? actor?.staffId);
        const reviewerId = this.normalizeIdentifier(review.reviewerId);
        const reviewer2Id = this.normalizeIdentifier(review.reviewer2Id);
        const hrReviewerIds = this.normalizeUserIdList(review.hrReviewerIds);
        const actorKey = this.normalizeIdentifier(actorId);
        const isReviewer1 = Boolean(actorKey && reviewerId && actorKey === reviewerId);
        const isReviewer2 = Boolean(actorKey && reviewer2Id && actorKey === reviewer2Id);
        const isHrReviewer = Boolean(actorKey && hrReviewerIds.includes(actorKey));
        const isSecondReviewer = isReviewer2 && !isReviewer1;
        const hasReviewerUpdates = Object.prototype.hasOwnProperty.call(updates, 'reviewerCoreValueRatings') ||
            Object.prototype.hasOwnProperty.call(updates, 'rating') ||
            Object.prototype.hasOwnProperty.call(updates, 'summary') ||
            Object.prototype.hasOwnProperty.call(updates, 'recommendation') ||
            Object.prototype.hasOwnProperty.call(updates, 'trainingRecommendation');
        if (!this.isPrivilegedUser(actor)) {
            if (!actorKey) {
                throw new common_1.ForbiddenException('You do not have permission to update this review.');
            }
            if (isReviewer1) {
                if (previousStage !== 'supervisor') {
                    throw new common_1.ForbiddenException('This review is not ready for supervisor scoring.');
                }
            }
            else if (isReviewer2) {
                if (previousStage !== 'supervisor2') {
                    throw new common_1.ForbiddenException('This review is not ready for second-level scoring.');
                }
            }
            else if (isHrReviewer) {
                if (previousStage !== 'hr') {
                    throw new common_1.ForbiddenException('This review is not ready for HR scoring.');
                }
            }
            else {
                throw new common_1.ForbiddenException('You do not have permission to update this review.');
            }
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'reviewPeriod')) {
            this.validateReviewPeriod(updates.reviewPeriod);
        }
        const mutableUpdates = updates;
        const isActorPrivileged = this.isPrivilegedUser(actor);
        let didResetStage = false;
        let shouldDeleteKpiResults = false;
        if (isActorPrivileged && mutableUpdates.resetStaffScores) {
            review.employeeScore = null;
            review.coreValueRatings = [];
            review.coreValueSnapshotAt = undefined;
            review.reviewStage = 'employee';
            review.reviewStageUpdatedAt = new Date();
            review.status = 'Pending Employee Review';
            shouldDeleteKpiResults = true;
            didResetStage = true;
        }
        if (isActorPrivileged && mutableUpdates.resetAllScores) {
            review.rating = null;
            review.reviewer2Rating = null;
            review.employeeScore = null;
            review.reviewerScore = null;
            review.finalScore = null;
            review.coreValueRatings = [];
            review.coreValueSnapshotAt = undefined;
            review.reviewerCoreValueRatings = [];
            review.reviewerCoreValueSnapshotAt = undefined;
            review.reviewStage = 'employee';
            review.reviewStageUpdatedAt = new Date();
            review.status = 'Pending Employee Review';
            shouldDeleteKpiResults = true;
            didResetStage = true;
        }
        if (isActorPrivileged &&
            !mutableUpdates.resetStaffScores &&
            !mutableUpdates.resetAllScores &&
            Object.prototype.hasOwnProperty.call(mutableUpdates, 'rating') &&
            mutableUpdates.rating === null) {
            review.rating = null;
            review.reviewerScore = null;
            review.finalScore = null;
            review.status = 'In Progress';
            review.reviewStage = 'supervisor';
            review.reviewStageUpdatedAt = new Date();
            didResetStage = true;
        }
        delete mutableUpdates.resetStaffScores;
        delete mutableUpdates.resetAllScores;
        if (Object.prototype.hasOwnProperty.call(mutableUpdates, 'status')) {
            delete mutableUpdates.status;
        }
        if (Object.prototype.hasOwnProperty.call(mutableUpdates, 'reviewStage')) {
            delete mutableUpdates.reviewStage;
        }
        if (Object.prototype.hasOwnProperty.call(mutableUpdates, 'reviewStageUpdatedAt')) {
            delete mutableUpdates.reviewStageUpdatedAt;
        }
        if (Object.prototype.hasOwnProperty.call(mutableUpdates, 'employeeScore')) {
            delete mutableUpdates.employeeScore;
        }
        if (Object.prototype.hasOwnProperty.call(mutableUpdates, 'reviewerScore')) {
            delete mutableUpdates.reviewerScore;
        }
        if (Object.prototype.hasOwnProperty.call(mutableUpdates, 'finalScore')) {
            delete mutableUpdates.finalScore;
        }
        if (updates.reviewDate) {
            review.reviewDate = new Date(updates.reviewDate);
            delete updates.reviewDate;
        }
        if (updates.reviewStartDate) {
            review.reviewStartDate = new Date(updates.reviewStartDate);
            delete updates.reviewStartDate;
        }
        if (updates.reviewEndDate) {
            review.reviewEndDate = new Date(updates.reviewEndDate);
            delete updates.reviewEndDate;
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'rating')) {
            const normalizedRating = this.normalizeRating(updates.rating);
            if (isSecondReviewer) {
                review.reviewer2Rating = normalizedRating;
            }
            else {
                review.rating = normalizedRating;
            }
            delete updates.rating;
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'summary')) {
            const summaryValue = updates.summary;
            if (isSecondReviewer) {
                review.reviewer2Summary =
                    summaryValue !== undefined && summaryValue !== null
                        ? String(summaryValue)
                        : undefined;
            }
            else {
                review.summary =
                    summaryValue !== undefined && summaryValue !== null
                        ? String(summaryValue)
                        : undefined;
            }
            delete updates.summary;
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'recommendation')) {
            const recommendationValue = updates.recommendation;
            if (isSecondReviewer) {
                review.reviewer2Recommendation =
                    recommendationValue !== undefined && recommendationValue !== null
                        ? String(recommendationValue)
                        : undefined;
            }
            else {
                review.recommendation =
                    recommendationValue !== undefined && recommendationValue !== null
                        ? String(recommendationValue)
                        : undefined;
            }
            delete updates.recommendation;
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'trainingRecommendation')) {
            const trainingValue = updates.trainingRecommendation;
            if (isSecondReviewer) {
                review.reviewer2TrainingRecommendation =
                    trainingValue !== undefined && trainingValue !== null
                        ? String(trainingValue)
                        : undefined;
            }
            else {
                review.reviewerTrainingRecommendation =
                    trainingValue !== undefined && trainingValue !== null
                        ? String(trainingValue)
                        : undefined;
            }
            delete updates.trainingRecommendation;
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'reviewerId')) {
            review.reviewerId = updates.reviewerId;
            review.reviewerName = await this.resolveReviewerName(updates.reviewerId);
            delete updates.reviewerId;
            delete updates.reviewerName;
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'reviewer2Id')) {
            review.reviewer2Id = updates.reviewer2Id;
            review.reviewer2Name = await this.resolveReviewerName(updates.reviewer2Id);
            delete updates.reviewer2Id;
            delete updates.reviewer2Name;
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'coreValueRatings')) {
            const normalizedCoreValueRatings = this.normalizeCoreValueRatings(updates.coreValueRatings);
            review.coreValueRatings = this.allocateBehaviouralWeights(normalizedCoreValueRatings, review.kpiSnapshot);
            review.coreValueSnapshotAt = review.coreValueRatings?.length
                ? new Date()
                : undefined;
            delete updates.coreValueRatings;
        }
        if (Object.prototype.hasOwnProperty.call(updates, 'reviewerCoreValueRatings')) {
            const normalizedReviewerCoreValueRatings = this.normalizeCoreValueRatings(updates.reviewerCoreValueRatings);
            review.reviewerCoreValueRatings = this.allocateBehaviouralWeights(normalizedReviewerCoreValueRatings, review.kpiSnapshot);
            review.reviewerCoreValueSnapshotAt = review.reviewerCoreValueRatings?.length
                ? new Date()
                : undefined;
            delete updates.reviewerCoreValueRatings;
        }
        let nextStage = null;
        if (hasReviewerUpdates && !didResetStage) {
            if (previousStage === 'supervisor' && isReviewer1) {
                if (reviewer2Id) {
                    nextStage = 'supervisor2';
                }
                else if (hrReviewerIds.length) {
                    nextStage = 'hr';
                }
                else {
                    nextStage = 'completed';
                }
            }
            else if (previousStage === 'supervisor2' && isReviewer2) {
                nextStage = hrReviewerIds.length ? 'hr' : 'completed';
            }
            else if (previousStage === 'hr' && isHrReviewer) {
                nextStage = 'completed';
            }
        }
        if (nextStage && nextStage !== previousStage) {
            review.reviewStage = nextStage;
            review.reviewStageUpdatedAt = new Date();
            if (nextStage === 'completed') {
                review.status = 'Completed';
            }
        }
        else if (!review.reviewStage) {
            review.reviewStage = previousStage;
            review.reviewStageUpdatedAt = new Date();
        }
        Object.assign(review, updates);
        if (!didResetStage) {
            await this.applyComputedScores(review);
        }
        const saved = await review.save();
        if (shouldDeleteKpiResults) {
            const empId = (saved.employeeId ?? '').trim();
            const cycleId = saved.appraisalCycleId
                ? String(saved.appraisalCycleId)
                : '';
            if (empId && cycleId) {
                const cycleKpis = await this.kpiModel
                    .find({ appraisalCycleId: new mongoose_2.Types.ObjectId(cycleId) })
                    .select('_id')
                    .lean()
                    .exec();
                const kpiIds = cycleKpis.map((k) => k._id);
                if (kpiIds.length) {
                    await this.kpiResultModel
                        .deleteMany({ employeeId: empId, kpiId: { $in: kpiIds } })
                        .exec();
                    await this.kpiModel
                        .updateMany({ _id: { $in: kpiIds }, actualValue: { $ne: null } }, { $set: { actualValue: null, isActualValueLocked: false }, $unset: { lockedBy: 1, lockedAt: 1 } })
                        .exec();
                }
            }
        }
        const stageChanged = Boolean(nextStage && nextStage !== previousStage);
        const statusChangedToCompleted = String(previousStatus ?? '').toLowerCase() !== 'completed' &&
            String(saved.status ?? '').toLowerCase() === 'completed';
        if (stageChanged || statusChangedToCompleted) {
            const reviewId = saved._id?.toString?.() ?? '';
            const employeeName = saved.employeeName ?? 'the employee';
            const period = saved.reviewPeriod ?? 'this cycle';
            const employeeUserId = await this.resolveEmployeeUserId(saved.employeeId);
            const reviewerLink = '/performance-management';
            const employeeLink = reviewId ? `/my-performance/reviews/${reviewId}` : '/my-performance';
            const stageLabelMap = {
                supervisor: 'Supervisor review',
                supervisor2: 'Second-level review',
                hr: 'HR review',
                completed: 'Completed',
            };
            const nextStageLabel = stageLabelMap[nextStage ?? saved.reviewStage ?? ''] ?? 'Next review';
            if (employeeUserId) {
                const employeeMessage = nextStage === 'completed' || statusChangedToCompleted
                    ? `Your appraisal for ${period} has been completed.`
                    : `Your appraisal for ${period} has moved to ${nextStageLabel}.`;
                await this.notifyUsers({
                    userIds: [employeeUserId],
                    message: employeeMessage,
                    link: employeeLink,
                    type: 'performance-review',
                    emailSubject: nextStage === 'completed' || statusChangedToCompleted
                        ? 'Your appraisal is complete'
                        : 'Your appraisal moved to the next stage',
                    emailText: `Hi ${employeeName},\n\n${employeeMessage}\n\nView: ${this.buildPortalUrl(employeeLink)}`,
                });
            }
            const stageRecipients = nextStage === 'supervisor2'
                ? [reviewer2Id].filter(Boolean)
                : nextStage === 'hr'
                    ? hrReviewerIds
                    : [];
            if (stageRecipients.length) {
                await this.notifyUsers({
                    userIds: stageRecipients,
                    message: `Appraisal for ${employeeName} (${period}) is ready for your review.`,
                    link: reviewerLink,
                    type: 'performance-review',
                    emailSubject: `Appraisal review required: ${employeeName}`,
                    emailText: `Hello,\n\nAn appraisal for ${employeeName} (${period}) is ready for your review.\n\n` +
                        `View: ${this.buildPortalUrl(reviewerLink)}`,
                });
            }
            if (nextStage === 'completed' || statusChangedToCompleted) {
                const completionRecipients = [reviewerId, reviewer2Id].filter(Boolean);
                if (completionRecipients.length) {
                    await this.notifyUsers({
                        userIds: completionRecipients,
                        message: `The performance review for ${employeeName} (${period}) has been completed.`,
                        link: reviewerLink,
                        type: 'performance-review',
                        emailSubject: `Appraisal completed: ${employeeName}`,
                        emailText: `Hello,\n\nThe performance review for ${employeeName} (${period}) has been completed.\n\n` +
                            `View: ${this.buildPortalUrl(reviewerLink)}`,
                    });
                }
            }
        }
        return saved;
    }
    async bulkCreateFromCsv(rows) {
        if (!rows.length) {
            throw new common_1.BadRequestException('CSV file is empty');
        }
        const normalized = rows.map((row) => {
            const read = (key) => (row?.[key] ?? '').trim();
            return {
                employeeId: read('employee_id') ||
                    read('staff_id') ||
                    read('employeeid') ||
                    read('staffid'),
                reviewerId: read('reviewer_id') || read('reviewerid'),
                reviewer2Id: read('reviewer2_id') ||
                    read('reviewer2id') ||
                    read('reviewer_2_id'),
                reviewType: read('review_type') || read('reviewtype') || read('type'),
                reviewPeriod: read('review_period') || read('reviewperiod') || read('period'),
                reviewStartDate: read('review_start_date') || read('reviewstartdate') || read('start_date'),
                reviewEndDate: read('review_end_date') || read('reviewenddate') || read('end_date'),
                reviewDate: read('review_date') || read('reviewdate'),
                status: read('status'),
                rating: read('rating'),
                summary: read('summary'),
            };
        });
        const candidates = normalized.filter((row) => row.employeeId &&
            row.reviewType &&
            row.reviewPeriod &&
            row.reviewStartDate &&
            row.reviewEndDate);
        if (!candidates.length) {
            return { created: 0, skipped: rows.length };
        }
        let created = 0;
        for (const row of candidates) {
            try {
                await this.createReview({
                    employeeId: row.employeeId,
                    reviewType: row.reviewType,
                    reviewPeriod: row.reviewPeriod,
                    reviewStartDate: row.reviewStartDate,
                    reviewEndDate: row.reviewEndDate,
                    reviewDate: row.reviewDate || row.reviewEndDate,
                    status: row.status || undefined,
                    rating: row.rating ? Number(row.rating) : undefined,
                    reviewerId: row.reviewerId || undefined,
                    reviewer2Id: row.reviewer2Id || undefined,
                    summary: row.summary || undefined,
                });
                created += 1;
            }
            catch {
            }
        }
        return { created, skipped: rows.length - created };
    }
    async deleteReview(id) {
        const result = await this.reviewModel.findByIdAndDelete(id).exec();
        if (!result) {
            throw new common_1.NotFoundException('Performance review not found');
        }
        return { deleted: true };
    }
    async listCoreValues(user, entity) {
        const canManage = this.canManagePerformanceWorkflow(user);
        const query = {};
        if (entity || !canManage) {
            const fallbackEntity = entity ??
                user?.entity ??
                user?.selectedSubsidiary ??
                user?.subsidiary;
            if (!fallbackEntity) {
                throw new common_1.BadRequestException('Entity is required.');
            }
            const entityId = this.normalizeEntityIdStrict(fallbackEntity);
            query.entity = new mongoose_2.Types.ObjectId(entityId);
            if (!canManage && entity) {
                const userEntity = this.normalizeEntityIdStrict(user?.entity ?? user?.selectedSubsidiary ?? user?.subsidiary ?? fallbackEntity);
                if (userEntity !== entityId) {
                    throw new common_1.ForbiddenException('You do not have permission to access core values for this entity.');
                }
            }
        }
        const data = await this.coreValueModel
            .find(query)
            .sort({ createdAt: 1 })
            .lean()
            .exec();
        return { status: 200, data };
    }
    async createCoreValue(user, payload) {
        this.assertCanManageWorkflow(user);
        const entityId = this.normalizeEntityIdStrict(payload?.entity);
        const title = String(payload?.title ?? '').trim();
        if (!title) {
            throw new common_1.BadRequestException('Title is required.');
        }
        const weight = this.normalizeWeight(payload?.weight);
        const description = String(payload?.description ?? '').trim();
        const raters = this.normalizeRaters(payload?.raters);
        const isActive = payload?.isActive !== false;
        const record = await this.coreValueModel.create({
            entity: new mongoose_2.Types.ObjectId(entityId),
            title,
            description,
            weight,
            raters,
            isActive,
        });
        return { status: 200, data: record };
    }
    async updateCoreValue(user, id, payload) {
        this.assertCanManageWorkflow(user);
        const updates = {};
        if (payload?.title !== undefined) {
            const title = String(payload?.title ?? '').trim();
            if (!title) {
                throw new common_1.BadRequestException('Title is required.');
            }
            updates.title = title;
        }
        if (payload?.description !== undefined) {
            updates.description = String(payload?.description ?? '').trim();
        }
        if (payload?.weight !== undefined) {
            updates.weight = this.normalizeWeight(payload?.weight);
        }
        if (payload?.raters !== undefined) {
            updates.raters = this.normalizeRaters(payload?.raters);
        }
        if (payload?.isActive !== undefined) {
            updates.isActive = payload?.isActive !== false;
        }
        const record = await this.coreValueModel
            .findByIdAndUpdate(id, { $set: updates }, { new: true })
            .lean()
            .exec();
        if (!record) {
            throw new common_1.NotFoundException('Core value not found.');
        }
        return { status: 200, data: record };
    }
    async deleteCoreValue(user, id) {
        this.assertCanManageWorkflow(user);
        const record = await this.coreValueModel.findByIdAndDelete(id).lean().exec();
        if (!record) {
            throw new common_1.NotFoundException('Core value not found.');
        }
        return { status: 200, deleted: true };
    }
    async listAppraisalCycles(user, entity, search) {
        this.assertCanManageWorkflow(user);
        const entityId = this.normalizeEntityIdStrict(entity ?? user?.entity);
        const query = { entity: new mongoose_2.Types.ObjectId(entityId) };
        if (search && String(search).trim()) {
            const trimmed = String(search).trim();
            const regex = new RegExp(trimmed, 'i');
            query.$or = [
                { title: regex },
                { description: regex },
                { year: regex },
                { status: regex },
                { types: regex },
            ];
        }
        const rows = await this.appraisalCycleModel
            .find(query)
            .sort({ createdAt: -1 })
            .lean()
            .exec();
        return { status: 200, data: rows.map((row) => this.serializeAppraisalCycle(row)) };
    }
    async listActiveAppraisalCycles(user, entity) {
        const entityId = this.normalizeEntityIdStrict(entity ?? user?.entity ?? user?.selectedSubsidiary ?? user?.subsidiary);
        const query = {
            entity: new mongoose_2.Types.ObjectId(entityId),
            status: { $regex: /^active$/i },
        };
        const rows = await this.appraisalCycleModel
            .find(query)
            .sort({ startDate: -1 })
            .lean()
            .exec();
        return { status: 200, data: rows.map((row) => this.serializeAppraisalCycle(row)) };
    }
    async debugAppraisalCycleExists(user, entity) {
        const entityId = this.normalizeEntityIdStrict(entity ?? user?.entity ?? user?.selectedSubsidiary ?? user?.subsidiary);
        const query = { entity: new mongoose_2.Types.ObjectId(entityId) };
        const [total, activeTotal, latest] = await Promise.all([
            this.appraisalCycleModel.countDocuments(query),
            this.appraisalCycleModel.countDocuments({
                ...query,
                status: { $regex: /^active$/i },
            }),
            this.appraisalCycleModel
                .findOne(query)
                .sort({ startDate: -1, createdAt: -1 })
                .lean()
                .exec(),
        ]);
        return {
            status: 200,
            entity: entityId,
            total,
            activeTotal,
            latest: latest ? this.serializeAppraisalCycle(latest) : null,
        };
    }
    async getAppraisalCycle(user, id) {
        this.assertCanManageWorkflow(user);
        const record = await this.appraisalCycleModel.findById(id).lean().exec();
        if (!record) {
            throw new common_1.NotFoundException('Appraisal cycle not found.');
        }
        return { status: 200, data: this.serializeAppraisalCycle(record) };
    }
    async createAppraisalCycle(user, payload) {
        this.assertCanManageWorkflow(user);
        const entityId = this.normalizeEntityIdStrict(payload?.entity ?? user?.entity);
        const title = String(payload?.title ?? '').trim();
        if (!title) {
            throw new common_1.BadRequestException('Title is required.');
        }
        const description = String(payload?.description ?? '').trim();
        const year = String(payload?.year ?? new Date().getFullYear()).trim();
        if (!year) {
            throw new common_1.BadRequestException('Year is required.');
        }
        const startDate = this.parseCycleDate(payload?.startDate, 'Start');
        const endDate = this.parseCycleDate(payload?.endDate, 'End');
        if (endDate < startDate) {
            throw new common_1.BadRequestException('End date cannot be earlier than start date.');
        }
        const reviewStartDate = this.parseCycleDate(payload?.reviewStartDate, 'Review start');
        const reviewEndDate = this.parseCycleDate(payload?.reviewEndDate, 'Review end');
        this.assertReviewWindowWithinCycle(reviewStartDate, reviewEndDate, startDate, endDate);
        const status = this.normalizeCycleStatus(payload?.status);
        const types = this.normalizeStringList(payload?.types);
        const scoreType = payload?.scoreType ? String(payload.scoreType).trim() : undefined;
        const scoreTypeLabel = payload?.scoreTypeLabel ? String(payload.scoreTypeLabel).trim() : undefined;
        const ratingTagsEnabled = payload?.ratingTagsEnabled !== false;
        const arcEnabled = payload?.arcEnabled === true;
        const ratingTags = this.normalizeRatingTags(payload?.ratingTags);
        const formSnapshot = payload?.formSnapshot && typeof payload.formSnapshot === 'object'
            ? payload.formSnapshot
            : undefined;
        const record = await this.appraisalCycleModel.create({
            entity: new mongoose_2.Types.ObjectId(entityId),
            title,
            description,
            year,
            startDate,
            endDate,
            reviewStartDate,
            reviewEndDate,
            status,
            types,
            scoreType,
            scoreTypeLabel,
            ratingTagsEnabled,
            arcEnabled,
            ratingTags,
            formSnapshot,
            createdBy: this.normalizeUserId(user?._id) ? new mongoose_2.Types.ObjectId(this.normalizeUserId(user?._id)) : undefined,
        });
        return { status: 200, data: this.serializeAppraisalCycle(record) };
    }
    async updateAppraisalCycle(user, id, payload) {
        this.assertCanManageWorkflow(user);
        const record = await this.appraisalCycleModel.findById(id).exec();
        if (!record) {
            throw new common_1.NotFoundException('Appraisal cycle not found.');
        }
        if (payload?.entity !== undefined) {
            const entityId = this.normalizeEntityIdStrict(payload?.entity);
            record.entity = new mongoose_2.Types.ObjectId(entityId);
        }
        if (payload?.title !== undefined) {
            const title = String(payload?.title ?? '').trim();
            if (!title) {
                throw new common_1.BadRequestException('Title is required.');
            }
            record.title = title;
        }
        if (payload?.description !== undefined) {
            record.description = String(payload?.description ?? '').trim();
        }
        if (payload?.year !== undefined) {
            const year = String(payload?.year ?? '').trim();
            if (!year) {
                throw new common_1.BadRequestException('Year is required.');
            }
            record.year = year;
        }
        if (payload?.status !== undefined) {
            record.status = this.normalizeCycleStatus(payload?.status);
        }
        if (payload?.types !== undefined) {
            record.types = this.normalizeStringList(payload?.types);
        }
        if (payload?.scoreType !== undefined) {
            record.scoreType = payload?.scoreType ? String(payload.scoreType).trim() : undefined;
        }
        if (payload?.scoreTypeLabel !== undefined) {
            record.scoreTypeLabel = payload?.scoreTypeLabel ? String(payload.scoreTypeLabel).trim() : undefined;
        }
        if (payload?.ratingTagsEnabled !== undefined) {
            record.ratingTagsEnabled = payload?.ratingTagsEnabled !== false;
        }
        if (payload?.arcEnabled !== undefined) {
            record.arcEnabled = payload?.arcEnabled === true;
        }
        if (payload?.ratingTags !== undefined) {
            record.ratingTags = this.normalizeRatingTags(payload?.ratingTags);
        }
        if (payload?.formSnapshot !== undefined) {
            record.formSnapshot =
                payload?.formSnapshot && typeof payload.formSnapshot === 'object'
                    ? payload.formSnapshot
                    : undefined;
        }
        const nextCycleStartDate = payload?.startDate !== undefined
            ? this.parseCycleDate(payload?.startDate, 'Start')
            : record.startDate;
        const nextCycleEndDate = payload?.endDate !== undefined
            ? this.parseCycleDate(payload?.endDate, 'End')
            : record.endDate;
        if (nextCycleEndDate < nextCycleStartDate) {
            throw new common_1.BadRequestException('End date cannot be earlier than start date.');
        }
        const toValidDate = (value) => {
            if (!value)
                return undefined;
            if (value instanceof Date && !Number.isNaN(value.getTime()))
                return value;
            const parsed = new Date(value);
            return Number.isNaN(parsed.getTime()) ? undefined : parsed;
        };
        const existingReviewStartDate = toValidDate(record.reviewStartDate);
        const existingReviewEndDate = toValidDate(record.reviewEndDate);
        const nextReviewStartDate = payload?.reviewStartDate !== undefined
            ? this.parseCycleDate(payload?.reviewStartDate, 'Review start')
            : existingReviewStartDate;
        const nextReviewEndDate = payload?.reviewEndDate !== undefined
            ? this.parseCycleDate(payload?.reviewEndDate, 'Review end')
            : existingReviewEndDate;
        const reviewWindowUpdated = payload?.reviewStartDate !== undefined ||
            payload?.reviewEndDate !== undefined ||
            payload?.startDate !== undefined ||
            payload?.endDate !== undefined;
        if (reviewWindowUpdated &&
            ((nextReviewStartDate && !nextReviewEndDate) || (!nextReviewStartDate && nextReviewEndDate))) {
            throw new common_1.BadRequestException('Both review start date and review end date are required.');
        }
        if (reviewWindowUpdated && nextReviewStartDate && nextReviewEndDate) {
            this.assertReviewWindowWithinCycle(nextReviewStartDate, nextReviewEndDate, nextCycleStartDate, nextCycleEndDate);
        }
        record.startDate = nextCycleStartDate;
        record.endDate = nextCycleEndDate;
        record.reviewStartDate = nextReviewStartDate;
        record.reviewEndDate = nextReviewEndDate;
        const saved = await record.save();
        return { status: 200, data: this.serializeAppraisalCycle(saved) };
    }
    async deleteAppraisalCycle(user, id) {
        this.assertCanManageWorkflow(user);
        const record = await this.appraisalCycleModel.findByIdAndDelete(id).lean().exec();
        if (!record) {
            throw new common_1.NotFoundException('Appraisal cycle not found.');
        }
        return { status: 200, deleted: true };
    }
    async getWorkflowConfigs(user, entity) {
        this.assertCanManageWorkflow(user);
        const query = {};
        if (entity) {
            query.entity = new mongoose_2.Types.ObjectId(this.normalizeEntityIdStrict(entity));
        }
        const configs = await this.workflowModel
            .find(query)
            .populate('entity', 'name short code')
            .lean();
        return { status: 200, data: configs };
    }
    async saveWorkflowConfig(user, payload) {
        this.assertCanManageWorkflow(user);
        const entityId = this.normalizeEntityIdStrict(payload?.entity);
        const existing = await this.workflowModel
            .findOne({ entity: new mongoose_2.Types.ObjectId(entityId) })
            .lean()
            .exec();
        const fallbackEmployeeWeight = Number.isFinite(Number(existing?.employeeScoreWeight))
            ? Number(existing?.employeeScoreWeight)
            : 40;
        const fallbackReviewerWeight = Number.isFinite(Number(existing?.reviewerScoreWeight))
            ? Number(existing?.reviewerScoreWeight)
            : 60;
        const enabled = payload?.enabled !== false;
        const autoIncludeManager = payload?.autoIncludeManager !== false;
        const initiatorIds = this.normalizeUserIdList(payload?.initiators ?? payload?.initiatorIds);
        const reviewerIds = this.normalizeUserIdList(payload?.reviewers ?? payload?.reviewerIds);
        const approverIds = this.normalizeUserIdList(payload?.approvers ?? payload?.approverIds);
        const hrReviewerIds = this.normalizeUserIdList(payload?.hrReviewers ?? payload?.hrReviewerIds);
        const finalApproverIds = this.normalizeUserIdList(payload?.finalApprovers ?? payload?.finalApproverIds);
        const employeeScoreWeight = payload?.employeeScoreWeight !== undefined
            ? this.normalizeWeight(payload?.employeeScoreWeight)
            : payload?.employeeWeight !== undefined
                ? this.normalizeWeight(payload?.employeeWeight)
                : fallbackEmployeeWeight;
        const reviewerScoreWeight = payload?.reviewerScoreWeight !== undefined
            ? this.normalizeWeight(payload?.reviewerScoreWeight)
            : payload?.supervisorScoreWeight !== undefined
                ? this.normalizeWeight(payload?.supervisorScoreWeight)
                : fallbackReviewerWeight;
        const weightTotal = employeeScoreWeight + reviewerScoreWeight;
        if (Math.abs(weightTotal - 100) > 0.01) {
            throw new common_1.BadRequestException('Employee and supervisor weights must total 100.');
        }
        if (reviewerScoreWeight <= employeeScoreWeight) {
            throw new common_1.BadRequestException('Supervisor weight must be greater than employee weight.');
        }
        if (enabled) {
            if (!reviewerIds.length) {
                throw new common_1.BadRequestException('At least one reviewer must be selected.');
            }
            if (!approverIds.length) {
                throw new common_1.BadRequestException('At least one approver must be selected.');
            }
        }
        const config = await this.workflowModel
            .findOneAndUpdate({ entity: new mongoose_2.Types.ObjectId(entityId) }, {
            $set: {
                entity: new mongoose_2.Types.ObjectId(entityId),
                enabled,
                autoIncludeManager,
                initiatorIds,
                reviewerIds,
                approverIds,
                hrReviewerIds,
                finalApproverIds,
                employeeScoreWeight,
                reviewerScoreWeight,
            },
        }, { upsert: true, new: true, setDefaultsOnInsert: true })
            .populate('entity', 'name short code')
            .lean();
        return { status: 200, data: config };
    }
};
exports.PerformanceService = PerformanceService;
PerformanceService.SUPER_ADMIN_ROLE_NAMES = new Set([
    'super admin',
    'super-admin',
    'superadmin',
    'hr super admin',
    'hr-super-admin',
    'hrsuperadmin',
    'gmd',
    'group hr director',
    'group-hr-director',
    'grouphrdirector',
]);
PerformanceService.ADMIN_ROLE_NAMES = new Set([
    'admin',
    'system admin',
    'system-admin',
    'systemadmin',
    'entity hr admin',
    'entity-hr-admin',
    'entityhradmin',
]);
PerformanceService.PERFORMANCE_WORKFLOW_ROLE_NAMES = new Set([
    'performance-manager',
    'performance manager',
    'performancemanager',
    'performance-officer',
    'performance officer',
    'performanceofficer',
    'performance-training-partner',
    'performance training partner',
    'performancetrainingpartner',
]);
PerformanceService.REVIEW_PERIOD_LABELS = new Set([
    'monthly',
    'quarterly',
    'bi-annual',
    'biannual',
    'annual',
]);
exports.PerformanceService = PerformanceService = PerformanceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(performance_review_schema_1.PerformanceReview.name)),
    __param(1, (0, mongoose_1.InjectModel)(kpi_schema_1.PerformanceKpi.name)),
    __param(2, (0, mongoose_1.InjectModel)(performance_kpi_result_schema_1.PerformanceKpiResult.name)),
    __param(3, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(4, (0, mongoose_1.InjectModel)(performance_workflow_schema_1.PerformanceWorkflowConfig.name)),
    __param(5, (0, mongoose_1.InjectModel)(performance_core_value_schema_1.PerformanceCoreValue.name)),
    __param(6, (0, mongoose_1.InjectModel)(performance_appraisal_cycle_schema_1.PerformanceAppraisalCycle.name)),
    __param(8, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        notice_service_1.NoticeService,
        mail_service_1.MailService])
], PerformanceService);
//# sourceMappingURL=performance.service.js.map