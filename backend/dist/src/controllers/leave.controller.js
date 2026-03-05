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
exports.LeaveController = void 0;
const common_1 = require("@nestjs/common");
const leave_service_1 = require("../services/leave.service");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const fs = require("fs");
const path = require("path");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const user_decorator_1 = require("../auth/decorators/user.decorator");
let LeaveController = class LeaveController {
    constructor(leaveService) {
        this.leaveService = leaveService;
    }
    async findHolidays() {
        return this.leaveService.getHolidays();
    }
    async createHoliday(body) {
        return this.leaveService.createHoliday(body ?? {});
    }
    async updateHolidays() {
        return this.leaveService.updateHolidays();
    }
    async updateHolidayName(id, name) {
        return this.leaveService.updateHolidayName(id, name);
    }
    async deleteHoliday(id) {
        return this.leaveService.deleteHoliday(id);
    }
    async findLeavesPaginated(page, limit, role, entity, searchQuery, supervisorId, supervisorScope, relieverId, createdFrom, createdTo, status, statusStage, user) {
        const supervisorFilter = supervisorScope ?? supervisorId;
        return this.leaveService.findLeavesPaginated(page, limit, role, entity, searchQuery, supervisorFilter, supervisorScope, relieverId, createdFrom, createdTo, status, statusStage, user);
    }
    async createLeave(leaveData, file) {
        const fileUrl = file ? `uploads/${file.filename}` : undefined;
        const createdLeave = await this.leaveService.createLeave({
            ...leaveData,
            ...(fileUrl ? { handoverNoteUrl: fileUrl } : {}),
        });
        return {
            message: 'Leave created successfully',
            data: createdLeave,
        };
    }
    async findAllLeaves() {
        return this.leaveService.findAllLeaves();
    }
    async getSettings() {
        return this.leaveService.getLeaveSettings();
    }
    async listMappings() {
        return this.leaveService.listLeaveMappings();
    }
    async upsertMapping(body, user) {
        return this.leaveService.upsertLeaveMapping(user, body ?? {});
    }
    async updateSettings(body) {
        return this.leaveService.updateLeaveSettings(body ?? {});
    }
    async findLeaveByUser(id, year) {
        const queryYear = year ? parseInt(year) : new Date().getFullYear();
        return this.leaveService.findLeaveByUser(id, queryYear);
    }
    async findApprovedByUser(id, year, type) {
        const queryYear = year ? parseInt(year) : new Date().getFullYear();
        return this.leaveService.findApprovedByUser(id, queryYear, type);
    }
    async getUserEntitlements(userId) {
        return this.leaveService.getUserEntitlements(userId);
    }
    async approveLeave(id, type, approverId, status, comment) {
        const safeType = type ?? 'reliever';
        const action = status?.toLowerCase() === 'rejected' ? 'reject' : 'approve';
        return this.leaveService.approveLeave(id, safeType, approverId, action, comment);
    }
    async reassignSupervisorApprover(id, supervisorId, approverId, hodApproval, user) {
        const targetId = supervisorId ?? approverId ?? hodApproval;
        return this.leaveService.reassignSupervisorApprover(id, targetId, user);
    }
    async reassignRelieverApprover(id, relieverId, relievingOfficer, approverId, user) {
        const targetId = relieverId ?? relievingOfficer ?? approverId;
        return this.leaveService.reassignRelieverApprover(id, targetId, user);
    }
    async nudgeLeaveApprover(id, user) {
        return this.leaveService.nudgeLeaveApprover(id, user);
    }
    async findLeaveById(id) {
        return this.leaveService.findLeaveById(id);
    }
    async updateLeave(id, updateData) {
        return this.leaveService.updateLeave(id, updateData);
    }
    async deleteLeave(id) {
        return this.leaveService.deleteLeave(id);
    }
};
exports.LeaveController = LeaveController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('holidays'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "findHolidays", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('holidays'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "createHoliday", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('updateHolidays'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "updateHolidays", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Put)('holidays/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "updateHolidayName", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Delete)('holidays/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "deleteHoliday", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('paginated'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('role')),
    __param(3, (0, common_1.Query)('entity')),
    __param(4, (0, common_1.Query)('search')),
    __param(5, (0, common_1.Query)('supervisorId')),
    __param(6, (0, common_1.Query)('supervisorScope')),
    __param(7, (0, common_1.Query)('relieverId')),
    __param(8, (0, common_1.Query)('createdFrom')),
    __param(9, (0, common_1.Query)('createdTo')),
    __param(10, (0, common_1.Query)('status')),
    __param(11, (0, common_1.Query)('statusStage')),
    __param(12, (0, user_decorator_1.UserOne)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, Object, String, String, String, String, String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "findLeavesPaginated", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('handoverNote', {
        storage: (0, multer_1.diskStorage)({
            destination: (req, file, cb) => {
                const uploadDir = path.join(process.cwd(), 'uploads');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }
                cb(null, uploadDir);
            },
            filename: (req, file, cb) => {
                const ext = file?.originalname ? path.extname(file?.originalname) : '';
                const filename = `mpas-${Date.now()}${ext}`;
                cb(null, filename);
            },
        }),
    })),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "createLeave", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "findAllLeaves", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('settings'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "getSettings", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('mappings'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "listMappings", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('mappings'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, user_decorator_1.UserOne)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "upsertMapping", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Put)('settings'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('user/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "findLeaveByUser", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('approved/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "findApprovedByUser", null);
__decorate([
    (0, common_1.Get)('entitled/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "getUserEntitlements", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('approve/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('type')),
    __param(2, (0, common_1.Body)('approverId')),
    __param(3, (0, common_1.Body)('status')),
    __param(4, (0, common_1.Body)('comment')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "approveLeave", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':id/reassign-supervisor'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('supervisorId')),
    __param(2, (0, common_1.Body)('approverId')),
    __param(3, (0, common_1.Body)('hodApproval')),
    __param(4, (0, user_decorator_1.UserOne)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "reassignSupervisorApprover", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':id/reassign-reliever'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('relieverId')),
    __param(2, (0, common_1.Body)('relievingOfficer')),
    __param(3, (0, common_1.Body)('approverId')),
    __param(4, (0, user_decorator_1.UserOne)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "reassignRelieverApprover", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':id/nudge'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, user_decorator_1.UserOne)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "nudgeLeaveApprover", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "findLeaveById", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "updateLeave", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "deleteLeave", null);
exports.LeaveController = LeaveController = __decorate([
    (0, common_1.Controller)('leaves'),
    __metadata("design:paramtypes", [leave_service_1.LeaveService])
], LeaveController);
//# sourceMappingURL=leave.controller.js.map