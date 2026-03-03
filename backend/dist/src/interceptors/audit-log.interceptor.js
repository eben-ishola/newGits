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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const audit_log_service_1 = require("../services/audit-log.service");
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const POST_UPDATE_HINTS = [
    'update',
    'edit',
    'approve',
    'reject',
    'assign',
    'resolve',
    'reset',
    'mark',
    'confirm',
];
const MAX_DEPTH = 4;
const MAX_ARRAY = 50;
const MAX_STRING = 2000;
const REDACT_PARTIALS = ['password', 'token', 'secret', 'otp', 'pin', 'signature', 'authorization'];
const REDACT_KEYS = new Set(['currentpassword', 'newpassword', 'refreshToken'.toLowerCase(), 'accessToken'.toLowerCase()]);
let AuditLogInterceptor = class AuditLogInterceptor {
    constructor(auditLogService) {
        this.auditLogService = auditLogService;
    }
    intercept(context, next) {
        const http = context.switchToHttp();
        const req = http.getRequest();
        const res = http.getResponse();
        if (!req || !res) {
            return next.handle();
        }
        const method = String(req.method ?? '').toUpperCase();
        if (!MUTATION_METHODS.has(method)) {
            return next.handle();
        }
        const path = this.resolvePath(req);
        if (this.shouldSkipPath(path)) {
            return next.handle();
        }
        const startTime = Date.now();
        const actor = this.auditLogService.buildActor(req.user);
        const basePayload = {
            action: this.resolveAction(method, path, req?.route?.path, req?.params),
            method,
            path,
            entity: this.resolveEntity(path),
            entityId: this.resolveEntityId(req.params, req.body, null),
            scopeEntityId: this.resolveScopeEntityId(req),
            actor,
            changes: this.normalizePayload(req.body),
            params: this.normalizePayload(req.params),
            query: this.normalizePayload(req.query),
            ip: this.resolveIp(req),
            userAgent: this.resolveUserAgent(req),
            metadata: {
                route: req?.route?.path ?? undefined,
                baseUrl: req?.baseUrl ?? undefined,
            },
        };
        return next.handle().pipe((0, rxjs_1.tap)((responseBody) => {
            const resolvedEntityId = basePayload.entityId ?? this.resolveEntityId(null, null, responseBody);
            void this.auditLogService.record({
                ...basePayload,
                entityId: resolvedEntityId,
                statusCode: res.statusCode ?? 200,
                success: (res.statusCode ?? 200) < 400,
                durationMs: Date.now() - startTime,
            });
        }), (0, rxjs_1.catchError)((error) => {
            const statusCode = error?.status ?? error?.statusCode ?? res.statusCode ?? 500;
            void this.auditLogService.record({
                ...basePayload,
                statusCode,
                success: false,
                durationMs: Date.now() - startTime,
                error: this.resolveErrorMessage(error),
            });
            return (0, rxjs_1.throwError)(() => error);
        }));
    }
    resolvePath(req) {
        const raw = (req.originalUrl ?? req.url ?? '').split('?')[0];
        return typeof raw === 'string' ? raw : '';
    }
    shouldSkipPath(path) {
        const normalized = path.toLowerCase();
        if (!normalized)
            return false;
        if (normalized.startsWith('/audit-logs'))
            return true;
        if (normalized.startsWith('/staff/resolve'))
            return true;
        return false;
    }
    resolveAction(method, path, routePath, params) {
        const normalizedMethod = method.toUpperCase();
        if (normalizedMethod === 'POST') {
            const normalizedPath = `${routePath ?? ''} ${path ?? ''}`.toLowerCase();
            if (this.hasIdParam(params) || this.hasUpdateHint(normalizedPath)) {
                return 'update';
            }
        }
        switch (normalizedMethod) {
            case 'POST':
                return 'create';
            case 'PUT':
            case 'PATCH':
                return 'update';
            case 'DELETE':
                return 'delete';
            default:
                return normalizedMethod.toLowerCase();
        }
    }
    hasIdParam(params) {
        if (!params || typeof params !== 'object')
            return false;
        return Object.entries(params).some(([key, value]) => {
            if (!/id$/i.test(key))
                return false;
            if (value == null)
                return false;
            return String(value).trim().length > 0;
        });
    }
    hasUpdateHint(path) {
        if (!path)
            return false;
        return POST_UPDATE_HINTS.some((hint) => path.includes(`/${hint}`));
    }
    resolveEntity(path) {
        const normalized = path.replace(/^\/+/, '');
        if (!normalized)
            return undefined;
        const [segment] = normalized.split('/');
        return segment || undefined;
    }
    resolveEntityId(params, body, response) {
        const sources = [params, body, response].filter(Boolean);
        if (response && typeof response === 'object' && !Array.isArray(response)) {
            const nested = [response.data, response.item, response.record, response.result];
            nested.forEach((entry) => {
                if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
                    sources.push(entry);
                }
            });
        }
        const keys = [
            'id',
            '_id',
            'userId',
            'staffId',
            'employeeId',
            'roleId',
            'permissionId',
            'branchId',
            'subsidiaryId',
            'departmentId',
            'businessUnitId',
            'levelId',
            'territoryId',
            'jobId',
            'applicationId',
            'noticeId',
            'documentId',
            'leaveId',
            'payrollId',
            'approvalId',
            'requestId',
        ];
        for (const source of sources) {
            if (typeof source === 'string' && source.trim()) {
                return source.trim();
            }
            if (typeof source !== 'object')
                continue;
            for (const key of keys) {
                const value = source?.[key];
                const normalized = this.normalizeId(value);
                if (normalized)
                    return normalized;
            }
        }
        return undefined;
    }
    resolveScopeEntityId(req) {
        const sources = [req?.params, req?.body, req?.query].filter(Boolean);
        const keys = [
            'entity',
            'entityId',
            'subsidiaryId',
            'subsidiary',
            'tenant',
            'tenantId',
            'companyId',
            'organizationId',
        ];
        for (const source of sources) {
            if (typeof source !== 'object')
                continue;
            for (const key of keys) {
                const value = source?.[key];
                const normalized = this.normalizeId(value);
                if (normalized)
                    return normalized;
            }
        }
        const headerEntityId = this.resolveHeaderEntityId(req);
        if (headerEntityId)
            return headerEntityId;
        const fallback = req?.user?.entity ?? req?.user?.subsidiary;
        return this.normalizeId(fallback);
    }
    resolveHeaderEntityId(req) {
        const raw = req?.headers?.['x-subsidiary-id'] ??
            req?.headers?.['x-entity-id'] ??
            req?.headers?.['x-selected-entity-id'];
        if (Array.isArray(raw)) {
            return this.normalizeId(raw[0]);
        }
        return this.normalizeId(raw);
    }
    normalizeId(value) {
        if (!value)
            return undefined;
        if (typeof value === 'string') {
            const trimmed = value.trim();
            return trimmed.length ? trimmed : undefined;
        }
        if (typeof value === 'object') {
            const nested = value?._id ?? value?.id;
            if (nested && nested !== value) {
                return this.normalizeId(nested);
            }
        }
        if (typeof value?.toString === 'function') {
            const resolved = String(value).trim();
            return resolved && resolved !== '[object Object]' ? resolved : undefined;
        }
        return undefined;
    }
    resolveIp(req) {
        const forwarded = req?.headers?.['x-forwarded-for'];
        if (typeof forwarded === 'string' && forwarded.trim()) {
            return forwarded.split(',')[0].trim();
        }
        if (Array.isArray(forwarded) && forwarded.length) {
            return String(forwarded[0]);
        }
        if (typeof req?.ip === 'string' && req.ip.trim()) {
            return req.ip.trim();
        }
        return undefined;
    }
    resolveUserAgent(req) {
        const agent = req?.headers?.['user-agent'];
        return typeof agent === 'string' && agent.trim() ? agent.trim() : undefined;
    }
    normalizePayload(value) {
        const sanitized = this.sanitizePayload(value, 0);
        if (this.isEmptyPayload(sanitized))
            return undefined;
        return sanitized;
    }
    isEmptyPayload(value) {
        if (value === null || value === undefined)
            return true;
        if (Array.isArray(value))
            return value.length === 0;
        if (typeof value === 'object')
            return Object.keys(value).length === 0;
        return false;
    }
    sanitizePayload(value, depth) {
        if (value === null || value === undefined)
            return value;
        if (depth > MAX_DEPTH)
            return '[Truncated]';
        if (typeof value === 'string') {
            if (value.length > MAX_STRING) {
                return `${value.slice(0, MAX_STRING)}...(truncated)`;
            }
            return value;
        }
        if (typeof value === 'number' || typeof value === 'boolean')
            return value;
        if (value instanceof Date)
            return value.toISOString();
        if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) {
            return `[buffer ${value.length} bytes]`;
        }
        if (Array.isArray(value)) {
            const trimmed = value.slice(0, MAX_ARRAY).map((item) => this.sanitizePayload(item, depth + 1));
            if (value.length > MAX_ARRAY) {
                trimmed.push(`...(truncated ${value.length - MAX_ARRAY} more)`);
            }
            return trimmed;
        }
        if (typeof value === 'object') {
            if (typeof value?.toJSON === 'function') {
                try {
                    return this.sanitizePayload(value.toJSON(), depth + 1);
                }
                catch {
                    return '[Unserializable]';
                }
            }
            const output = {};
            Object.entries(value).forEach(([key, entry]) => {
                if (this.shouldRedactKey(key)) {
                    output[key] = '[REDACTED]';
                }
                else {
                    output[key] = this.sanitizePayload(entry, depth + 1);
                }
            });
            return output;
        }
        return String(value);
    }
    shouldRedactKey(key) {
        const normalized = key.trim().toLowerCase();
        if (!normalized)
            return false;
        if (REDACT_KEYS.has(normalized))
            return true;
        return REDACT_PARTIALS.some((segment) => normalized.includes(segment));
    }
    resolveErrorMessage(error) {
        if (!error)
            return 'Request failed';
        if (typeof error === 'string')
            return error;
        if (Array.isArray(error?.response?.message)) {
            return error.response.message.join(', ');
        }
        if (typeof error?.response?.message === 'string') {
            return error.response.message;
        }
        if (typeof error?.message === 'string')
            return error.message;
        return 'Request failed';
    }
};
exports.AuditLogInterceptor = AuditLogInterceptor;
exports.AuditLogInterceptor = AuditLogInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [audit_log_service_1.AuditLogService])
], AuditLogInterceptor);
//# sourceMappingURL=audit-log.interceptor.js.map