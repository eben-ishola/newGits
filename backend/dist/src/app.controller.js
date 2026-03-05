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
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const app_service_1 = require("./app.service");
const jwt_auth_guard_1 = require("./auth/guards/jwt-auth.guard");
const user_decorator_1 = require("./auth/decorators/user.decorator");
const notice_service_1 = require("./services/notice.service");
const branch_service_1 = require("./services/branch.service");
const businessUnit_service_1 = require("./services/businessUnit.service");
const department_service_1 = require("./services/department.service");
const permission_service_1 = require("./services/permission.service");
const role_service_1 = require("./services/role.service");
const audit_write_guard_1 = require("./auth/guards/audit-write.guard");
let AppController = class AppController {
    constructor(appService, noticeService, branchService, roleService, permissionService, businessUnitService, departmentService) {
        this.appService = appService;
        this.noticeService = noticeService;
        this.branchService = branchService;
        this.roleService = roleService;
        this.permissionService = permissionService;
        this.businessUnitService = businessUnitService;
        this.departmentService = departmentService;
    }
    async getRecent(user) {
        const userId = user._id;
        return this.noticeService.getRecentNotices(userId);
    }
    getHello() {
        return this.appService.getHello();
    }
    async getAllDepartments(entity) {
        try {
            return await this.departmentService.findDepartmentes(entity);
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    async getDepartments(page = 1, limit = 10, search = '', entity = '') {
        try {
            return await this.departmentService.findAllDepartment(Number(page), Number(limit), search ?? '', entity ?? '');
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    async createDepartment(payload) {
        return this.departmentService.createDepartment(payload);
    }
    async updateDepartment(id, payload) {
        return this.departmentService.updateDepartment(id, payload);
    }
    async getAllBusinessUnits() {
        try {
            return await this.businessUnitService.findBusinessUnites();
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    async getAllRolesPublic(app) {
        try {
            return await this.roleService.findRoles(app);
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    async getPortalRoles(app) {
        try {
            return await this.roleService.fetchPrimaryAndAdditionalRoles(app);
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    async getNonPortalRolesPublic(entity, page, limit, search) {
        try {
            const parsedPage = Number(page);
            const parsedLimit = Number(limit);
            return await this.roleService.findNonPortalRoles(entity, Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1, Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10, search);
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    async getRolesList(entity) {
        try {
            return await this.roleService.nonPortalRoles(entity);
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    async getAllBranchesPublic(entity) {
        try {
            return await this.branchService.findBranches(entity);
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    async findRemote(query) {
        const { searchText, page, limit, startDate, endDate } = query;
        return await this.appService.fetchRemote({
            searchText,
            page,
            limit,
            startDate,
            endDate
        });
    }
    async findIdleTime() {
        return await this.appService.idleTime();
    }
    async findAllBranches(page = 1, limit = 10, searchText = '', entity) {
        try {
            return await this.branchService.findAllBranch(page, limit, searchText, entity);
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    async findAllRoles(page = 1, limit = 10, searchText = '', app) {
        try {
            return await this.roleService.findAllRoles(page, limit, searchText, app);
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    async findAllPermissions(page = 1, limit = 10, searchText = '') {
        try {
            return await this.permissionService.findAllPermissions(page, limit, searchText);
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    async findPermissions() {
        try {
            return await this.permissionService.findPermissions();
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    async findAllBusinessUnits(page = 1, limit = 10, searchText = '') {
        try {
            return await this.businessUnitService.findAllBusinessUnit(page, limit, searchText);
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    async createBranch(createBranchDto) {
        return await this.branchService.createBranch(createBranchDto);
    }
    async createRole(createRoleDto) {
        return await this.roleService.createRole(createRoleDto);
    }
    async createPermission(createPermissionDto) {
        return await this.permissionService.createPermission(createPermissionDto);
    }
    async createBusinessUnit(createBusinessUnitDto) {
        return await this.businessUnitService.createBusinessUnit(createBusinessUnitDto);
    }
    async editBusinessUnit(id, updateBusinessUnitDto) {
        return await this.businessUnitService.updateBusinessUnit(id, updateBusinessUnitDto);
    }
    async editPermission(id, updatePermissionDto) {
        return await this.permissionService.updatePermission(id, updatePermissionDto);
    }
    async editRole(id, updateRoleDto) {
        return await this.roleService.updateRole(id, updateRoleDto);
    }
    async editBranch(id, updateBranchDto) {
        return await this.branchService.updateBranch(id, updateBranchDto);
    }
    async markAsRead(id) {
        return this.noticeService.markAsRead(id);
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('notices/recent'),
    __param(0, (0, user_decorator_1.UserOne)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getRecent", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], AppController.prototype, "getHello", null);
__decorate([
    (0, common_1.Get)('departments/all'),
    __param(0, (0, common_1.Query)('entity')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getAllDepartments", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('departments'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('search')),
    __param(3, (0, common_1.Query)('entity')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getDepartments", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, audit_write_guard_1.AuditWriteGuard),
    (0, common_1.Post)('departments'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "createDepartment", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, audit_write_guard_1.AuditWriteGuard),
    (0, common_1.Patch)('departments/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "updateDepartment", null);
__decorate([
    (0, common_1.Get)('business_unit/allUnits'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getAllBusinessUnits", null);
__decorate([
    (0, common_1.Get)('roles/AllRoles'),
    __param(0, (0, common_1.Query)('app')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getAllRolesPublic", null);
__decorate([
    (0, common_1.Get)('roles/portal'),
    __param(0, (0, common_1.Query)('app')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getPortalRoles", null);
__decorate([
    (0, common_1.Get)('roles/nonPortal'),
    __param(0, (0, common_1.Query)('entity')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getNonPortalRolesPublic", null);
__decorate([
    (0, common_1.Get)('roles/list'),
    __param(0, (0, common_1.Query)('entity')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getRolesList", null);
__decorate([
    (0, common_1.Get)('branches/all'),
    __param(0, (0, common_1.Query)('entity')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getAllBranchesPublic", null);
__decorate([
    (0, common_1.Get)('remoteAuditFetch'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "findRemote", null);
__decorate([
    (0, common_1.Get)('idleTime'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "findIdleTime", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('findAllBranches'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('searchText')),
    __param(3, (0, common_1.Query)('entity')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "findAllBranches", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('findAllRoles'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('searchText')),
    __param(3, (0, common_1.Query)('app')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "findAllRoles", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('findAllPermissions'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('searchText')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "findAllPermissions", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('permissions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "findPermissions", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('findAllBusinessUnits'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('searchText')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "findAllBusinessUnits", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, audit_write_guard_1.AuditWriteGuard),
    (0, common_1.Post)('createBranch'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "createBranch", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, audit_write_guard_1.AuditWriteGuard),
    (0, common_1.Post)('createRole'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "createRole", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, audit_write_guard_1.AuditWriteGuard),
    (0, common_1.Post)('createPermission'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "createPermission", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, audit_write_guard_1.AuditWriteGuard),
    (0, common_1.Post)('createBusinessUnit'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "createBusinessUnit", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, audit_write_guard_1.AuditWriteGuard),
    (0, common_1.Post)('editBusinessUnit/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "editBusinessUnit", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, audit_write_guard_1.AuditWriteGuard),
    (0, common_1.Post)('editPermission/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "editPermission", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, audit_write_guard_1.AuditWriteGuard),
    (0, common_1.Post)('editRole/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "editRole", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, audit_write_guard_1.AuditWriteGuard),
    (0, common_1.Post)('editBranch/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "editBranch", null);
__decorate([
    (0, common_1.Post)('notices/:id/read'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "markAsRead", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [app_service_1.AppService,
        notice_service_1.NoticeService,
        branch_service_1.BranchService,
        role_service_1.RoleService,
        permission_service_1.PermissionService,
        businessUnit_service_1.BusinessUnitService,
        department_service_1.DepartmentService])
], AppController);
//# sourceMappingURL=app.controller.js.map