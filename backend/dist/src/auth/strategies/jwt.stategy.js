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
exports.JwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_jwt_1 = require("passport-jwt");
const passport_1 = require("@nestjs/passport");
const mongoose_1 = require("mongoose");
const mongoose_2 = require("@nestjs/mongoose");
const supervisor_util_1 = require("../../utils/supervisor.util");
const additional_roles_util_1 = require("../../utils/additional-roles.util");
const USER_CACHE_TTL_MS = 60 * 1000;
const USER_CACHE_MAX = 500;
const USER_CACHE = new Map();
const buildCacheKey = (payload) => {
    const sub = typeof payload?.sub === 'string' ? payload.sub.trim() : '';
    if (sub)
        return sub;
    const email = typeof payload?.email === 'string' ? payload.email.trim().toLowerCase() : '';
    if (email)
        return email;
    const staffId = typeof payload?.staffId === 'string' ? payload.staffId.trim() : '';
    return staffId || '';
};
const readCacheEntry = (key) => {
    if (!key)
        return null;
    const cached = USER_CACHE.get(key);
    if (!cached)
        return null;
    if (cached.expiresAt <= Date.now()) {
        USER_CACHE.delete(key);
        return null;
    }
    return cached.user;
};
const pruneCache = () => {
    const now = Date.now();
    for (const [key, entry] of USER_CACHE.entries()) {
        if (entry.expiresAt <= now) {
            USER_CACHE.delete(key);
        }
    }
    if (USER_CACHE.size <= USER_CACHE_MAX)
        return;
    const overflow = USER_CACHE.size - USER_CACHE_MAX;
    const keys = USER_CACHE.keys();
    for (let index = 0; index < overflow; index += 1) {
        const next = keys.next();
        if (next.done)
            break;
        USER_CACHE.delete(next.value);
    }
};
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    constructor(staffModel) {
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: 'secretKey',
        });
        this.staffModel = staffModel;
    }
    async validate(payload) {
        const cacheKey = buildCacheKey(payload);
        const cachedUser = readCacheEntry(cacheKey);
        if (cachedUser) {
            return cachedUser;
        }
        const email = typeof payload?.email === 'string' ? payload.email.trim() : '';
        const sub = typeof payload?.sub === 'string' ? payload.sub.trim() : '';
        const staffId = typeof payload?.staffId === 'string' ? payload.staffId.trim() : '';
        const lookup = {};
        if (sub && mongoose_1.Types.ObjectId.isValid(sub)) {
            lookup._id = new mongoose_1.Types.ObjectId(sub);
        }
        else if (email) {
            lookup.email = email;
        }
        else if (staffId) {
            lookup.staffId = staffId;
        }
        if (!Object.keys(lookup).length) {
            throw new common_1.UnauthorizedException();
        }
        const user = await this.staffModel
            .findOne(lookup)
            .select('-password -__v')
            .populate([
            {
                path: "role",
                skipInvalidIds: true,
                populate: {
                    path: "permissions",
                    skipInvalidIds: true,
                }
            },
            {
                path: "businessUnit",
                populate: {
                    path: "territory"
                }
            },
            {
                path: "department"
            },
            {
                path: "additionalBranch",
                select: "name entity latitude longitude",
            },
            {
                path: "additionalRoles",
                skipInvalidIds: true,
                populate: [
                    {
                        path: "role",
                        skipInvalidIds: true,
                    },
                    {
                        path: "entity",
                        skipInvalidIds: true,
                    }
                ]
            }
        ]);
        if (!user) {
            throw new common_1.UnauthorizedException();
        }
        await this.normalizeAndPopulateAdditionalRoles(user);
        await (0, supervisor_util_1.injectSupervisorMetadata)(this.staffModel, user);
        const safeUser = this.sanitizeUser(user);
        if (cacheKey) {
            USER_CACHE.set(cacheKey, { user: safeUser, expiresAt: Date.now() + USER_CACHE_TTL_MS });
            pruneCache();
        }
        return safeUser;
    }
    sanitizeUser(user) {
        const plain = typeof user?.toObject === 'function' ? user.toObject() : { ...user };
        const { password, __v, ...rest } = plain ?? {};
        const resolvedId = String(rest?._id ?? rest?.id ?? '');
        return {
            ...rest,
            id: resolvedId,
            userId: rest?.userId ?? resolvedId,
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
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_2.InjectModel)('User')),
    __metadata("design:paramtypes", [mongoose_1.Model])
], JwtStrategy);
//# sourceMappingURL=jwt.stategy.js.map