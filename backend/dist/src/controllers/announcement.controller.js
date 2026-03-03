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
exports.AnnouncementController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const announcement_service_1 = require("../services/announcement.service");
let AnnouncementController = class AnnouncementController {
    constructor(announcementService) {
        this.announcementService = announcementService;
    }
    async findAll(req, limit, pinned, includeExpired, search, includeAllAudiences) {
        const entityRef = req?.user?.entity;
        const entityId = typeof entityRef === "object" && entityRef?._id ? String(entityRef._id) :
            entityRef ? String(entityRef) :
                undefined;
        return this.announcementService.findAll({
            limit: limit ? Number(limit) : undefined,
            pinned: pinned != null ? pinned === "true" : undefined,
            includeExpired: includeExpired === "true",
            search: search?.trim() || undefined,
            entityId,
            includeAllAudiences: includeAllAudiences === "true",
        });
    }
    async create(body) {
        return this.announcementService.create(body);
    }
};
exports.AnnouncementController = AnnouncementController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)("limit")),
    __param(2, (0, common_1.Query)("pinned")),
    __param(3, (0, common_1.Query)("includeExpired")),
    __param(4, (0, common_1.Query)("search")),
    __param(5, (0, common_1.Query)("includeAllAudiences")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AnnouncementController.prototype, "findAll", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnnouncementController.prototype, "create", null);
exports.AnnouncementController = AnnouncementController = __decorate([
    (0, common_1.Controller)("announcements"),
    __metadata("design:paramtypes", [announcement_service_1.AnnouncementService])
], AnnouncementController);
//# sourceMappingURL=announcement.controller.js.map