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
exports.StaffController = void 0;
const common_1 = require("@nestjs/common");
const user_service_1 = require("../services/user.service");
const platform_express_1 = require("@nestjs/platform-express");
const fs = require("fs");
const branch_service_1 = require("../services/branch.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const user_decorator_1 = require("../auth/decorators/user.decorator");
const path = require("path");
const multer_1 = require("multer");
const RENT_UPLOAD_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const RENT_ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'image/jpg',
    'image/jpeg',
    'image/png',
]);
const RENT_ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png']);
let StaffController = class StaffController {
    constructor(staffService, branchService) {
        this.staffService = staffService;
        this.branchService = branchService;
    }
    async getExport(subsidiaryId, branch, department, status, confirmed, searchText, supervisorScope) {
        return this.staffService.exportUser({
            subsidiaryId,
            branch,
            department,
            status,
            confirmed,
            searchText,
            supervisorScope,
        });
    }
    async createStaff(payload) {
        return this.staffService.createStaff(payload);
    }
    async getRecentlyJoined(subsidiaryId, startDate, endDate, supervisorId, supervisorScope) {
        const supervisorFilter = supervisorScope ?? supervisorId;
        return this.staffService.getRecentlyJoined(subsidiaryId, startDate, endDate, supervisorFilter);
    }
    async getRecentlyExit(subsidiaryId, startDate, endDate, supervisorId, supervisorScope) {
        const supervisorFilter = supervisorScope ?? supervisorId;
        return this.staffService.getRecentlyExit(subsidiaryId, startDate, endDate, supervisorFilter);
    }
    async getStaffTurnover(subsidiaryId, startDate, endDate) {
        return this.staffService.getStaffTurnover(subsidiaryId, startDate, endDate);
    }
    async getWorkflowSummary(type, entity, supervisorId) {
        return this.staffService.getWorkflowSummary(type, entity, supervisorId);
    }
    async getBranch(entity) {
        return this.branchService.findBranches(entity);
    }
    async approveUser(body, user) {
        return this.staffService.approveUser(body.userId, user._id, body.type, body.action ?? 'approve', body.payload);
    }
    async uploadXlsx(file, user) {
        if (!file?.buffer) {
            throw new common_1.BadRequestException('Upload a valid spreadsheet file.');
        }
        return await this.staffService.uploadXlsx(file.buffer, file.originalname, user);
    }
    async uploadSupervisor(file, authHeader) {
        if (!file?.buffer) {
            throw new common_1.BadRequestException('Upload a valid spreadsheet file.');
        }
        return await this.staffService.uploadSupervisor(file.buffer, file.originalname);
    }
    async getStaffList(subsidiaryId, supervisorScope, supervisorId) {
        const supervisorFilter = supervisorScope ?? supervisorId;
        const res = this.staffService.getStaffList2(subsidiaryId, supervisorFilter);
        return res;
    }
    async resolveStaffDirectory(body) {
        const staffIds = Array.isArray(body?.staffIds) ? body.staffIds : body?.staffId ?? [];
        const orbitIds = Array.isArray(body?.orbitIds) ? body.orbitIds : body?.orbitId ?? [];
        const combined = [].concat(staffIds, orbitIds).filter(Boolean);
        return this.staffService.resolveStaffDirectory(combined, body?.entity, {
            includeAccounts: Boolean(body?.includeAccounts),
        });
    }
    async getPaginatedStaff(query, user) {
        const res = this.staffService.getPaginatedStaff(query, user);
        return res;
    }
    async getBirthdaysToday() {
        return this.staffService.getBirthdaysToday();
    }
    async getBirthdaysThisMonth() {
        return this.staffService.getBirthdaysThisMonth();
    }
    async getAnniversaryToday() {
        return this.staffService.getWorkAnniversaryToday();
    }
    async getAnniversryThisMonth() {
        return this.staffService.getWorkAnniversaryThisMonth();
    }
    async getStaffByLevel(payGrade, authHeader, subsidiaryId) {
        return this.staffService.getStaffByLevel(payGrade, subsidiaryId);
    }
    async updateStaff(payload, id) {
        payload.id = id;
        return this.staffService.updateStaff(payload);
    }
    async updateRent(payload, id, files) {
        payload.id = id;
        const rentReceipt = files?.rentReceipt?.[0];
        const rentSupporting = files?.rentSupporting?.[0];
        const rentValue = payload?.rent != null ? String(payload.rent).trim() : "";
        const rentAmount = Number(rentValue);
        const normalizeDate = (value) => {
            if (value === null || value === undefined || value === '') {
                return null;
            }
            const parsed = new Date(value);
            if (Number.isNaN(parsed.getTime())) {
                return undefined;
            }
            return parsed;
        };
        const hasRentStart = Object.prototype.hasOwnProperty.call(payload ?? {}, 'rentStartDate') ||
            Object.prototype.hasOwnProperty.call(payload ?? {}, 'rentStart');
        if (hasRentStart) {
            const rentStart = normalizeDate(payload?.rentStartDate ?? payload?.rentStart);
            if (rentStart === null) {
                payload.rentStartDate = null;
            }
            else if (rentStart) {
                payload.rentStartDate = rentStart;
            }
            else {
                delete payload.rentStartDate;
            }
        }
        const hasRentEnd = Object.prototype.hasOwnProperty.call(payload ?? {}, 'rentEndDate') ||
            Object.prototype.hasOwnProperty.call(payload ?? {}, 'rentEnd');
        if (hasRentEnd) {
            const rentEnd = normalizeDate(payload?.rentEndDate ?? payload?.rentEnd);
            if (rentEnd === null) {
                payload.rentEndDate = null;
            }
            else if (rentEnd) {
                payload.rentEndDate = rentEnd;
            }
            else {
                delete payload.rentEndDate;
            }
        }
        if (!rentValue || !Number.isFinite(rentAmount) || rentAmount <= 0) {
            throw new common_1.BadRequestException('Rent amount is required.');
        }
        if (!rentReceipt || !rentSupporting) {
            throw new common_1.BadRequestException('Rent receipt and supporting document are required.');
        }
        payload.rentReceipt = {
            url: `uploads/rent/${rentReceipt.filename}`,
            name: rentReceipt.originalname,
            type: rentReceipt.mimetype,
            size: rentReceipt.size,
        };
        payload.rentSupporting = {
            url: `uploads/rent/${rentSupporting.filename}`,
            name: rentSupporting.originalname,
            type: rentSupporting.mimetype,
            size: rentSupporting.size,
        };
        return this.staffService.updateStaff(payload);
    }
    async resetRent(id) {
        return this.staffService.resetRent(id);
    }
    async getById(staffId) {
        let staff = this.staffService.getById(staffId);
        return staff;
    }
    async getStaffById(staffId) {
        return this.staffService.getStaffById(staffId);
    }
    async resetPassword(id, body, actingUser) {
        return this.staffService.resetPassword(id, body?.newPassword, actingUser?._id);
    }
};
exports.StaffController = StaffController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('export'),
    __param(0, (0, common_1.Query)('subsidiaryId')),
    __param(1, (0, common_1.Query)('branch')),
    __param(2, (0, common_1.Query)('department')),
    __param(3, (0, common_1.Query)('status')),
    __param(4, (0, common_1.Query)('confirmed')),
    __param(5, (0, common_1.Query)('searchText')),
    __param(6, (0, common_1.Query)('supervisorScope')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "getExport", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('create'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "createStaff", null);
__decorate([
    (0, common_1.Get)('recently-joined'),
    __param(0, (0, common_1.Query)('subsidiaryId')),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __param(3, (0, common_1.Query)('supervisorId')),
    __param(4, (0, common_1.Query)('supervisorScope')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "getRecentlyJoined", null);
__decorate([
    (0, common_1.Get)('recently-exit'),
    __param(0, (0, common_1.Query)('subsidiaryId')),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __param(3, (0, common_1.Query)('supervisorId')),
    __param(4, (0, common_1.Query)('supervisorScope')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "getRecentlyExit", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('turnover'),
    __param(0, (0, common_1.Query)('subsidiaryId')),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "getStaffTurnover", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('workflow-summary'),
    __param(0, (0, common_1.Query)('type')),
    __param(1, (0, common_1.Query)('entity')),
    __param(2, (0, common_1.Query)('supervisorId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "getWorkflowSummary", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('branchList'),
    __param(0, (0, common_1.Query)('entity')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "getBranch", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('approve'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, user_decorator_1.UserOne)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "approveUser", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('upload-xlsx'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, user_decorator_1.UserOne)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "uploadXlsx", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('upload-supervisor'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "uploadSupervisor", null);
__decorate([
    (0, common_1.Get)('list'),
    __param(0, (0, common_1.Query)('subsidiaryId')),
    __param(1, (0, common_1.Query)('supervisorScope')),
    __param(2, (0, common_1.Query)('supervisorId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "getStaffList", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('resolve'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "resolveStaffDirectory", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('paginated'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, user_decorator_1.UserOne)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "getPaginatedStaff", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('birthday/today'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "getBirthdaysToday", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('birthday/month'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "getBirthdaysThisMonth", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('anniversary/today'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "getAnniversaryToday", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('anniversary/month'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "getAnniversryThisMonth", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('level/:payGrade'),
    __param(0, (0, common_1.Param)('payGrade')),
    __param(1, (0, common_1.Headers)('authorization')),
    __param(2, (0, common_1.Query)('subsidiaryId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "getStaffByLevel", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('update/:id'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "updateStaff", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('update-rent/:id'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: 'rentReceipt', maxCount: 1 },
        { name: 'rentSupporting', maxCount: 1 },
    ], {
        storage: (0, multer_1.diskStorage)({
            destination: (_req, _file, cb) => {
                const dir = path.join(process.cwd(), 'uploads', 'rent');
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                cb(null, dir);
            },
            filename: (_req, file, cb) => {
                const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                const ext = path.extname(file.originalname);
                cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
            },
        }),
        limits: {
            fileSize: RENT_UPLOAD_MAX_FILE_SIZE_BYTES,
            files: 2,
        },
        fileFilter: (_req, file, cb) => {
            const mimeType = String(file?.mimetype ?? '').toLowerCase();
            const extension = String(path.extname(file?.originalname ?? '')).toLowerCase();
            const isMimeTypeAllowed = RENT_ALLOWED_MIME_TYPES.has(mimeType);
            const isExtensionAllowed = RENT_ALLOWED_EXTENSIONS.has(extension);
            if (!isMimeTypeAllowed || !isExtensionAllowed) {
                cb(new common_1.BadRequestException('Only PDF, JPG, JPEG, and PNG files are allowed for rent uploads.'), false);
                return;
            }
            cb(null, true);
        },
    })),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "updateRent", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('reset-rent/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "resetRent", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('byId/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "getById", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':staffId'),
    __param(0, (0, common_1.Param)('staffId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "getStaffById", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('reset-password/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, user_decorator_1.UserOne)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], StaffController.prototype, "resetPassword", null);
exports.StaffController = StaffController = __decorate([
    (0, common_1.Controller)('staff'),
    __metadata("design:paramtypes", [user_service_1.StaffService,
        branch_service_1.BranchService])
], StaffController);
//# sourceMappingURL=user.controller.js.map