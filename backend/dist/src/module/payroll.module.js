"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const payroll_controller_1 = require("../controllers/payroll.controller");
const payroll_service_1 = require("../services/payroll.service");
const payroll_schema_1 = require("../schemas/payroll.schema");
const payrollMap_schema_1 = require("../schemas/payrollMap.schema");
const processedPayroll_schema_1 = require("../schemas/processedPayroll.schema");
const payroll_performance_schema_1 = require("../schemas/payroll-performance.schema");
const subsidiary_service_1 = require("../services/subsidiary.service");
const user_service_1 = require("../services/user.service");
const level_service_1 = require("../services/level.service");
const branch_service_1 = require("../services/branch.service");
const auth_module_1 = require("../auth/auth.module");
const user_module_1 = require("./user.module");
const department_service_1 = require("../services/department.service");
const businessUnit_service_1 = require("../services/businessUnit.service");
const notice_schema_1 = require("../schemas/notice.schema");
const notice_service_1 = require("../services/notice.service");
const notice_gateway_1 = require("../events/notice.gateway");
const payrollApproval_schema_1 = require("../schemas/payrollApproval.schema");
const payslipApproval_schema_1 = require("../schemas/payslipApproval.schema");
const tax_config_schema_1 = require("../schemas/tax-config.schema");
const payroll_workflow_schema_1 = require("../schemas/payroll-workflow.schema");
const subsidiary_schema_1 = require("../schemas/subsidiary.schema");
const remittance_schema_1 = require("../schemas/remittance.schema");
const remittance_service_1 = require("../services/remittance.service");
const remittance_controller_1 = require("../controllers/remittance.controller");
const attendance_schema_1 = require("../schemas/attendance.schema");
const attendanceConfig_schema_1 = require("../schemas/attendanceConfig.schema");
const mail_service_1 = require("../services/mail.service");
const cba_service_1 = require("../services/cba.service");
const leave_schema_1 = require("../schemas/leave.schema");
const holiday_schema_1 = require("../schemas/holiday.schema");
const disciplinary_case_schema_1 = require("../schemas/disciplinary-case.schema");
const transport_allowance_schema_1 = require("../schemas/transport-allowance.schema");
const transport_allowance_setting_schema_1 = require("../schemas/transport-allowance-setting.schema");
const transport_allowance_controller_1 = require("../controllers/transport-allowance.controller");
const transport_allowance_service_1 = require("../services/transport-allowance.service");
const department_schema_1 = require("../schemas/department.schema");
const role_schema_1 = require("../schemas/role.schema");
const user_schema_1 = require("../schemas/user.schema");
const transport_workflow_schema_1 = require("../schemas/transport-workflow.schema");
const transport_allowance_approval_schema_1 = require("../schemas/transport-allowance-approval.schema");
const leave_allowance_workflow_schema_1 = require("../schemas/leave-allowance-workflow.schema");
const leave_allowance_approval_schema_1 = require("../schemas/leave-allowance-approval.schema");
let PayrollModule = class PayrollModule {
};
exports.PayrollModule = PayrollModule;
exports.PayrollModule = PayrollModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([{ name: 'Payroll', schema: payroll_schema_1.PayrollSchema },
                { name: 'PayrollMap', schema: payrollMap_schema_1.PayrollMapSchema },
                { name: 'ProcessedPayroll', schema: processedPayroll_schema_1.ProcessedPayrollSchema },
                { name: payroll_performance_schema_1.PayrollPerformance.name, schema: payroll_performance_schema_1.PayrollPerformanceSchema },
                { name: payrollApproval_schema_1.PayrollApproval.name, schema: payrollApproval_schema_1.PayrollApprovalSchema },
                { name: payslipApproval_schema_1.PayslipApproval.name, schema: payslipApproval_schema_1.PayslipApprovalSchema },
                { name: payroll_workflow_schema_1.PayrollWorkflowConfig.name, schema: payroll_workflow_schema_1.PayrollWorkflowConfigSchema },
                { name: leave_allowance_workflow_schema_1.LeaveAllowanceWorkflowConfig.name, schema: leave_allowance_workflow_schema_1.LeaveAllowanceWorkflowConfigSchema },
                { name: leave_allowance_approval_schema_1.LeaveAllowanceApproval.name, schema: leave_allowance_approval_schema_1.LeaveAllowanceApprovalSchema },
                { name: tax_config_schema_1.TaxConfig.name, schema: tax_config_schema_1.TaxConfigSchema },
                { name: notice_schema_1.Notice.name, schema: notice_schema_1.NoticeSchema },
                { name: subsidiary_schema_1.Subsidiary.name, schema: subsidiary_schema_1.SubsidiarySchema },
                { name: remittance_schema_1.Remittance.name, schema: remittance_schema_1.RemittanceSchema },
                { name: attendance_schema_1.Attendance.name, schema: attendance_schema_1.AttendanceSchema },
                { name: attendanceConfig_schema_1.AttendanceConfig.name, schema: attendanceConfig_schema_1.AttendanceConfigSchema },
                { name: leave_schema_1.Leave.name, schema: leave_schema_1.LeaveSchema },
                { name: holiday_schema_1.Holiday.name, schema: holiday_schema_1.HolidaySchema },
                { name: disciplinary_case_schema_1.DisciplinaryCase.name, schema: disciplinary_case_schema_1.DisciplinaryCaseSchema },
                { name: transport_allowance_schema_1.TransportAllowance.name, schema: transport_allowance_schema_1.TransportAllowanceSchema },
                { name: transport_allowance_setting_schema_1.TransportAllowanceSetting.name, schema: transport_allowance_setting_schema_1.TransportAllowanceSettingSchema },
                { name: transport_workflow_schema_1.TransportWorkflowConfig.name, schema: transport_workflow_schema_1.TransportWorkflowConfigSchema },
                { name: transport_allowance_approval_schema_1.TransportAllowanceApproval.name, schema: transport_allowance_approval_schema_1.TransportAllowanceApprovalSchema },
                { name: department_schema_1.Department.name, schema: department_schema_1.DepartmentSchema },
                { name: role_schema_1.Role.name, schema: role_schema_1.RoleSchema },
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
            ]),
            auth_module_1.AuthModule,
            user_module_1.StaffModule
        ],
        controllers: [transport_allowance_controller_1.TransportAllowanceController, remittance_controller_1.RemittanceController, payroll_controller_1.PayrollController],
        providers: [
            payroll_service_1.PayrollService,
            subsidiary_service_1.SubsidiaryService,
            user_service_1.StaffService,
            level_service_1.LevelService,
            branch_service_1.BranchService,
            department_service_1.DepartmentService,
            businessUnit_service_1.BusinessUnitService,
            mail_service_1.MailService,
            notice_service_1.NoticeService,
            notice_gateway_1.NoticeGateway,
            remittance_service_1.RemittanceService,
            mail_service_1.MailService,
            cba_service_1.CbaService,
            transport_allowance_service_1.TransportAllowanceService,
        ],
    })
], PayrollModule);
//# sourceMappingURL=payroll.module.js.map