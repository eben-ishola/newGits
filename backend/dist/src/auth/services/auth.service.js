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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const supervisor_util_1 = require("../../utils/supervisor.util");
const additional_roles_util_1 = require("../../utils/additional-roles.util");
const mail_service_1 = require("../../services/mail.service");
const PASSWORD_RESET_TOKEN_TTL_MS = 1000 * 60 * 60;
let AuthService = class AuthService {
    constructor(staffModel, jwtService, mailService) {
        this.staffModel = staffModel;
        this.jwtService = jwtService;
        this.mailService = mailService;
    }
    async validateUser(identifier, password) {
        const normalizedIdentifier = (identifier || '').trim();
        if (!normalizedIdentifier) {
            return null;
        }
        const lookup = this.buildIdentifierQuery(normalizedIdentifier);
        const authRecord = await this.staffModel
            .findOne(lookup)
            .select({ password: 1 })
            .collation(this.getAuthCollation())
            .lean();
        if (!authRecord?.password) {
            return null;
        }
        const isValid = await bcrypt.compare(password, authRecord.password);
        if (!isValid) {
            return null;
        }
        const user = await this.staffModel
            .findById(authRecord._id)
            .select('-password -__v')
            .populate([
            {
                path: 'role',
                skipInvalidIds: true,
                populate: {
                    path: 'permissions',
                    skipInvalidIds: true,
                },
            },
            {
                path: 'businessUnit',
                populate: {
                    path: 'territory',
                },
            },
            {
                path: 'department',
            },
            {
                path: 'additionalRoles',
                options: { lean: true },
                populate: [
                    {
                        path: 'role',
                        options: { lean: true },
                        skipInvalidIds: true,
                        populate: { path: 'permissions', options: { lean: true }, skipInvalidIds: true },
                    },
                    { path: 'entity', options: { lean: true }, skipInvalidIds: true },
                ],
            },
        ])
            .lean();
        if (!user) {
            return null;
        }
        await (0, supervisor_util_1.injectSupervisorMetadata)(this.staffModel, user);
        return user;
    }
    buildIdentifierQuery(identifier) {
        return {
            $or: [
                { email: identifier },
                { staffId: identifier },
            ],
        };
    }
    getAuthCollation() {
        return { locale: 'en', strength: 2 };
    }
    isDefaultPassword(value) {
        const normalized = value.trim().toLowerCase();
        return normalized === 'addosser' || normalized === 'addoser';
    }
    async signIn(rawIdentifier, password) {
        const identifier = (rawIdentifier ?? '').trim();
        const normalizedPassword = typeof password === 'string' ? password : '';
        if (!identifier || !normalizedPassword) {
            throw new common_1.UnauthorizedException('Invalid credentials.');
        }
        const user = await this.validateUser(identifier, normalizedPassword);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials.');
        }
        const safeUser = this.sanitizeUser(user);
        const payload = {
            sub: safeUser.id,
            email: safeUser.email ?? undefined,
            staffId: safeUser.staffId ?? undefined,
        };
        const accessToken = await this.jwtService.signAsync(payload);
        const isDefault = this.isDefaultPassword(normalizedPassword);
        return {
            accessToken,
            access_token: accessToken,
            user: safeUser,
            default: isDefault,
        };
    }
    async changePassword(userId, currentPassword, newPassword) {
        if (!userId) {
            throw new common_1.UnauthorizedException('User context is missing.');
        }
        if (!currentPassword || !newPassword) {
            throw new common_1.BadRequestException('Current and new passwords are required.');
        }
        if (currentPassword === newPassword) {
            throw new common_1.BadRequestException('New password must differ from the current password.');
        }
        const user = await this.staffModel.findById(userId);
        if (!user) {
            throw new common_1.UnauthorizedException('User not found.');
        }
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Current password is incorrect.');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();
        return { message: 'Password updated successfully.' };
    }
    buildEmailQuery(email) {
        return (email ?? '').trim();
    }
    getPortalBaseUrl() {
        const candidates = [
            process.env.HR_PORTAL_WEB_URL,
            process.env.HR_PORTAL_BASE_URL,
            process.env.FRONTEND_BASE_URL,
            process.env.FRONTEND_URL,
        ];
        const fallback = 'https://hrms.addosser.com';
        const base = candidates.find((value) => typeof value === 'string' && value.trim().length > 0) ?? fallback;
        return base.replace(/\/+$/, '');
    }
    async requestPasswordReset(email) {
        const normalizedEmail = (email ?? '').trim();
        if (!normalizedEmail) {
            throw new common_1.BadRequestException('Email is required.');
        }
        const user = await this.staffModel
            .findOne({ email: this.buildEmailQuery(normalizedEmail) })
            .collation(this.getAuthCollation());
        if (!user || !user.email) {
            return { sent: true };
        }
        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
        user.passwordResetToken = hashedToken;
        user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
        user.passwordResetRequestedAt = new Date();
        user.passwordResetRequestedBy = null;
        await user.save();
        const resetLink = `${this.getPortalBaseUrl()}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
        const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;
        try {
            await this.mailService?.sendMail({
                to: user.email,
                templateType: 'password-reset-request',
                templateVariables: {
                    fullName,
                    resetLink,
                    expiresAt: user.passwordResetExpires?.toISOString() ?? null,
                },
            });
        }
        catch {
        }
        return { sent: true };
    }
    async getResetUser(email, token) {
        const normalizedEmail = (email ?? '').trim();
        const normalizedToken = (token ?? '').trim();
        if (!normalizedEmail || !normalizedToken) {
            throw new common_1.BadRequestException('Reset token and email are required.');
        }
        const hashedToken = crypto.createHash('sha256').update(normalizedToken).digest('hex');
        const user = await this.staffModel
            .findOne({
            email: this.buildEmailQuery(normalizedEmail),
            passwordResetToken: hashedToken,
        })
            .collation(this.getAuthCollation());
        if (!user) {
            throw new common_1.BadRequestException('Invalid or expired reset link.');
        }
        if (!user.passwordResetExpires || user.passwordResetExpires.getTime() < Date.now()) {
            throw new common_1.BadRequestException('Reset link has expired.');
        }
        return user;
    }
    async verifyPasswordReset(email, token) {
        const user = await this.getResetUser(email, token);
        return {
            valid: true,
            email: user.email ?? email ?? null,
            expiresAt: user.passwordResetExpires?.toISOString() ?? null,
        };
    }
    async resetPasswordWithToken(email, token, newPassword) {
        const nextPassword = typeof newPassword === 'string' ? newPassword.trim() : '';
        if (nextPassword.length < 6) {
            throw new common_1.BadRequestException('Password must be at least 6 characters.');
        }
        const user = await this.getResetUser(email, token);
        const isSame = await bcrypt.compare(nextPassword, user.password);
        if (isSame) {
            throw new common_1.BadRequestException('New password must differ from the current password.');
        }
        const hashedPassword = await bcrypt.hash(nextPassword, 10);
        user.password = hashedPassword;
        user.passwordResetToken = null;
        user.passwordResetExpires = null;
        await user.save();
        return { message: 'Password updated successfully.' };
    }
    sanitizeUser(user) {
        const plain = typeof user.toObject === 'function' ? user.toObject() : { ...user };
        const { password, __v, ...rest } = plain;
        const resolvedId = String(rest._id ?? rest.id ?? '');
        return {
            ...rest,
            id: resolvedId,
            userId: rest.userId ?? resolvedId,
        };
    }
    extractObjectIdCandidate(value) {
        if (value == null)
            return null;
        if (value instanceof mongoose_2.Types.ObjectId) {
            return value.toHexString();
        }
        if (typeof value === 'string') {
            const trimmed = value.trim();
            return trimmed.length ? trimmed : null;
        }
        if (typeof value === 'number' && Number.isFinite(value)) {
            return String(value);
        }
        if (typeof value === 'object') {
            if (typeof value?.toHexString === 'function') {
                return value.toHexString();
            }
            const fields = ['_id', 'id', 'value', '$oid'];
            for (const field of fields) {
                if (field in value) {
                    const resolved = this.extractObjectIdCandidate(value[field]);
                    if (resolved) {
                        return resolved;
                    }
                }
            }
            const stringified = value.toString?.();
            if (stringified && stringified !== '[object Object]') {
                return stringified;
            }
        }
        return null;
    }
    normalizeObjectId(value) {
        const candidate = this.extractObjectIdCandidate(value);
        if (!candidate || !mongoose_2.Types.ObjectId.isValid(candidate)) {
            return null;
        }
        return new mongoose_2.Types.ObjectId(candidate);
    }
    normalizeAdditionalRoleEntry(entry) {
        if (!entry) {
            return null;
        }
        const roleId = this.normalizeObjectId(typeof entry === 'object'
            ? entry?.role ?? entry?.roleId ?? entry?.value ?? entry
            : entry);
        if (!roleId) {
            return null;
        }
        const entityId = this.normalizeObjectId(typeof entry === 'object'
            ? entry?.entity ?? entry?.entityId ?? entry?.subsidiary ?? entry?.tenant
            : undefined);
        return {
            role: roleId,
            entity: entityId ?? null,
        };
    }
    async normalizeAndPopulateAdditionalRoles(user) {
        if (!user) {
            return;
        }
        const { assignments, mutated } = (0, additional_roles_util_1.normalizeAdditionalRoleAssignments)(user.additionalRoles);
        if (mutated) {
            await this.staffModel
                .updateOne({ _id: user._id }, {
                $set: {
                    additionalRoles: assignments.map(({ role, entity }) => ({ role, entity })),
                },
            })
                .exec();
        }
        user.additionalRoles = assignments;
        await user.populate({
            path: 'additionalRoles',
            options: { lean: true },
            populate: [
                {
                    path: 'role',
                    options: { lean: true },
                    skipInvalidIds: true,
                    populate: { path: 'permissions', options: { lean: true }, skipInvalidIds: true },
                },
                { path: 'entity', options: { lean: true }, skipInvalidIds: true },
            ],
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('User')),
    __param(2, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [mongoose_2.Model,
        jwt_1.JwtService,
        mail_service_1.MailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map