"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertUserScope = exports.userHasScope = exports.deriveUserScopes = exports.collectRoleScopes = void 0;
const common_1 = require("@nestjs/common");
const SCOPE_VALUES = ['group', 'entity', 'department', 'self', 'finance'];
const ROLE_SCOPE_PRESETS = {
    'super-admin': ['group'],
    'super admin': ['group'],
    'hr-super-admin': ['group'],
    'hr super admin': ['group'],
    gmd: ['group'],
    'group-hr-director': ['group'],
    'group hr director': ['group'],
    md: ['entity'],
    'managing-director': ['entity'],
    admin: ['group'],
    'entity hr admin': ['entity'],
    'entity-hr-admin': ['entity'],
    'people-operations-manager': ['entity'],
    'leave-manager': ['entity'],
    'leave-attendance-manager': ['entity'],
    'workflow-hr': ['entity'],
    'workflow hr': ['entity'],
    supervisor: ['department'],
    'head of department': ['department'],
    'head-of-department': ['department'],
    employee: ['self'],
    'payroll-officer': ['entity'],
    'payroll controller': ['entity'],
    'payroll-controller': ['entity'],
    'finance officer': ['entity'],
    'finance-officer': ['entity'],
    recruiter: ['entity'],
    'recruitment-onboarding-lead': ['entity'],
    'performance-manager': ['entity'],
    'performance manager': ['entity'],
    'performance-officer': ['entity'],
    'performance officer': ['entity'],
    'performance-training-partner': ['entity'],
    'performance training partner': ['entity'],
    'it-officer': ['group'],
    'system-auditor': ['entity'],
    'service-desk-agent': ['entity'],
    'document-controller': ['entity'],
    'hr-portal-operations-backup': ['entity'],
    'hr-portal-service-ally': ['entity'],
    'hr-portal-analytics-viewer': ['entity'],
    'hr-portal-ess-support': ['entity'],
};
const toArray = (value) => {
    if (Array.isArray(value))
        return value;
    return value ? [value] : [];
};
const normalizePermissionValue = (permission) => {
    if (!permission)
        return undefined;
    if (typeof permission === 'string')
        return permission.trim().toLowerCase();
    if (typeof permission?.name === 'string') {
        const name = permission.name.trim();
        return name.length ? name.toLowerCase() : undefined;
    }
    return undefined;
};
const collectPermissionNames = (source) => {
    if (!source)
        return [];
    const values = Array.isArray(source) ? source : [source];
    return values
        .map((value) => normalizePermissionValue(value))
        .filter((permission) => Boolean(permission));
};
const normalizeScopeValue = (value) => {
    if (typeof value !== 'string')
        return undefined;
    const normalized = value.trim().toLowerCase();
    return SCOPE_VALUES.find((scope) => scope === normalized);
};
const extractRoleName = (roleLike) => {
    if (!roleLike)
        return undefined;
    if (typeof roleLike === 'string')
        return roleLike;
    if (typeof roleLike?.name === 'string')
        return roleLike.name;
    if (typeof roleLike?.label === 'string')
        return roleLike.label;
    if (typeof roleLike?.role?.name === 'string')
        return roleLike.role.name;
    return undefined;
};
const collectRoleScopes = (roleLike) => {
    if (!roleLike)
        return [];
    const roleName = extractRoleName(roleLike)?.trim().toLowerCase();
    if (roleName === 'system-auditor') {
        return ROLE_SCOPE_PRESETS[roleName] ?? ['entity'];
    }
    const rawScopes = (Array.isArray(roleLike?.scopes) && roleLike.scopes.length
        ? roleLike.scopes
        : Array.isArray(roleLike?.role?.scopes)
            ? roleLike.role.scopes
            : null) ?? [];
    const normalized = rawScopes
        .map((scope) => normalizeScopeValue(scope))
        .filter((scope) => Boolean(scope));
    if (normalized.length) {
        return Array.from(new Set(normalized));
    }
    if (roleName && ROLE_SCOPE_PRESETS[roleName]) {
        return ROLE_SCOPE_PRESETS[roleName];
    }
    return [];
};
exports.collectRoleScopes = collectRoleScopes;
const deriveUserScopes = (user) => {
    const scopes = new Set();
    const permissions = new Set();
    const register = (roleLike) => {
        (0, exports.collectRoleScopes)(roleLike).forEach((scope) => scopes.add(scope));
        collectPermissionNames(roleLike?.permissions).forEach((permission) => permissions.add(permission));
    };
    collectPermissionNames(user?.permissions).forEach((permission) => permissions.add(permission));
    register(user?.role);
    toArray(user?.roles).forEach(register);
    toArray(user?.additionalRoles).forEach((assignment) => register(assignment?.role ?? assignment));
    if (permissions.has('all')) {
        SCOPE_VALUES.forEach((scope) => scopes.add(scope));
        scopes.add('group');
        scopes.add('entity');
        scopes.add('department');
    }
    if (!scopes.size) {
        scopes.add('self');
    }
    return scopes;
};
exports.deriveUserScopes = deriveUserScopes;
const userHasScope = (user, required) => {
    const scopes = (0, exports.deriveUserScopes)(user);
    const list = Array.isArray(required) ? required : [required];
    return list.some((scope) => scopes.has(scope));
};
exports.userHasScope = userHasScope;
const assertUserScope = (user, required, message = 'You do not have permission to perform this action.') => {
    if (!(0, exports.userHasScope)(user, required)) {
        throw new common_1.ForbiddenException(message);
    }
};
exports.assertUserScope = assertUserScope;
//# sourceMappingURL=access-control.util.js.map