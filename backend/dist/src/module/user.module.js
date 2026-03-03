"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const user_service_1 = require("../services/user.service");
const user_controller_1 = require("../controllers/user.controller");
const user_schema_1 = require("../schemas/user.schema");
const level_service_1 = require("../services/level.service");
const level_schema_1 = require("../schemas/level.schema");
const level_category_schema_1 = require("../schemas/level-category.schema");
const branch_schema_1 = require("../schemas/branch.schema");
const subsidiary_schema_1 = require("../schemas/subsidiary.schema");
const subsidiary_service_1 = require("../services/subsidiary.service");
const branch_service_1 = require("../services/branch.service");
const level_controller_1 = require("../controllers/level.controller");
const subsidiary_controller_1 = require("../controllers/subsidiary.controller");
const auth_module_1 = require("../auth/auth.module");
const department_schema_1 = require("../schemas/department.schema");
const businessunit_schema_1 = require("../schemas/businessunit.schema");
const department_service_1 = require("../services/department.service");
const businessUnit_service_1 = require("../services/businessUnit.service");
const role_schema_1 = require("../schemas/role.schema");
const subsidiary_module_1 = require("./subsidiary.module");
const permission_schema_1 = require("../schemas/permission.schema");
const territory_schema_1 = require("../schemas/territory.schema");
const mail_service_1 = require("../services/mail.service");
const notice_schema_1 = require("../schemas/notice.schema");
const notice_service_1 = require("../services/notice.service");
const notice_gateway_1 = require("../events/notice.gateway");
let StaffModule = class StaffModule {
};
exports.StaffModule = StaffModule;
exports.StaffModule = StaffModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
                { name: subsidiary_schema_1.Subsidiary.name, schema: subsidiary_schema_1.SubsidiarySchema },
                { name: department_schema_1.Department.name, schema: department_schema_1.DepartmentSchema },
                { name: businessunit_schema_1.BusinessUnit.name, schema: businessunit_schema_1.BusinessUnitSchema },
                { name: branch_schema_1.Branch.name, schema: branch_schema_1.BranchSchema },
                { name: level_schema_1.Level.name, schema: level_schema_1.LevelSchema },
                { name: level_category_schema_1.LevelCategory.name, schema: level_category_schema_1.LevelCategorySchema },
                { name: role_schema_1.Role.name, schema: role_schema_1.RoleSchema },
                { name: permission_schema_1.Permission.name, schema: permission_schema_1.PermissionSchema },
                { name: territory_schema_1.Territory.name, schema: territory_schema_1.TerritorySchema },
                { name: notice_schema_1.Notice.name, schema: notice_schema_1.NoticeSchema }
            ]),
            auth_module_1.AuthModule,
            subsidiary_module_1.SubsidiaryModule
        ],
        providers: [user_service_1.StaffService, level_service_1.LevelService, branch_service_1.BranchService, subsidiary_service_1.SubsidiaryService, department_service_1.DepartmentService, businessUnit_service_1.BusinessUnitService, mail_service_1.MailService, notice_service_1.NoticeService, notice_gateway_1.NoticeGateway],
        exports: [user_service_1.StaffService, mongoose_1.MongooseModule],
        controllers: [user_controller_1.StaffController, level_controller_1.LevelController, subsidiary_controller_1.SubsidiaryController],
    })
], StaffModule);
//# sourceMappingURL=user.module.js.map