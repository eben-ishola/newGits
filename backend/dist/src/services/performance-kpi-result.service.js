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
exports.PerformanceKpiResultService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const kpi_schema_1 = require("../schemas/kpi.schema");
const performance_kpi_result_schema_1 = require("../schemas/performance-kpi-result.schema");
const DEFAULT_COLLECTION_SOURCES = ['manual', 'mixed'];
const normalizeString = (value) => {
    if (value === null || value === undefined)
        return undefined;
    const trimmed = String(value).trim();
    return trimmed ? trimmed : undefined;
};
const parseNumber = (value) => {
    if (value === null || value === undefined)
        return null;
    const cleaned = String(value).replace(/,/g, '').trim();
    if (!cleaned)
        return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
};
const formatPeriod = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};
const normalizePeriod = (value) => {
    if (!value)
        return formatPeriod(new Date());
    if (value instanceof Date)
        return formatPeriod(value);
    const trimmed = String(value).trim();
    if (/^\d{4}-\d{2}$/.test(trimmed))
        return trimmed;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
        throw new common_1.BadRequestException(`Invalid period '${value}'. Use YYYY-MM.`);
    }
    return formatPeriod(parsed);
};
let PerformanceKpiResultService = class PerformanceKpiResultService {
    constructor(resultModel, kpiModel) {
        this.resultModel = resultModel;
        this.kpiModel = kpiModel;
    }
    buildScopeKey(input) {
        if (input.employeeId) {
            return {
                scopeKey: `employee:${input.employeeId}`,
                scopeType: 'employee',
                scopeId: input.employeeId,
                scopeName: input.scopeName,
            };
        }
        const scopeType = normalizeString(input.scopeType);
        const scopeId = normalizeString(input.scopeId);
        const scopeName = normalizeString(input.scopeName);
        const scopeValue = scopeId ?? scopeName;
        if (!scopeType || !scopeValue) {
            throw new common_1.BadRequestException('Scope information is required.');
        }
        return {
            scopeKey: `${scopeType}:${scopeValue}`,
            scopeType,
            scopeId,
            scopeName,
        };
    }
    computeScore(actualValue, kpi) {
        const actual = parseNumber(actualValue);
        const target = parseNumber(kpi?.targetValue);
        if (actual === null || target === null || target === 0) {
            return { achievement: null, score: null };
        }
        const method = normalizeString(kpi?.scoringMethod)?.toLowerCase() ?? 'ratio';
        const direction = normalizeString(kpi?.scoreDirection)?.toLowerCase() ?? 'higher';
        let ratio = 0;
        if (method === 'binary') {
            if (direction === 'lower') {
                ratio = actual <= target ? 1 : 0;
            }
            else {
                ratio = actual >= target ? 1 : 0;
            }
        }
        else if (direction === 'lower') {
            ratio = actual === 0 ? 0 : target / actual;
        }
        else {
            ratio = target === 0 ? 0 : actual / target;
        }
        const achievement = Math.max(0, Math.min(1, ratio));
        const weight = Number.isFinite(Number(kpi?.weight)) ? Number(kpi.weight) : 1;
        const score = achievement * weight;
        return { achievement, score };
    }
    async listResults(filters, page = 1, limit = 20) {
        const safePage = Math.max(Number(page) || 1, 1);
        const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
        const skip = (safePage - 1) * safeLimit;
        const query = {};
        const rangeStart = filters?.periodStart ? normalizePeriod(filters.periodStart) : undefined;
        const rangeEnd = filters?.periodEnd ? normalizePeriod(filters.periodEnd) : undefined;
        if (rangeStart || rangeEnd) {
            let start = rangeStart;
            let end = rangeEnd;
            if (start && end && start > end) {
                const swap = start;
                start = end;
                end = swap;
            }
            query.period = {};
            if (start)
                query.period.$gte = start;
            if (end)
                query.period.$lte = end;
        }
        else if (filters?.period) {
            query.period = normalizePeriod(filters.period);
        }
        if (filters?.entity)
            query.entity = filters.entity;
        if (filters?.status)
            query.status = filters.status;
        if (filters?.source)
            query.source = filters.source;
        if (filters?.kpiId)
            query.kpiId = new mongoose_2.Types.ObjectId(filters.kpiId);
        if (filters?.employeeId) {
            const ids = new Set();
            String(filters.employeeId)
                .split(',')
                .map((segment) => segment.trim())
                .filter(Boolean)
                .forEach((id) => ids.add(id));
            if (ids.size) {
                query.employeeId = { $in: Array.from(ids) };
            }
        }
        if (filters?.search) {
            const regex = new RegExp(filters.search, 'i');
            query.$or = [
                { employeeName: regex },
                { employeeId: regex },
                { scopeKey: regex },
                { scopeName: regex },
            ];
        }
        const [data, total] = await Promise.all([
            this.resultModel
                .find(query)
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(safeLimit)
                .populate({
                path: 'kpiId',
                select: 'title description targetValue measurementUnit weight type kpa collectionSource externalKey scoringMethod scoreDirection',
            })
                .lean()
                .exec(),
            this.resultModel.countDocuments(query).exec(),
        ]);
        return {
            data,
            total,
            page: safePage,
            limit: safeLimit,
            totalPages: Math.ceil(total / safeLimit) || 1,
        };
    }
    async submitManualResult(payload, actorId) {
        const kpi = await this.kpiModel.findById(payload.kpiId).lean().exec();
        if (!kpi) {
            throw new common_1.NotFoundException('KPI not found');
        }
        const source = normalizeString(kpi.collectionSource)?.toLowerCase();
        if (source === 'api') {
            throw new common_1.BadRequestException('This KPI is API-driven and cannot be submitted manually.');
        }
        const period = normalizePeriod(payload.period);
        const employeeId = normalizeString(payload.employeeId) ?? normalizeString(kpi.employeeId);
        const employeeName = normalizeString(payload.employeeName) ?? normalizeString(kpi.employeeName);
        if (!employeeId) {
            throw new common_1.BadRequestException('Employee ID is required for manual KPI submission.');
        }
        const actualValue = normalizeString(payload.actualValue);
        if (!actualValue) {
            throw new common_1.BadRequestException('Actual value is required.');
        }
        const scope = this.buildScopeKey({ employeeId });
        const score = this.computeScore(actualValue, kpi);
        const entity = normalizeString(payload.entity) ?? normalizeString(kpi.entity);
        const update = {
            kpiId: kpi._id,
            period,
            employeeId,
            employeeName,
            ...scope,
            actualValue,
            source: 'employee',
            status: 'submitted',
            submittedBy: actorId,
            submittedAt: new Date(),
            achievement: score.achievement,
            score: score.score,
            ...(entity ? { entity } : {}),
        };
        return this.resultModel.findOneAndUpdate({ kpiId: kpi._id, period, scopeKey: scope.scopeKey }, { $set: update, $setOnInsert: { createdAt: new Date() } }, { upsert: true, new: true });
    }
    async approveResult(id, updates, actorId) {
        const result = await this.resultModel.findById(id).exec();
        if (!result) {
            throw new common_1.NotFoundException('KPI result not found');
        }
        const kpi = await this.kpiModel.findById(result.kpiId).lean().exec();
        if (!kpi) {
            throw new common_1.NotFoundException('KPI not found');
        }
        if (updates.actualValue !== undefined) {
            const actualValue = normalizeString(updates.actualValue);
            result.actualValue = parseNumber(actualValue);
            const score = this.computeScore(actualValue ?? undefined, kpi);
            result.achievement = score.achievement;
            result.score = score.score;
            result.source = 'reviewer';
        }
        if (updates.isActualValueLocked !== undefined) {
            result.isActualValueLocked = Boolean(updates.isActualValueLocked);
            if (updates.isActualValueLocked) {
                result.lockedBy = actorId;
                result.lockedAt = new Date();
            }
            else {
                result.lockedBy = undefined;
                result.lockedAt = undefined;
            }
        }
        if (updates.status) {
            result.status = updates.status;
        }
        else {
            result.status = 'approved';
        }
        result.reviewedBy = actorId;
        result.reviewerName = normalizeString(updates.reviewerName) ?? result.reviewerName;
        result.reviewedAt = new Date();
        return result.save();
    }
    async openMonthlyResults(periodInput) {
        const period = normalizePeriod(periodInput);
        const sourceFilter = {
            $or: [
                { collectionSource: { $exists: false } },
                { collectionSource: null },
                { collectionSource: '' },
                { collectionSource: { $in: DEFAULT_COLLECTION_SOURCES } },
            ],
        };
        const kpis = await this.kpiModel.find(sourceFilter).lean().exec();
        if (!kpis.length) {
            return { created: 0, skipped: 0 };
        }
        const ops = [];
        let skipped = 0;
        for (const kpi of kpis) {
            const employeeId = normalizeString(kpi.employeeId);
            if (!employeeId) {
                skipped += 1;
                continue;
            }
            const scope = this.buildScopeKey({ employeeId });
            const kpiEntity = normalizeString(kpi.entity);
            ops.push({
                updateOne: {
                    filter: { kpiId: kpi._id, period, scopeKey: scope.scopeKey },
                    update: {
                        $setOnInsert: {
                            kpiId: kpi._id,
                            period,
                            ...scope,
                            employeeId,
                            employeeName: normalizeString(kpi.employeeName),
                            ...(kpiEntity ? { entity: kpiEntity } : {}),
                            status: 'draft',
                            source: 'system',
                        },
                    },
                    upsert: true,
                },
            });
        }
        if (!ops.length) {
            return { created: 0, skipped };
        }
        const result = await this.resultModel.bulkWrite(ops, { ordered: false });
        return {
            created: result.upsertedCount ?? 0,
            skipped,
        };
    }
    async importApiResults(payload) {
        const period = normalizePeriod(payload.period);
        const results = Array.isArray(payload.results) ? payload.results : [];
        if (!results.length) {
            return { updated: 0, skipped: 0 };
        }
        let updated = 0;
        let skipped = 0;
        for (const item of results) {
            const kpiId = normalizeString(item.kpiId ?? item.kpi_id ?? item.kpi);
            const externalKey = normalizeString(item.externalKey ?? item.external_key ?? item.metric);
            const kpi = kpiId
                ? await this.kpiModel.findById(kpiId).lean().exec()
                : externalKey
                    ? await this.kpiModel.findOne({ externalKey }).lean().exec()
                    : null;
            if (!kpi) {
                skipped += 1;
                continue;
            }
            const entryPeriod = normalizePeriod(item.period ?? period);
            const employeeId = normalizeString(item.employeeId ?? item.employee_id);
            const scopeKey = normalizeString(item.scopeKey ?? item.scope_key);
            const scopeType = normalizeString(item.scopeType ?? item.scope_type);
            const scopeId = normalizeString(item.scopeId ?? item.scope_id);
            const scopeName = normalizeString(item.scopeName ?? item.scope_name);
            let scope;
            try {
                scope = this.buildScopeKey({ employeeId, scopeType, scopeId, scopeName });
            }
            catch (error) {
                skipped += 1;
                continue;
            }
            const actualValue = normalizeString(item.actualValue ?? item.actual_value ?? item.value);
            if (!actualValue) {
                skipped += 1;
                continue;
            }
            const score = this.computeScore(actualValue, kpi);
            await this.resultModel.findOneAndUpdate({ kpiId: kpi._id, period: entryPeriod, scopeKey: scope.scopeKey }, {
                $set: {
                    kpiId: kpi._id,
                    period: entryPeriod,
                    ...scope,
                    employeeId,
                    actualValue,
                    source: 'api',
                    status: 'approved',
                    achievement: score.achievement,
                    score: score.score,
                    reviewedAt: new Date(),
                },
                $setOnInsert: { createdAt: new Date() },
            }, { upsert: true, new: true });
            updated += 1;
        }
        return { updated, skipped };
    }
};
exports.PerformanceKpiResultService = PerformanceKpiResultService;
exports.PerformanceKpiResultService = PerformanceKpiResultService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(performance_kpi_result_schema_1.PerformanceKpiResult.name)),
    __param(1, (0, mongoose_1.InjectModel)(kpi_schema_1.PerformanceKpi.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], PerformanceKpiResultService);
//# sourceMappingURL=performance-kpi-result.service.js.map