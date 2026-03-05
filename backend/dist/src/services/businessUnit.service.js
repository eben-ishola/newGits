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
exports.BusinessUnitService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let BusinessUnitService = class BusinessUnitService {
    constructor(businessunitModel) {
        this.businessunitModel = businessunitModel;
    }
    async createBusinessUnit(createUserDto) {
        try {
            const createdUser = new this.businessunitModel(createUserDto);
            return createdUser.save();
        }
        catch (e) {
            throw new Error(e.message);
        }
    }
    async findAllBusinessUnit(page, limit, searchText) {
        try {
            let query = {};
            if (searchText) {
                query = {
                    $or: [
                        { name: new RegExp(searchText, 'i') }
                    ],
                };
            }
            const totalItems = await this.businessunitModel.countDocuments(query);
            const totalPages = Math.ceil(totalItems / limit);
            const items = await this.businessunitModel
                .find(query)
                .skip((page - 1) * limit)
                .limit(limit)
                .exec();
            return {
                status: 200,
                totalPages,
                rows: items,
                totalItems,
                currentPage: page
            };
        }
        catch (e) {
            throw new Error(e.message);
        }
    }
    async findBusinessUnites() {
        try {
            const BusinessUnits = await this.businessunitModel.find().exec();
            return { data: BusinessUnits };
        }
        catch (error) {
            console.error("Error fetching BusinessUnits:", error);
            return null;
        }
    }
    async getBusinessUnitByName(name) {
        try {
            const BusinessUnits = await this.businessunitModel.findOne({ BU_NM: { $regex: new RegExp(`^${name}$`, 'i') } }).exec();
            return BusinessUnits;
        }
        catch (error) {
            console.error("Error fetching BusinessUnits:", error);
            return null;
        }
    }
    async updateBusinessUnit(id, updateBusinessUnitDto) {
        try {
            const updatedBusinessUnit = await this.businessunitModel
                .findByIdAndUpdate(id, updateBusinessUnitDto, { new: true })
                .exec();
            if (!updatedBusinessUnit) {
                throw new Error('Business Unit not found');
            }
            return updatedBusinessUnit;
        }
        catch (e) {
            throw new Error(e.message);
        }
    }
};
exports.BusinessUnitService = BusinessUnitService;
exports.BusinessUnitService = BusinessUnitService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('BusinessUnit')),
    __metadata("design:paramtypes", [mongoose_2.Model])
], BusinessUnitService);
//# sourceMappingURL=businessUnit.service.js.map