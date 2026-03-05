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
exports.TransportAllowanceController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const user_decorator_1 = require("../auth/decorators/user.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const transport_allowance_service_1 = require("../services/transport-allowance.service");
const spreadsheet_util_1 = require("../utils/spreadsheet.util");
let TransportAllowanceController = class TransportAllowanceController {
    constructor(transportAllowanceService) {
        this.transportAllowanceService = transportAllowanceService;
    }
    list(entity, department, staff, year, month, weekOfMonth) {
        return this.transportAllowanceService.list({
            entity,
            department,
            staff,
            year,
            month,
            weekOfMonth,
        });
    }
    listSettings(entity, transportLevel, page, limit) {
        return this.transportAllowanceService.listSettings({
            entity,
            transportLevel,
            page,
            limit,
        });
    }
    upsertSetting(payload) {
        return this.transportAllowanceService.upsertSetting(payload);
    }
    async bulkUpsertSettings(file, entity) {
        if (!file?.buffer?.length) {
            throw new common_1.BadRequestException('Upload a valid spreadsheet file.');
        }
        const normalizedName = String(file?.originalname ?? '').toLowerCase();
        if (normalizedName.endsWith('.xls')) {
            throw new common_1.BadRequestException('Legacy .xls files are not supported. Please save as .xlsx or .csv.');
        }
        let parsedRows = [];
        if (normalizedName.endsWith('.csv')) {
            parsedRows = (0, spreadsheet_util_1.csvBufferToObjects)(file.buffer, { defval: '', trim: true }).rows;
        }
        else {
            try {
                const workbook = await (0, spreadsheet_util_1.loadWorkbook)(file.buffer, file.originalname);
                const sheet = (0, spreadsheet_util_1.getFirstWorksheet)(workbook);
                if (!sheet) {
                    throw new common_1.BadRequestException('No worksheet found in uploaded file.');
                }
                parsedRows = (0, spreadsheet_util_1.worksheetToObjects)(sheet, { defval: '', useText: true }).rows;
            }
            catch (error) {
                const fallback = (0, spreadsheet_util_1.csvBufferToObjects)(file.buffer, { defval: '', trim: true }).rows;
                if (!fallback.length) {
                    throw error;
                }
                parsedRows = fallback;
            }
        }
        const rows = parsedRows
            .map((row) => {
            const normalized = {};
            Object.entries(row ?? {}).forEach(([key, value]) => {
                const header = String(key ?? '')
                    .trim()
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '_')
                    .replace(/^_+|_+$/g, '');
                if (!header)
                    return;
                normalized[header] = String(value ?? '').trim();
            });
            return normalized;
        })
            .filter((row) => Object.keys(row).length > 0);
        if (!rows.length) {
            throw new common_1.BadRequestException('Spreadsheet must include headers and at least one row.');
        }
        return this.transportAllowanceService.bulkUpsertSettings(rows, { entity });
    }
    deleteSetting(id) {
        return this.transportAllowanceService.deleteSetting(id);
    }
    getWorkflowConfigs(entity) {
        return this.transportAllowanceService.getWorkflowConfigs(entity);
    }
    saveWorkflowConfig(payload) {
        return this.transportAllowanceService.saveWorkflowConfig(payload);
    }
    upsert(payload) {
        return this.transportAllowanceService.upsert(payload);
    }
    preview(payload) {
        return this.transportAllowanceService.preview(payload);
    }
    generate(payload) {
        return this.transportAllowanceService.generate(payload);
    }
    submit(payload, user) {
        return this.transportAllowanceService.submitForReview(payload, user);
    }
    approvals(user, status, entity, assignedOnly, userId, assignedId) {
        const assignedOnlyFlag = typeof assignedOnly === 'string' &&
            ['1', 'true', 'yes'].includes(assignedOnly.toLowerCase());
        return this.transportAllowanceService.getApprovals(user, {
            status,
            entity,
            assignedOnly: assignedOnlyFlag,
            assignedId: userId ?? assignedId,
        });
    }
    getApprovalById(id, user) {
        return this.transportAllowanceService.getApprovalById(id, user);
    }
    approveApproval(id, comment, user) {
        return this.transportAllowanceService.approveApproval(id, user, comment);
    }
    rejectApproval(id, reason, user) {
        return this.transportAllowanceService.rejectApproval(id, user, reason);
    }
    markPosted(id, user) {
        return this.transportAllowanceService.markPostingComplete(id, user);
    }
    getWorkflowRole(user, entity, scanAll) {
        const scanAllFlag = typeof scanAll === 'string' && ['1', 'true', 'yes'].includes(scanAll.toLowerCase());
        return this.transportAllowanceService.getWorkflowRole(user, {
            entity,
            scanAll: scanAllFlag,
        });
    }
};
exports.TransportAllowanceController = TransportAllowanceController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('entity')),
    __param(1, (0, common_1.Query)('department')),
    __param(2, (0, common_1.Query)('staff')),
    __param(3, (0, common_1.Query)('year')),
    __param(4, (0, common_1.Query)('month')),
    __param(5, (0, common_1.Query)('weekOfMonth')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], TransportAllowanceController.prototype, "list", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('settings'),
    __param(0, (0, common_1.Query)('entity')),
    __param(1, (0, common_1.Query)('transportLevel')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], TransportAllowanceController.prototype, "listSettings", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('settings'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TransportAllowanceController.prototype, "upsertSetting", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('settings/bulk'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('entity')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TransportAllowanceController.prototype, "bulkUpsertSettings", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Delete)('settings/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TransportAllowanceController.prototype, "deleteSetting", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('workflow-configs'),
    __param(0, (0, common_1.Query)('entity')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TransportAllowanceController.prototype, "getWorkflowConfigs", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('workflow-configs'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TransportAllowanceController.prototype, "saveWorkflowConfig", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TransportAllowanceController.prototype, "upsert", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('preview'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TransportAllowanceController.prototype, "preview", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('generate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TransportAllowanceController.prototype, "generate", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('submit'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, user_decorator_1.UserOne)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], TransportAllowanceController.prototype, "submit", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('approvals'),
    __param(0, (0, user_decorator_1.UserOne)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('entity')),
    __param(3, (0, common_1.Query)('assignedOnly')),
    __param(4, (0, common_1.Query)('userId')),
    __param(5, (0, common_1.Query)('assignedId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], TransportAllowanceController.prototype, "approvals", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('approvals/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, user_decorator_1.UserOne)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TransportAllowanceController.prototype, "getApprovalById", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('approvals/:id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('comment')),
    __param(2, (0, user_decorator_1.UserOne)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], TransportAllowanceController.prototype, "approveApproval", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('approvals/:id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('reason')),
    __param(2, (0, user_decorator_1.UserOne)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], TransportAllowanceController.prototype, "rejectApproval", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('approvals/:id/mark-posted'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, user_decorator_1.UserOne)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TransportAllowanceController.prototype, "markPosted", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('workflow-role'),
    __param(0, (0, user_decorator_1.UserOne)()),
    __param(1, (0, common_1.Query)('entity')),
    __param(2, (0, common_1.Query)('scanAll')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], TransportAllowanceController.prototype, "getWorkflowRole", null);
exports.TransportAllowanceController = TransportAllowanceController = __decorate([
    (0, common_1.Controller)('transport-allowance'),
    __metadata("design:paramtypes", [transport_allowance_service_1.TransportAllowanceService])
], TransportAllowanceController);
//# sourceMappingURL=transport-allowance.controller.js.map