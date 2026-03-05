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
exports.DocumentLibraryController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const fs = require("fs");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const document_library_service_1 = require("../services/document-library.service");
let DocumentLibraryController = class DocumentLibraryController {
    constructor(documentService) {
        this.documentService = documentService;
    }
    ensureUploadDir() {
        const dir = (0, path_1.join)(process.cwd(), 'uploads', 'documents');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        return dir;
    }
    async listDocuments(req, search, category, owner, featured, excludeEmployeeDocuments, page, limit) {
        return this.documentService.listDocuments(req?.user, { search, category, owner, featured, excludeEmployeeDocuments }, Number(page), Number(limit));
    }
    async categories(req, excludeEmployeeDocuments) {
        return this.documentService.getCategories(req?.user, excludeEmployeeDocuments);
    }
    async getDocument(req, id) {
        return this.documentService.getDocument(req?.user, id);
    }
    async createDocument(req, body, file) {
        this.ensureUploadDir();
        const fileUrl = file ? `uploads/documents/${file.filename}` : body?.fileUrl;
        return this.documentService.createDocument(req?.user, {
            ...body,
            fileUrl,
            fileType: file?.mimetype ?? body?.fileType,
            fileSize: file?.size ?? body?.fileSize,
            versions: body?.versions,
            version: body?.version,
        });
    }
    async updateDocument(req, id, body, file) {
        const updatePayload = { ...body };
        const suppliedFileUrl = typeof body?.fileUrl === 'string' && body.fileUrl.trim()
            ? body.fileUrl.trim()
            : undefined;
        if (file) {
            updatePayload.fileUrl = `uploads/documents/${file.filename}`;
            updatePayload.fileType = file.mimetype;
            updatePayload.fileSize = file.size;
        }
        else if (suppliedFileUrl) {
            updatePayload.fileUrl = suppliedFileUrl;
            if (body?.fileType)
                updatePayload.fileType = body.fileType;
            if (body?.fileSize !== undefined)
                updatePayload.fileSize = body.fileSize;
        }
        return this.documentService.updateDocument(req?.user, id, updatePayload);
    }
    async deleteDocument(req, id) {
        return this.documentService.deleteDocument(req?.user, id);
    }
};
exports.DocumentLibraryController = DocumentLibraryController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('search')),
    __param(2, (0, common_1.Query)('category')),
    __param(3, (0, common_1.Query)('owner')),
    __param(4, (0, common_1.Query)('featured')),
    __param(5, (0, common_1.Query)('excludeEmployeeDocuments')),
    __param(6, (0, common_1.Query)('page')),
    __param(7, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], DocumentLibraryController.prototype, "listDocuments", null);
__decorate([
    (0, common_1.Get)('categories'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('excludeEmployeeDocuments')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DocumentLibraryController.prototype, "categories", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DocumentLibraryController.prototype, "getDocument", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: (_req, _file, cb) => {
                const dir = (0, path_1.join)(process.cwd(), 'uploads', 'documents');
                if (!fs.existsSync(dir))
                    fs.mkdirSync(dir, { recursive: true });
                cb(null, dir);
            },
            filename: (_req, file, cb) => {
                const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                const ext = (0, path_1.extname)(file.originalname);
                cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
            },
        }),
    })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentLibraryController.prototype, "createDocument", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: (_req, _file, cb) => {
                const dir = (0, path_1.join)(process.cwd(), 'uploads', 'documents');
                if (!fs.existsSync(dir))
                    fs.mkdirSync(dir, { recursive: true });
                cb(null, dir);
            },
            filename: (_req, file, cb) => {
                const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                const ext = (0, path_1.extname)(file.originalname);
                cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
            },
        }),
    })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentLibraryController.prototype, "updateDocument", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DocumentLibraryController.prototype, "deleteDocument", null);
exports.DocumentLibraryController = DocumentLibraryController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('documents'),
    __metadata("design:paramtypes", [document_library_service_1.DocumentLibraryService])
], DocumentLibraryController);
//# sourceMappingURL=document.controller.js.map