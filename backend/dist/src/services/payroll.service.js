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
var PayrollService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const payroll_schema_1 = require("../schemas/payroll.schema");
const payroll_performance_schema_1 = require("../schemas/payroll-performance.schema");
const attendance_schema_1 = require("../schemas/attendance.schema");
const leave_schema_1 = require("../schemas/leave.schema");
const attendanceConfig_schema_1 = require("../schemas/attendanceConfig.schema");
const uuid_1 = require("uuid");
const subsidiary_service_1 = require("./subsidiary.service");
const spreadsheet_util_1 = require("../utils/spreadsheet.util");
const moment = require("moment-timezone");
const payrollApproval_schema_1 = require("../schemas/payrollApproval.schema");
const payslipApproval_schema_1 = require("../schemas/payslipApproval.schema");
const notice_service_1 = require("./notice.service");
const tax_config_schema_1 = require("../schemas/tax-config.schema");
const access_control_util_1 = require("../utils/access-control.util");
const payroll_workflow_schema_1 = require("../schemas/payroll-workflow.schema");
const leave_allowance_workflow_schema_1 = require("../schemas/leave-allowance-workflow.schema");
const leave_allowance_approval_schema_1 = require("../schemas/leave-allowance-approval.schema");
const user_service_1 = require("./user.service");
const mail_service_1 = require("./mail.service");
const smtp_config_service_1 = require("./smtp-config.service");
const user_schema_1 = require("../schemas/user.schema");
const holiday_schema_1 = require("../schemas/holiday.schema");
const disciplinary_case_schema_1 = require("../schemas/disciplinary-case.schema");
const PAYROLL_APPROVAL_STATUS = {
    PENDING_REVIEW: 'PENDING_REVIEW',
    PENDING_APPROVAL: 'PENDING_APPROVAL',
    PENDING_POSTING: 'PENDING_POSTING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
};
const PAYSLIP_APPROVAL_STATUS = {
    PENDING_REVIEW: 'PENDING_REVIEW',
    PENDING_APPROVAL: 'PENDING_APPROVAL',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
};
let PayrollService = PayrollService_1 = class PayrollService {
    constructor(payrollModel, processedPayrollModel, payrollMapModel, payrollPerformanceModel, attendanceModel, leaveModel, attendanceConfigModel, taxConfigModel, payrollApprovalModel, payslipApprovalModel, payrollWorkflowModel, leaveAllowanceWorkflowModel, leaveAllowanceApprovalModel, staffModel, holidayModel, disciplinaryCaseModel, entityService, staffService, noticeService, mailService, smtpConfigService) {
        this.payrollModel = payrollModel;
        this.processedPayrollModel = processedPayrollModel;
        this.payrollMapModel = payrollMapModel;
        this.payrollPerformanceModel = payrollPerformanceModel;
        this.attendanceModel = attendanceModel;
        this.leaveModel = leaveModel;
        this.attendanceConfigModel = attendanceConfigModel;
        this.taxConfigModel = taxConfigModel;
        this.payrollApprovalModel = payrollApprovalModel;
        this.payslipApprovalModel = payslipApprovalModel;
        this.payrollWorkflowModel = payrollWorkflowModel;
        this.leaveAllowanceWorkflowModel = leaveAllowanceWorkflowModel;
        this.leaveAllowanceApprovalModel = leaveAllowanceApprovalModel;
        this.staffModel = staffModel;
        this.holidayModel = holidayModel;
        this.disciplinaryCaseModel = disciplinaryCaseModel;
        this.entityService = entityService;
        this.staffService = staffService;
        this.noticeService = noticeService;
        this.mailService = mailService;
        this.smtpConfigService = smtpConfigService;
    }
    normalizeAccount(value) {
        if (value === null || value === undefined)
            return null;
        const text = String(value).trim();
        if (!text)
            return null;
        return text.replace(/[^0-9a-z]/gi, '').toUpperCase();
    }
    parseAmount(value) {
        if (value === null || value === undefined || value === '')
            return 0;
        if (typeof value === 'number')
            return Number.isFinite(value) ? value : 0;
        const cleaned = String(value).replace(/,/g, '').trim();
        if (!cleaned)
            return 0;
        const parsed = Number(cleaned);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    extractCalloverAccount(row) {
        const raw = row?.acct_no ??
            row?.acctNo ??
            row?.accountNo ??
            row?.accountNumber ??
            row?.account ??
            row?.ACCT_NO ??
            row?.ACCTNO ??
            row?.ACCOUNT_NO ??
            row?.ACCOUNTNUMBER ??
            row?.ACCOUNT ??
            null;
        return this.normalizeAccount(raw);
    }
    extractCalloverAmount(row) {
        const raw = row?.txn_amt ??
            row?.txnAmt ??
            row?.amount ??
            row?.gross ??
            row?.TXN_AMT ??
            row?.TXNAMT ??
            row?.AMOUNT ??
            row?.GROSS ??
            null;
        return this.parseAmount(raw);
    }
    extractPayrollAccount(row) {
        const raw = row?.accountNo ??
            row?.accountNumber ??
            row?.account ??
            row?.acct_no ??
            row?.acctNo ??
            row?.addosserAccount ??
            row?.atlasAccount ??
            null;
        return this.normalizeAccount(raw);
    }
    extractPayrollAmount(row, typeOverride) {
        const normalizeType = (value) => {
            if (value === null || value === undefined)
                return '';
            const text = String(value).trim().toLowerCase();
            if (!text)
                return '';
            return text.replace(/[\s_-]+/g, '');
        };
        const pickFirst = (...values) => {
            for (const value of values) {
                if (value === null || value === undefined || value === '')
                    continue;
                return value;
            }
            return null;
        };
        const type = normalizeType(typeOverride ??
            row?.type ??
            row?.payrollType ??
            row?.payType ??
            row?.payroll_type ??
            row?.paymentType ??
            row?.category);
        let raw = null;
        switch (type) {
            case 'salary':
                raw = pickFirst(row?.monthlyNet, row?.netPay, row?.net, row?.amount, row?.total);
                break;
            case 'bank':
                raw = pickFirst(row?.bankAmount, row?.bank_amount, row?.bank, row?.amount, row?.netPay, row?.net, row?.gross, row?.grossPay, row?.monthlyNet, row?.monthlyGross, row?.total);
                break;
            case 'individual':
                raw = pickFirst(row?.individualAmount, row?.individual_amount, row?.individual, row?.amount, row?.netPay, row?.net, row?.gross, row?.grossPay, row?.monthlyNet, row?.monthlyGross, row?.total);
                break;
            case 'reimbursable':
                raw = pickFirst(row?.reimbursable, row?.reimbursableAmount, row?.remibursableAmount, row?.amount, row?.netPay, row?.net, row?.gross, row?.grossPay, row?.monthlyNet, row?.monthlyGross, row?.total);
                break;
            default:
                raw = pickFirst(row?.amount, row?.netPay, row?.net, row?.gross, row?.grossPay, row?.monthlyNet, row?.monthlyGross, row?.total);
                break;
        }
        return this.parseAmount(raw);
    }
    buildAccountTotals(rows, extractAccount, extractAmount) {
        const totals = new Map();
        rows.forEach((row) => {
            const account = extractAccount(row);
            if (!account)
                return;
            const amount = extractAmount(row);
            if (!Number.isFinite(amount) || amount === 0) {
                if (!totals.has(account)) {
                    totals.set(account, 0);
                }
                return;
            }
            totals.set(account, (totals.get(account) ?? 0) + amount);
        });
        return totals;
    }
    async resolveCalloverPayrollRows(payload) {
        const approvalId = String(payload?.approvalId ?? '').trim();
        const batchId = String(payload?.batchId ?? '').trim();
        const entity = String(payload?.entity ?? '').trim();
        const month = String(payload?.month ?? '').trim();
        const type = String(payload?.type ?? '').trim();
        if (approvalId) {
            const approval = await this.payrollApprovalModel.findById(approvalId).lean();
            if (!approval) {
                throw new common_1.NotFoundException('Payroll approval request not found.');
            }
            const rows = this.resolvePayrollApprovalRows(approval?.data);
            if (!rows.length) {
                return [];
            }
            if (type) {
                return rows.filter((row) => String(row?.type ?? '').toLowerCase() === type.toLowerCase());
            }
            return rows;
        }
        if (batchId) {
            const query = { batchId };
            if (type) {
                query.type = type;
            }
            return this.processedPayrollModel.find(query).lean().exec();
        }
        if (entity && month) {
            const entityId = await this.normalizeEntityIdStrict(entity);
            const [year, mon] = month.split('-').map(Number);
            if (!year || !mon) {
                throw new common_1.BadRequestException('Month must be in YYYY-MM format.');
            }
            const query = {
                entity: entityId,
                createdAt: {
                    $gte: new Date(year, mon - 1, 1),
                    $lt: new Date(year, mon, 1),
                },
            };
            if (type) {
                query.type = type;
            }
            return this.processedPayrollModel.find(query).lean().exec();
        }
        return [];
    }
    async compareCalloverWithPayroll(calloverRows, payload) {
        const hasContext = Boolean(payload?.approvalId) ||
            Boolean(payload?.batchId) ||
            (Boolean(payload?.entity) && Boolean(payload?.month));
        if (!hasContext) {
            return {
                status: 200,
                data: calloverRows,
                comparison: [],
                summary: {
                    calloverCount: calloverRows.length,
                    payrollCount: 0,
                    matched: 0,
                    mismatched: 0,
                    missing: 0,
                    unexpected: 0,
                    hasIssues: false,
                    comparisonSkipped: true,
                },
            };
        }
        const payrollRows = await this.resolveCalloverPayrollRows(payload);
        if (!payrollRows.length) {
            return {
                status: 200,
                data: calloverRows,
                comparison: [],
                summary: {
                    calloverCount: calloverRows.length,
                    payrollCount: 0,
                    matched: 0,
                    mismatched: 0,
                    missing: 0,
                    unexpected: 0,
                    hasIssues: calloverRows.length > 0,
                    comparisonSkipped: false,
                },
            };
        }
        const calloverTotals = this.buildAccountTotals(calloverRows, (row) => this.extractCalloverAccount(row), (row) => this.extractCalloverAmount(row));
        const payrollTotals = this.buildAccountTotals(payrollRows, (row) => this.extractPayrollAccount(row), (row) => this.extractPayrollAmount(row, payload?.type));
        const comparison = [];
        const pendingCallover = new Map(calloverTotals);
        const tolerance = 0.01;
        payrollTotals.forEach((payrollAmount, account) => {
            const calloverAmount = pendingCallover.get(account);
            if (calloverAmount === undefined) {
                if (Math.abs(payrollAmount) <= tolerance) {
                    comparison.push({
                        account,
                        payrollAmount,
                        calloverAmount: 0,
                        difference: 0,
                        status: 'matched',
                        flag: false,
                    });
                }
                else {
                    comparison.push({
                        account,
                        payrollAmount,
                        calloverAmount: 0,
                        difference: -payrollAmount,
                        status: 'missing',
                        flag: true,
                    });
                }
                return;
            }
            pendingCallover.delete(account);
            const matched = Math.abs(Math.abs(calloverAmount) - Math.abs(payrollAmount)) <= tolerance;
            const status = matched ? 'matched' : 'mismatch';
            comparison.push({
                account,
                payrollAmount,
                calloverAmount,
                difference: calloverAmount - payrollAmount,
                status,
                flag: !matched,
            });
        });
        pendingCallover.forEach((calloverAmount, account) => {
            if (Math.abs(calloverAmount) <= tolerance) {
                comparison.push({
                    account,
                    payrollAmount: 0,
                    calloverAmount,
                    difference: 0,
                    status: 'matched',
                    flag: false,
                });
            }
            else {
                comparison.push({
                    account,
                    payrollAmount: 0,
                    calloverAmount,
                    difference: calloverAmount,
                    status: 'unexpected',
                    flag: true,
                });
            }
        });
        const summary = comparison.reduce((acc, row) => {
            if (row.status === 'matched')
                acc.matched += 1;
            if (row.status === 'mismatch')
                acc.mismatched += 1;
            if (row.status === 'missing')
                acc.missing += 1;
            if (row.status === 'unexpected')
                acc.unexpected += 1;
            return acc;
        }, {
            calloverCount: calloverRows.length,
            payrollCount: payrollRows.length,
            matched: 0,
            mismatched: 0,
            missing: 0,
            unexpected: 0,
            hasIssues: false,
            comparisonSkipped: false,
        });
        summary.hasIssues = summary.mismatched > 0 || summary.missing > 0 || summary.unexpected > 0;
        return {
            status: 200,
            data: calloverRows,
            payrollCount: payrollRows.length,
            comparison,
            summary,
        };
    }
    ensureNumber(value, fallback = 0) {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
        if (typeof value === 'string') {
            const cleaned = value
                .replace(/,/g, '')
                .replace(/[^\d.-]/g, '')
                .replace(/(?!^)-/g, '')
                .replace(/(\..*)\./g, '$1')
                .trim();
            if (!cleaned)
                return fallback;
            const parsed = Number(cleaned);
            return Number.isFinite(parsed) ? parsed : fallback;
        }
        if (value instanceof Number) {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : fallback;
        }
        return fallback;
    }
    resolveEffectiveRentValue(user, asOf) {
        const rentValue = this.resolveEffectiveRentValue(user);
        if (!rentValue || rentValue <= 0)
            return 0;
        const startRaw = user?.rentStartDate ?? user?.rentStart ?? user?.rentStartAt;
        const endRaw = user?.rentEndDate ?? user?.rentEnd ?? user?.rentEndAt;
        if (!startRaw || !endRaw)
            return 0;
        const start = moment(startRaw);
        const end = moment(endRaw);
        if (!start.isValid() || !end.isValid())
            return 0;
        if (end.isBefore(start, 'day'))
            return 0;
        const reference = moment(asOf ?? new Date());
        if (reference.isBefore(start, 'day'))
            return 0;
        if (reference.isAfter(end, 'day'))
            return 0;
        return rentValue;
    }
    round(value, precision = 2) {
        if (!Number.isFinite(value))
            return 0;
        const factor = Math.pow(10, precision);
        return Math.round(value * factor) / factor;
    }
    percentOf(amount, percent) {
        if (!Number.isFinite(amount))
            return 0;
        return this.round(amount * (percent / 100));
    }
    reconcileSalaryComponents(components) {
        const values = {
            basic: this.ensureNumber(components.basic, 0),
            housing: this.ensureNumber(components.housing, 0),
            transport: this.ensureNumber(components.transport, 0),
            dress: this.ensureNumber(components.dress, 0),
            utilities: this.ensureNumber(components.utilities, 0),
            lunch: this.ensureNumber(components.lunch, 0),
            telephone: this.ensureNumber(components.telephone, 0),
        };
        const gross = this.ensureNumber(components.gross, 0);
        const sum = this.round(Object.values(values).reduce((acc, val) => acc + val, 0));
        const gap = this.round(gross - sum);
        if (gap !== 0) {
            const targetKey = Object.keys(values).reduce((best, key) => (Math.abs(values[key]) > Math.abs(values[best]) ? key : best), "basic");
            values[targetKey] = this.round(values[targetKey] + gap);
        }
        return { ...values, gross };
    }
    normalizeEntityKey(value) {
        if (!value) {
            return null;
        }
        if (typeof value === 'string') {
            const trimmed = value.trim();
            return trimmed.length ? trimmed : null;
        }
        if (value instanceof mongoose_2.Types.ObjectId) {
            return value.toHexString();
        }
        if (typeof value === 'object') {
            const candidate = value?._id ??
                value?.id ??
                value?.value ??
                value?.entity;
            if (candidate) {
                return this.normalizeEntityKey(candidate);
            }
        }
        return null;
    }
    async loadActiveGlobalConfig() {
        const config = await this.taxConfigModel.findOne({
            isActive: true,
            $or: [{ entity: { $exists: false } }, { entity: null }],
        })
            .sort({ createdAt: -1 })
            .lean()
            .exec();
        return config;
    }
    async computeTaxForAnnualIncome(amount, config) {
        const income = Math.max(this.round(amount), 0);
        if (income <= 0)
            return 0;
        let cfg = config;
        if (!cfg) {
            cfg = await this.loadActiveGlobalConfig();
        }
        if (!cfg) {
            return 0;
        }
        if (cfg.exemptLimit && income <= cfg.exemptLimit)
            return 0;
        const brackets = (cfg.brackets || []).slice().sort((a, b) => a.minIncome - b.minIncome);
        for (const br of brackets) {
            const max = br.maxIncome == null ? Number.POSITIVE_INFINITY : br.maxIncome;
            if (income > (br.minIncome - 1) && income <= max) {
                const taxableInBracket = Math.max(0, income - br.minIncome);
                return Number(this.round((br.baseTax || 0) + taxableInBracket * br.rate));
            }
        }
        return 0;
    }
    async computeMonthlyTax(amount, config) {
        const annual = await this.computeTaxForAnnualIncome(amount, config);
        return this.round(annual / 12);
    }
    resolveEntityId(input) {
        if (!input) {
            return undefined;
        }
        if (typeof input === 'string' && input.trim()) {
            return input;
        }
        if (mongoose_2.Types.ObjectId.isValid(input)) {
            return new mongoose_2.Types.ObjectId(input).toHexString();
        }
        if (typeof input === 'object') {
            const candidate = input._id ?? input.id;
            if (!candidate) {
                return undefined;
            }
            if (typeof candidate === 'string' && candidate.trim()) {
                return candidate;
            }
            if (mongoose_2.Types.ObjectId.isValid(candidate)) {
                return new mongoose_2.Types.ObjectId(candidate).toHexString();
            }
        }
        return undefined;
    }
    hasFinanceScope(user) {
        return (0, access_control_util_1.userHasScope)(user, ['finance', 'group']);
    }
    parseBooleanFlag(value) {
        if (value === true)
            return true;
        if (value === false || value === null || value === undefined)
            return false;
        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            return ['1', 'true', 'yes', 'y', 'on'].includes(normalized);
        }
        return Boolean(value);
    }
    resolveAttendanceOverride(payload, user) {
        const requested = this.parseBooleanFlag(payload?.attendanceOverride ??
            payload?.ignoreAttendanceDeductions ??
            payload?.skipAttendanceDeductions ??
            payload?.overrideAttendance);
        if (!requested)
            return false;
        return (this.hasFinanceScope(user) ||
            this.userHasSuperAdminRole(user) ||
            this.userHasPermission(user, ['process payroll']));
    }
    resolveAttendanceHandledOnClient(payload) {
        return this.parseBooleanFlag(payload?.attendanceHandledOnClient ??
            payload?.attendanceAppliedOnClient ??
            payload?.attendanceApplied);
    }
    async normalizeEntityIdStrict(value) {
        const resolved = this.resolveEntityId(value);
        if (!resolved) {
            throw new common_1.BadRequestException('Entity is required');
        }
        const normalized = String(resolved).trim();
        if (mongoose_2.Types.ObjectId.isValid(normalized)) {
            return new mongoose_2.Types.ObjectId(normalized).toHexString();
        }
        const entity = await this.entityService.getSubsidiaryByShort(normalized).catch(() => null);
        if (entity?._id) {
            return String(entity._id);
        }
        throw new common_1.BadRequestException('Entity is required');
    }
    normalizeUserId(value) {
        if (value == null)
            return null;
        const candidate = typeof value === 'object'
            ? value?._id ??
                value?.id ??
                value?.userId ??
                value?.employeeId ??
                value
            : value;
        const normalized = String(candidate ?? '').trim();
        if (!normalized || normalized.toLowerCase() === 'undefined' || normalized.toLowerCase() === 'null') {
            return null;
        }
        if (!mongoose_2.Types.ObjectId.isValid(normalized)) {
            return null;
        }
        return normalized;
    }
    normalizeUserIdList(values) {
        const list = Array.isArray(values) ? values : values ? [values] : [];
        const unique = new Set();
        list.forEach((value) => {
            const normalized = this.normalizeUserId(value);
            if (normalized) {
                unique.add(normalized);
            }
        });
        return Array.from(unique);
    }
    buildPeriodKey(date) {
        const shortMonths = [
            'jan',
            'feb',
            'mar',
            'apr',
            'may',
            'jun',
            'jul',
            'aug',
            'sep',
            'oct',
            'nov',
            'dec',
        ];
        const month = shortMonths[date.getMonth()] ?? '';
        return `${month}-${date.getFullYear()}`.toLowerCase();
    }
    resolvePayslipPeriodWindow(raw) {
        const input = raw?.periodKey ?? raw?.period ?? raw?.month ?? raw;
        if (!input) {
            throw new common_1.BadRequestException('Payroll period is required');
        }
        const normalized = String(input).trim().toLowerCase();
        let year = null;
        let monthIndex = null;
        if (/^\d{4}[-/]\d{1,2}$/.test(normalized)) {
            const [yearPart, monthPart] = normalized.split(/[-/]/);
            year = Number(yearPart);
            monthIndex = Number(monthPart) - 1;
        }
        else if (/^[a-z]{3}-\d{4}$/.test(normalized)) {
            const [monthPart, yearPart] = normalized.split('-');
            const shortMonths = [
                'jan',
                'feb',
                'mar',
                'apr',
                'may',
                'jun',
                'jul',
                'aug',
                'sep',
                'oct',
                'nov',
                'dec',
            ];
            const idx = shortMonths.indexOf(monthPart);
            if (idx >= 0) {
                monthIndex = idx;
                year = Number(yearPart);
            }
        }
        else {
            const parsed = new Date(input);
            if (!Number.isNaN(parsed.getTime())) {
                year = parsed.getFullYear();
                monthIndex = parsed.getMonth();
            }
        }
        if (year === null || monthIndex === null || monthIndex < 0 || monthIndex > 11) {
            throw new common_1.BadRequestException('Invalid payroll period');
        }
        const periodDate = new Date(year, monthIndex, 1);
        const periodKey = this.buildPeriodKey(periodDate);
        const periodLabel = periodDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        const start = new Date(year, monthIndex, 1);
        const end = new Date(year, monthIndex + 1, 1);
        return { periodKey, periodLabel, periodDate, start, end };
    }
    resolvePerformancePeriod(raw) {
        if (!raw) {
            const now = new Date();
            const periodDate = new Date(now.getFullYear(), now.getMonth(), 1);
            const periodKey = this.buildPeriodKey(periodDate);
            const periodLabel = periodDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
            return { periodKey, periodLabel, periodDate };
        }
        const { periodKey, periodLabel, periodDate } = this.resolvePayslipPeriodWindow(raw);
        return { periodKey, periodLabel, periodDate };
    }
    parsePerformanceScore(raw) {
        if (raw === null || raw === undefined || raw === '')
            return null;
        const parsed = Number(raw);
        if (!Number.isFinite(parsed))
            return null;
        if (parsed < 0 || parsed > 100)
            return null;
        return parsed;
    }
    collectIdentifierValues(...values) {
        const identifiers = new Set();
        const seen = new Set();
        const addValue = (value) => {
            if (value === null || value === undefined)
                return;
            let current = value;
            while (current !== null && current !== undefined) {
                if (typeof current === 'object') {
                    if (seen.has(current))
                        return;
                    seen.add(current);
                    if (current instanceof mongoose_2.Types.ObjectId) {
                        identifiers.add(current.toHexString());
                        return;
                    }
                    if (typeof current.toHexString === 'function') {
                        try {
                            const hex = current.toHexString();
                            if (hex) {
                                identifiers.add(String(hex));
                                return;
                            }
                        }
                        catch {
                        }
                    }
                    const candidate = current?._id ??
                        current?.id ??
                        current?.userId ??
                        current?.staffId ??
                        current?.staffID ??
                        current?.employeeId ??
                        current?.email ??
                        current?.value;
                    if (candidate && candidate !== current) {
                        current = candidate;
                        continue;
                    }
                    const fallback = typeof current.toString === 'function' ? current.toString() : '';
                    if (fallback &&
                        fallback !== '[object Object]' &&
                        fallback.toLowerCase() !== 'undefined' &&
                        fallback.toLowerCase() !== 'null') {
                        identifiers.add(fallback);
                    }
                    return;
                }
                const str = String(current).trim();
                if (!str || str.toLowerCase() === 'undefined' || str.toLowerCase() === 'null')
                    return;
                identifiers.add(str);
                return;
            }
        };
        values.forEach(addValue);
        return Array.from(identifiers);
    }
    buildPayslipStaffQuery(identifiers) {
        if (!identifiers.length)
            return {};
        return {
            $or: [
                { staffId: { $in: identifiers } },
                { employeeId: { $in: identifiers } },
                { userId: { $in: identifiers } },
                { staffObjectId: { $in: identifiers } },
            ],
        };
    }
    buildPayslipPeriodQuery(periodKey, start, end) {
        return {
            $or: [
                { periodKey: periodKey },
                { periodKey: periodKey.toLowerCase() },
                { periodDate: { $gte: start, $lt: end } },
                { createdAt: { $gte: start, $lt: end } },
            ],
        };
    }
    buildProcessedPayrollEntityMatch(entityId) {
        if (!entityId)
            return {};
        const matches = [entityId];
        if (mongoose_2.Types.ObjectId.isValid(entityId)) {
            matches.push(new mongoose_2.Types.ObjectId(entityId));
        }
        return { entity: { $in: matches } };
    }
    async loadPerformanceScoreLookup(entityId, periodKey) {
        if (!periodKey)
            return new Map();
        const query = { periodKey };
        if (entityId) {
            Object.assign(query, this.buildProcessedPayrollEntityMatch(entityId));
        }
        const records = await this.payrollPerformanceModel.find(query).lean().exec();
        const lookup = new Map();
        records.forEach((record) => {
            const score = this.parsePerformanceScore(record?.score);
            if (score === null)
                return;
            const register = (value) => {
                if (!value)
                    return;
                const key = String(value).trim();
                if (key) {
                    lookup.set(key, score);
                }
            };
            register(record?.staffId);
            register(record?.employeeId);
            register(record?.userId);
        });
        return lookup;
    }
    async updateProcessedPayrollPayslipApproval(identifiers, periodWindow, entityId, status) {
        if (!identifiers.length)
            return;
        const staffQuery = this.buildPayslipStaffQuery(identifiers);
        const periodQuery = this.buildPayslipPeriodQuery(periodWindow.periodKey, periodWindow.start, periodWindow.end);
        const entityQuery = this.buildProcessedPayrollEntityMatch(entityId);
        const statusFilter = status === 'Approved' ? {} : { payslipApproval: { $ne: 'Approved' } };
        await this.processedPayrollModel.updateMany({ ...staffQuery, ...periodQuery, ...entityQuery, ...statusFilter }, { $set: { payslipApproval: status } });
    }
    sanitizeTaxConfigPayload(payload) {
        const entityId = this.resolveEntityId(payload?.entity);
        const sanitizeBracket = (raw) => {
            const minIncome = this.ensureNumber(raw?.minIncome, 0);
            const hasMax = raw?.maxIncome !== undefined && raw?.maxIncome !== null && raw?.maxIncome !== '';
            const maxIncome = hasMax ? this.ensureNumber(raw?.maxIncome, 0) : null;
            const rateValue = this.ensureNumber(raw?.rate, 0);
            const normalizedRate = rateValue > 1 ? rateValue / 100 : rateValue;
            const baseTax = this.ensureNumber(raw?.baseTax, 0);
            return {
                minIncome,
                maxIncome,
                rate: this.round(normalizedRate, 6),
                baseTax: this.round(baseTax),
            };
        };
        const brackets = Array.isArray(payload?.brackets)
            ? payload.brackets
                .map((item) => sanitizeBracket(item))
                .filter((item) => Number.isFinite(item.minIncome))
                .sort((a, b) => a.minIncome - b.minIncome)
            : [];
        const update = {
            configName: typeof payload?.configName === 'string' && payload.configName.trim()
                ? payload.configName.trim()
                : 'Default tax configuration',
            currency: typeof payload?.currency === 'string' && payload.currency.trim() ? payload.currency.trim() : 'NGN',
            isActive: payload?.isActive === undefined ? true : Boolean(payload.isActive),
            useProgressiveTaxCalculation: payload?.useProgressiveTaxCalculation === undefined ? true : Boolean(payload.useProgressiveTaxCalculation),
            brackets,
        };
        if (payload?.exemptLimit !== undefined) {
            update.exemptLimit =
                payload.exemptLimit === null || payload.exemptLimit === ''
                    ? null
                    : this.ensureNumber(payload.exemptLimit, 0);
        }
        const effectiveFrom = payload?.effectiveFrom ? new Date(payload.effectiveFrom) : undefined;
        if (effectiveFrom instanceof Date && !Number.isNaN(effectiveFrom.getTime())) {
            update.effectiveFrom = effectiveFrom;
        }
        else if (payload?.effectiveFrom === null) {
            update.effectiveFrom = null;
        }
        const effectiveTo = payload?.effectiveTo ? new Date(payload.effectiveTo) : undefined;
        if (effectiveTo instanceof Date && !Number.isNaN(effectiveTo.getTime())) {
            update.effectiveTo = effectiveTo;
        }
        else if (payload?.effectiveTo === null) {
            update.effectiveTo = null;
        }
        if (payload?.yearPassed !== undefined) {
            update.yearPassed =
                payload.yearPassed === null || payload.yearPassed === ''
                    ? null
                    : Number(payload.yearPassed);
        }
        return { entityId, update };
    }
    sanitizePayrollConfig(raw) {
        const toPercent = (key) => this.ensureNumber(raw?.[key], 0);
        return {
            basic: toPercent('basic'),
            housing: toPercent('housing'),
            transport: toPercent('transport'),
            dress: toPercent('dress'),
            utilities: toPercent('utilities'),
            lunch: toPercent('lunch'),
            telephone: toPercent('telephone'),
            reimbursable: toPercent('reimbursable'),
            variable: toPercent('variable'),
            leave: toPercent('leave'),
            pension: toPercent('pension'),
            nhf: toPercent('nhf'),
            workingDays: Math.max(Math.round(this.ensureNumber(raw?.workingDays, 30)), 0),
            companyPension: toPercent('companyPension'),
        };
    }
    async calculatePayroll(grossPay, entity, user) {
        const derivedGross = typeof grossPay === 'object' && grossPay !== null
            ? grossPay.amount ?? grossPay.grossPay ?? grossPay.gross ?? grossPay.salary ?? grossPay.value ?? 0
            : grossPay;
        const entityRef = entity ?? (typeof grossPay === 'object' && grossPay !== null ? grossPay.entity ?? grossPay.entityId : undefined);
        const entityId = this.resolveEntityId(entityRef);
        if (!entityId) {
            throw new common_1.BadRequestException('Entity is required to calculate payroll');
        }
        const { data } = await this.findAll(entityId);
        const settings = this.sanitizePayrollConfig(data ?? {});
        const gross = this.ensureNumber(derivedGross, 0);
        const tenable = 100 - (settings.reimbursable + settings.variable);
        const amountTendered = this.round(gross * (tenable / 100));
        const basicAmount = this.percentOf(amountTendered, settings.basic);
        const housingAmount = this.percentOf(amountTendered, settings.housing);
        const transportAmount = this.percentOf(amountTendered, settings.transport);
        const dressAmount = this.percentOf(amountTendered, settings.dress);
        const utilitiesAmount = this.percentOf(amountTendered, settings.utilities);
        const lunchAmount = this.percentOf(amountTendered, settings.lunch);
        const telephoneAmount = this.percentOf(amountTendered, settings.telephone);
        const reimbursableAmount = this.percentOf(gross, settings.reimbursable);
        const variableAmount = this.percentOf(gross, settings.variable);
        const pensionBase = basicAmount + housingAmount + transportAmount;
        const pensionAmount = this.percentOf(pensionBase, settings.pension);
        const companyPensionAmount = this.percentOf(pensionBase, settings.companyPension);
        const nhfAmount = this.percentOf(amountTendered, settings.nhf);
        const deductions = pensionAmount + nhfAmount;
        const cra = this.round(amountTendered - deductions);
        const rentValue = this.ensureNumber(user?.rent, 0);
        const rentRelief = rentValue > 0 ? Math.min(this.round(0.2 * rentValue), 500000) : 0;
        const taxRelief = this.round(pensionAmount + nhfAmount + rentRelief);
        const taxAbleIncome = Math.max(this.round(amountTendered - taxRelief), 0);
        const annualTax = await this.computeTaxForAnnualIncome(taxAbleIncome);
        const annualNet = this.round(amountTendered - pensionAmount - nhfAmount - annualTax);
        const monthlyGross = this.round(amountTendered / 12);
        const monthlyComponents = this.reconcileSalaryComponents({
            basic: this.round(basicAmount / 12),
            housing: this.round(housingAmount / 12),
            transport: this.round(transportAmount / 12),
            dress: this.round(dressAmount / 12),
            utilities: this.round(utilitiesAmount / 12),
            lunch: this.round(lunchAmount / 12),
            telephone: this.round(telephoneAmount / 12),
            gross: monthlyGross,
        });
        const monthlyPension = this.round(pensionAmount / 12);
        const monthlyNhf = this.round(nhfAmount / 12);
        const monthlyTax = this.round(annualTax / 12);
        let monthlyNet = this.round(annualNet / 12);
        const roundingGap = this.round(monthlyGross - (monthlyPension + monthlyNhf + monthlyTax + monthlyNet));
        if (roundingGap !== 0) {
            monthlyNet = this.round(monthlyNet + roundingGap);
        }
        const monthlyReimbursable = this.round(reimbursableAmount / 12);
        const monthlyVariable = this.round(variableAmount / 12);
        const leaveAllowanceAmount = this.percentOf(gross, settings.leave);
        const totalMonthlyNet = this.round(monthlyNet + monthlyReimbursable + monthlyVariable);
        const workingDays = settings.workingDays > 0 ? settings.workingDays : 30;
        const netPaymentDue = this.round((monthlyNet / 30) * workingDays);
        const grandTotal = this.round(gross + leaveAllowanceAmount);
        const monthlyCompanyPension = this.round(companyPensionAmount / 12);
        return {
            ...monthlyComponents,
            reimbursable: this.round(reimbursableAmount / 12),
            variable: this.round(variableAmount / 12),
            amountTendered,
            grandTotal,
            grossPay: this.round(gross),
            leave: this.round(leaveAllowanceAmount / 12),
            pension: monthlyPension,
            nhf: monthlyNhf,
            taxRelief,
            taxAbleIncome,
            annualTax,
            annualNet,
            monthlyNet,
            monthlyReimbursable,
            monthlyVariable,
            totalMonthlyNet,
            monthlyGross: monthlyComponents.gross,
            netPaymentDue,
            monthlyTax,
            companyPension: this.round(companyPensionAmount / 12),
            monthlyCompanyPension,
        };
    }
    async getTaxConfigs(entity) {
        const entityId = this.resolveEntityId(entity);
        const scopeQuery = entityId
            ? { entity: entityId }
            : { $or: [{ entity: { $exists: false } }, { entity: null }] };
        const configs = await this.taxConfigModel
            .find(scopeQuery)
            .sort({ isActive: -1, createdAt: -1 })
            .lean()
            .exec();
        const fallbackConfig = entityId ? await this.loadActiveGlobalConfig() : null;
        const activeConfig = configs.find((cfg) => cfg.isActive) ?? (entityId ? fallbackConfig : null);
        return {
            status: 200,
            data: {
                entityId: entityId ?? null,
                configs,
                activeConfig,
                fallbackConfig,
            },
        };
    }
    async saveTaxConfig(payload) {
        const { entityId, update } = this.sanitizeTaxConfigPayload(payload);
        if (!update.configName) {
            throw new common_1.BadRequestException('Config name is required');
        }
        if (!update.currency) {
            throw new common_1.BadRequestException('Currency is required');
        }
        let document = null;
        if (payload?._id) {
            document = await this.taxConfigModel.findById(payload._id);
            if (!document) {
                throw new common_1.NotFoundException('Tax configuration not found');
            }
            for (const [key, value] of Object.entries(update)) {
                if (value === undefined)
                    continue;
                document.set(key, value);
            }
            if (entityId) {
                document.set('entity', entityId);
            }
            else {
                document.set('entity', undefined);
            }
            document.markModified('entity');
            document.markModified('brackets');
            await document.save();
        }
        else {
            const createPayload = { ...update };
            if (entityId) {
                createPayload.entity = entityId;
            }
            document = await this.taxConfigModel.create(createPayload);
        }
        if (document.isActive) {
            const scopeFilter = entityId
                ? { entity: entityId }
                : { $or: [{ entity: { $exists: false } }, { entity: null }] };
            await this.taxConfigModel.updateMany({ ...scopeFilter, _id: { $ne: document._id } }, { $set: { isActive: false } });
        }
        const plain = typeof document.toObject === 'function' ? document.toObject() : document;
        return {
            status: 200,
            data: plain,
        };
    }
    extractRoleNames(roleLike) {
        const names = [];
        const register = (value) => {
            if (typeof value === 'string' && value.trim()) {
                names.push(value.trim().toLowerCase());
            }
        };
        if (!roleLike)
            return names;
        if (typeof roleLike === 'string') {
            register(roleLike);
            return names;
        }
        register(roleLike?.name);
        register(roleLike?.label);
        if (roleLike?.role) {
            register(roleLike?.role?.name);
            register(roleLike?.role?.label);
        }
        return names;
    }
    extractPermissionNames(user) {
        const names = new Set();
        const register = (source) => {
            if (!source)
                return;
            const values = Array.isArray(source) ? source : [source];
            values.forEach((permission) => {
                if (!permission)
                    return;
                if (typeof permission === 'string') {
                    names.add(permission.trim().toLowerCase());
                }
                else if (typeof permission?.name === 'string') {
                    names.add(permission.name.trim().toLowerCase());
                }
            });
        };
        register(user?.permissions);
        register(user?.role?.permissions);
        if (Array.isArray(user?.roles)) {
            user.roles.forEach((role) => {
                register(role?.permissions);
                register(role?.role?.permissions);
            });
        }
        const additional = Array.isArray(user?.additionalRoles)
            ? user.additionalRoles
            : user?.additionalRoles
                ? [user.additionalRoles]
                : [];
        additional.forEach((assignment) => {
            const roleNode = assignment?.role ?? assignment;
            register(roleNode?.permissions);
        });
        return names;
    }
    isAuditDepartment(user) {
        const department = String(user?.department?.name ?? user?.department ?? '').trim().toLowerCase();
        return department.includes('audit');
    }
    userHasPermission(user, required) {
        const permissions = this.extractPermissionNames(user);
        if (permissions.has('all'))
            return true;
        const list = Array.isArray(required) ? required : [required];
        if (list.some((perm) => permissions.has(perm.toLowerCase()))) {
            return true;
        }
        if (this.isAuditDepartment(user)) {
            const auditPermissions = new Set(['view processed payroll', 'view payroll']);
            return list.some((perm) => auditPermissions.has(perm.toLowerCase()));
        }
        return false;
    }
    userHasSuperAdminRole(user) {
        const permissions = this.extractPermissionNames(user);
        if (permissions.has('all'))
            return true;
        for (const name of permissions) {
            if (PayrollService_1.SUPER_ADMIN_ROLE_NAMES.has(name)) {
                return true;
            }
        }
        const additional = Array.isArray(user?.additionalRoles)
            ? user.additionalRoles.map((assignment) => assignment?.role ?? assignment)
            : [];
        const sources = [
            user?.role,
            ...(Array.isArray(user?.roles) ? user.roles : []),
            ...additional,
        ];
        return sources.some((roleLike) => this.extractRoleNames(roleLike).some((name) => PayrollService_1.SUPER_ADMIN_ROLE_NAMES.has(name)));
    }
    assertSuperAdmin(user) {
        if (!this.userHasSuperAdminRole(user)) {
            throw new common_1.ForbiddenException('Only super admin can modify payroll configurations.');
        }
    }
    async createPayroll(payload, user) {
        try {
            this.assertSuperAdmin(user);
            delete payload.null;
            if (!payload?.field) {
                throw new common_1.BadRequestException('Configuration field is required.');
            }
            const field = payload?.field;
            let value = payload?.value;
            if (field === 'performanceBrackets') {
                value = this.normalizePerformanceBrackets(value);
            }
            const result = await this.payrollModel.updateMany({ _id: payload?._id }, { $set: { [field]: value, entity: payload?.entity } });
            return { status: 200, ...result };
        }
        catch (error) {
            return { status: 500, message: 'Error creating payroll', error: error.message };
        }
    }
    async mapPayroll(payload, user) {
        try {
            const rawEntity = payload?.entity ?? payload?.entityShort;
            const rawLevel = payload?.level;
            if (!rawEntity || !rawLevel) {
                return { status: 400, message: "Entity and level are required" };
            }
            const level = String(rawLevel).trim();
            if (!level) {
                return { status: 400, message: "Level is required" };
            }
            let entityId;
            try {
                entityId = await this.normalizeEntityIdStrict(rawEntity);
            }
            catch {
                return { status: 400, message: "Entity is required" };
            }
            const entityObjectId = new mongoose_2.Types.ObjectId(entityId);
            const hasAmount = payload?.amount !== undefined &&
                payload?.amount !== null &&
                String(payload.amount).trim() !== "";
            const hasAfta = Object.prototype.hasOwnProperty.call(payload ?? {}, "afta");
            const updatePayload = {};
            if (hasAmount) {
                const amountValue = this.ensureNumber(payload.amount, NaN);
                if (!Number.isFinite(amountValue)) {
                    return { status: 400, message: "Amount must be a number" };
                }
                updatePayload.amount = amountValue;
            }
            if (hasAfta) {
                updatePayload.afta = this.ensureNumber(payload?.afta, 0);
            }
            if (payload._id) {
                if (!Object.keys(updatePayload).length) {
                    return { status: 400, message: "No update fields provided" };
                }
                await this.payrollMapModel.updateOne({ _id: payload._id }, { $set: { ...updatePayload, level, entity: entityObjectId } });
                return { status: 200, message: "Updated by _id" };
            }
            const entityQuery = {
                $or: [
                    { entity: entityId },
                    { entity: entityObjectId },
                ],
            };
            const existing = await this.payrollMapModel.findOne({
                level,
                ...entityQuery,
            });
            if (existing) {
                if (!Object.keys(updatePayload).length) {
                    return { status: 400, message: "No update fields provided" };
                }
                await this.payrollMapModel.updateOne({ _id: existing._id }, { $set: updatePayload });
                return {
                    status: 200,
                    message: "Updated existing (entity + level)",
                };
            }
            if (!hasAmount) {
                return { status: 400, message: "Amount is required to create payroll mapping" };
            }
            const mappingPayload = {
                level,
                entity: entityObjectId,
                amount: updatePayload.amount,
            };
            if (hasAfta) {
                mappingPayload.afta = updatePayload.afta;
            }
            const created = await this.payrollMapModel.create(mappingPayload);
            return {
                status: 200,
                message: "Created new payroll mapping",
                data: created,
            };
        }
        catch (error) {
            return { status: 500, message: error.message };
        }
    }
    async findById(id) {
        return this.payrollModel.findById(id).exec();
    }
    async findByLevel(gradeLevel, entity, user) {
        let level = await this.payrollMapModel.findOne({ _id: gradeLevel, entity: entity }).exec();
        let payroll = await this.calculatePayroll(level?.amount, level?.entity, user);
        return { status: 200, data: payroll };
    }
    async findByLevelId(gradeLevel, entity, user) {
        let level = await this.payrollMapModel.findOne({
            level: gradeLevel,
            entity: new mongoose_2.Types.ObjectId(entity)
        }).exec();
        if (level)
            return await this.calculatePayroll(level?.amount, entity, user);
        return;
    }
    async findAll(entity) {
        let query = {
            $or: [
                { entity: String(entity) },
                { entity: new mongoose_2.Types.ObjectId(entity) }
            ]
        };
        let data = await this.payrollModel.findOne(query).exec();
        return { data };
    }
    async findAllMap(page = 1, user, entity, limit) {
        let query = {
            $or: [
                { entity: entity },
                { entity: new mongoose_2.Types.ObjectId(entity) }
            ]
        };
        try {
            const pageSize = limit && limit > 0 ? limit : 10;
            const skip = (page - 1) * pageSize;
            const [payrollData, totalItems] = await Promise.all([
                this.payrollMapModel.find(query).skip(skip).limit(pageSize).lean().exec(),
                this.payrollMapModel.countDocuments(query).exec(),
            ]);
            let subsidiaries = [];
            const response = await this.entityService.findSubsidiaryList();
            subsidiaries = response.data;
            const subsidiaryDirectory = new Map();
            subsidiaries.forEach((sub) => {
                if (!sub)
                    return;
                const id = this.normalizeEntityKey(sub?._id);
                if (id) {
                    subsidiaryDirectory.set(id, sub);
                }
            });
            const updatedData = payrollData.map((payroll) => {
                const entityKey = this.normalizeEntityKey(payroll?.entity);
                if (entityKey) {
                    const match = subsidiaryDirectory.get(entityKey);
                    if (match) {
                        return {
                            ...payroll,
                            entity: match,
                        };
                    }
                }
                return payroll;
            });
            const totalPages = Math.ceil(totalItems / pageSize);
            return {
                status: 200,
                data: updatedData,
                totalItems,
                currentPage: page,
                totalPages
            };
        }
        catch (error) {
            console.error("Error in findAllMap:", error);
            throw new Error("Failed to fetch payroll mappings");
        }
    }
    async updatePayroll(id, payload) {
        const calculatedData = await this.calculatePayroll(payload, payload?.entity, null);
        return this.payrollModel.findByIdAndUpdate(id, calculatedData, { new: true }).exec();
    }
    async deletePayroll(id) {
        return this.payrollModel.findByIdAndDelete(id).exec();
    }
    async generatePayroll(payload) {
        const periodInput = payload?.month ?? payload?.period ?? payload?.periodKey ?? new Date();
        const response = await this.staffService.getStaffList(String(payload.entity), {
            includeExitedInMonth: periodInput,
        });
        let result = await this.getTemplates(response, payload.type, payload.entity, periodInput);
        return { status: 200, data: result };
    }
    async processPayroll(payload, initiator) {
        try {
            const entityId = await this.normalizeEntityIdStrict(payload?.entity);
            const payrollRows = Array.isArray(payload?.data) ? payload.data : [];
            const workflowType = this.resolveWorkflowType(payload?.workflowType);
            if (!payrollRows.length) {
                throw new common_1.BadRequestException('No payroll data provided');
            }
            this.assertPayrollRowsHaveAccountAndLevel(payrollRows);
            const { workflow, reviewerIds, approverIds, auditViewerIds, postingIds, initiatorId, entityId: normalizedEntityId, } = await this.validateWorkflowInitiation(entityId, initiator, workflowType);
            const { workingDays: defaultWorkingDays, performanceBrackets } = await this.loadEntityPayrollSettings(normalizedEntityId);
            const periodDate = this.resolvePayrollPeriodDate(payload?.periodDate ?? payload?.month ?? payload?.period ?? payload?.periodKey);
            const attendanceOverride = this.resolveAttendanceOverride(payload, initiator);
            const attendanceHandledOnClient = this.resolveAttendanceHandledOnClient(payload);
            const normalizedData = this.normalizePayrollData(payrollRows, {
                workingDays: defaultWorkingDays,
                performanceBrackets,
            });
            const baseData = attendanceHandledOnClient
                ? normalizedData.map((row) => ({ ...row, prorationHandledOnClient: true }))
                : normalizedData;
            let adjustedData = baseData;
            if (!attendanceOverride && !attendanceHandledOnClient) {
                const salaryRows = normalizedData.filter((row) => (row?.type ?? this.detectRowType(row)) === 'salary');
                const attendanceRows = normalizedData.filter((row) => ['salary', 'variable', 'reimbursable'].includes(row?.type ?? this.detectRowType(row)));
                const attendanceIdentifierAliases = attendanceRows.length
                    ? await this.resolveAttendanceIdentifierAliases(attendanceRows, normalizedEntityId)
                    : new Map();
                const lateDeductionIds = salaryRows.length
                    ? await this.resolveLateDeductionEmployees(salaryRows, periodDate, attendanceIdentifierAliases)
                    : new Set();
                adjustedData = this.applyLateAttendanceDeduction(normalizedData, lateDeductionIds, defaultWorkingDays);
                const attendanceSummary = attendanceRows.length
                    ? await this.resolveAttendanceSummaryByEmployee(attendanceRows, periodDate, attendanceIdentifierAliases)
                    : new Map();
                adjustedData = this.applyAbsenceDeduction(adjustedData, attendanceSummary, defaultWorkingDays, periodDate);
            }
            let proratedData = this.applyProrationForDisplay(adjustedData, defaultWorkingDays, performanceBrackets, periodDate).map((row) => ({ ...row, prorationApplied: true }));
            const hydrated = await this.hydratePayrollRowIdentifiers(proratedData, normalizedEntityId);
            if (hydrated.changed) {
                proratedData = hydrated.rows;
            }
            const types = [...new Set(proratedData.map((item) => item.type))];
            const batchId = (0, uuid_1.v4)();
            const entityDetails = await this.entityService.findSubsidiaryById(normalizedEntityId).catch(() => null);
            const initiatorComment = typeof payload?.initiatorComment === 'string'
                ? payload.initiatorComment.trim()
                : typeof payload?.comment === 'string'
                    ? payload.comment.trim()
                    : typeof payload?.notes === 'string'
                        ? payload.notes.trim()
                        : '';
            const approval = await this.payrollApprovalModel.create({
                batchId,
                entity: entityId,
                workflowType,
                status: PAYROLL_APPROVAL_STATUS.PENDING_REVIEW,
                currentStage: 'REVIEWER',
                data: proratedData,
                types,
                requestedBy: initiatorId ?? undefined,
                requestedByName: this.composeUserName(initiator),
                initiatorId: initiatorId ?? undefined,
                initiatorName: this.composeUserName(initiator),
                initiatorComment: initiatorComment || undefined,
                reviewerIds,
                auditViewerIds,
                approverIds,
                postingIds,
            });
            if (workflowType === 'leave-allowance') {
                await this.syncLeaveAllowanceApprovalRecord(approval, { forceCreate: true });
            }
            const entityName = await this.resolveEntityName(entityDetails?.data ?? entityDetails ?? normalizedEntityId);
            const monthLabel = this.resolveApprovalMonthLabel(approval);
            await this.notifyStageAssignees(reviewerIds, approval._id.toString(), entityName, monthLabel, 'REVIEWER');
            await this.notifyAuditViewers(auditViewerIds, approval._id.toString(), entityName, monthLabel);
            return {
                status: 200,
                message: workflowType === 'leave-allowance'
                    ? 'Leave allowance submitted for reviewer approval.'
                    : 'Payroll submitted for reviewer approval.',
                batchId,
                approvalId: approval._id,
            };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.ForbiddenException) {
                throw error;
            }
            throw new common_1.BadRequestException(error?.message || 'Failed to submit payroll for approval');
        }
    }
    async previewPayroll(payload, initiator) {
        const entityId = await this.normalizeEntityIdStrict(payload?.entity);
        const payrollRows = Array.isArray(payload?.data) ? payload.data : [];
        const workflowType = this.resolveWorkflowType(payload?.workflowType);
        if (!payrollRows.length) {
            throw new common_1.BadRequestException('No payroll data provided');
        }
        const { entityId: normalizedEntityId } = await this.validateWorkflowInitiation(entityId, initiator, workflowType);
        const { workingDays: defaultWorkingDays, performanceBrackets } = await this.loadEntityPayrollSettings(normalizedEntityId);
        const periodDate = this.resolvePayrollPeriodDate(payload?.periodDate ?? payload?.month ?? payload?.period ?? payload?.periodKey);
        const attendanceOverride = this.resolveAttendanceOverride(payload, initiator);
        const attendanceHandledOnClient = this.resolveAttendanceHandledOnClient(payload);
        const normalizedData = this.normalizePayrollData(payrollRows, {
            workingDays: defaultWorkingDays,
            performanceBrackets,
        });
        const baseData = attendanceHandledOnClient
            ? normalizedData.map((row) => ({ ...row, prorationHandledOnClient: true }))
            : normalizedData;
        let adjustedData = baseData;
        if (!attendanceOverride && !attendanceHandledOnClient) {
            const salaryRows = normalizedData.filter((row) => (row?.type ?? this.detectRowType(row)) === 'salary');
            const attendanceRows = normalizedData.filter((row) => ['salary', 'variable', 'reimbursable'].includes(row?.type ?? this.detectRowType(row)));
            const attendanceIdentifierAliases = attendanceRows.length
                ? await this.resolveAttendanceIdentifierAliases(attendanceRows, normalizedEntityId)
                : new Map();
            const lateDeductionIds = salaryRows.length
                ? await this.resolveLateDeductionEmployees(salaryRows, periodDate, attendanceIdentifierAliases)
                : new Set();
            adjustedData = this.applyLateAttendanceDeduction(normalizedData, lateDeductionIds, defaultWorkingDays);
            const attendanceSummary = attendanceRows.length
                ? await this.resolveAttendanceSummaryByEmployee(attendanceRows, periodDate, attendanceIdentifierAliases)
                : new Map();
            adjustedData = this.applyAbsenceDeduction(adjustedData, attendanceSummary, defaultWorkingDays, periodDate);
        }
        const proratedData = this.applyProrationForDisplay(adjustedData, defaultWorkingDays, performanceBrackets, periodDate);
        const expanded = [];
        proratedData.forEach((row) => {
            if (!row || typeof row !== 'object')
                return;
            if (row.type !== 'variable') {
                expanded.push(row);
                return;
            }
            const workedDays = this.toSafeNumber(row?.prorateValues, defaultWorkingDays);
            const baseDays = this.toSafeNumber(row?.prorateBase ?? row?.totalDays ?? row?.workingDays ?? defaultWorkingDays, defaultWorkingDays);
            const variableBase = this.toSafeNumber(row.variable, 0);
            const performancePercent = this.normalizePercent(row.proratePercent ??
                row.performancePercent ??
                this.resolvePerformancePercent(row.performanceScore, performanceBrackets) ??
                100, 100);
            const bankAmount = this.round(variableBase / 2, 2);
            const individualAmount = this.round((variableBase - bankAmount) * (performancePercent / 100), 2);
            expanded.push({
                ...row,
                type: 'bank',
                variable: variableBase,
                amount: bankAmount,
                bankAmount,
                baseVariable: this.toSafeNumber(row.variable, 0),
                prorateValues: workedDays,
                prorateBase: baseDays,
                proratePercent: undefined,
                performancePercent: undefined,
            });
            expanded.push({
                ...row,
                type: 'individual',
                variable: variableBase,
                amount: individualAmount,
                bankAmount,
                individualAmount,
                baseVariable: this.toSafeNumber(row.variable, 0),
                prorateValues: workedDays,
                prorateBase: baseDays,
                proratePercent: performancePercent,
                performancePercent,
            });
        });
        const totals = this.computeSectionTotals(expanded);
        const types = [...new Set(expanded.map((item) => item.type).filter(Boolean))];
        return {
            status: 200,
            message: workflowType === 'leave-allowance'
                ? 'Leave allowance preview generated.'
                : 'Payroll preview generated.',
            data: expanded,
            totals,
            types,
        };
    }
    async getAttendanceSummary(payload, initiator) {
        const entityId = await this.normalizeEntityIdStrict(payload?.entity);
        const payrollRows = Array.isArray(payload?.data) ? payload.data : [];
        if (!payrollRows.length) {
            throw new common_1.BadRequestException('No payroll data provided');
        }
        const { entityId: normalizedEntityId } = await this.validatePayrollInitiation(entityId, initiator);
        const { workingDays, performanceBrackets } = await this.loadEntityPayrollSettings(normalizedEntityId);
        const periodDate = this.resolvePayrollPeriodDate(payload?.periodDate ?? payload?.month ?? payload?.period ?? payload?.periodKey);
        const normalizedData = this.normalizePayrollData(payrollRows, {
            workingDays,
            performanceBrackets,
        });
        const attendanceRows = normalizedData.filter((row) => ['salary', 'variable', 'reimbursable'].includes(row?.type ?? this.detectRowType(row)));
        const attendanceIdentifierAliases = attendanceRows.length
            ? await this.resolveAttendanceIdentifierAliases(attendanceRows, normalizedEntityId)
            : new Map();
        const attendanceSummary = attendanceRows.length
            ? await this.resolveAttendanceSummaryByEmployee(attendanceRows, periodDate, attendanceIdentifierAliases)
            : new Map();
        const salaryRows = normalizedData.filter((row) => (row?.type ?? this.detectRowType(row)) === 'salary');
        const lateDeductionIds = salaryRows.length
            ? await this.resolveLateDeductionEmployees(salaryRows, periodDate, attendanceIdentifierAliases)
            : new Set();
        const dataMap = new Map();
        attendanceRows.forEach((row) => {
            const key = this.extractEmployeeIdFromRow(row);
            if (!key)
                return;
            const summary = this.resolveAttendanceSummaryForRow(attendanceSummary, row);
            const absentDays = this.toSafeNumber(summary?.absentDays, 0);
            const latePenaltyDays = this.hasLateAttendancePenalty(lateDeductionIds, row) ? 1 : 0;
            const existing = dataMap.get(key);
            if (existing) {
                dataMap.set(key, {
                    absentDays: Math.max(existing.absentDays, absentDays),
                    latePenaltyDays: Math.max(existing.latePenaltyDays, latePenaltyDays),
                });
                return;
            }
            dataMap.set(key, { absentDays, latePenaltyDays });
        });
        const data = Array.from(dataMap.entries()).map(([employeeId, summary]) => ({
            employeeId,
            absentDays: summary.absentDays,
            latePenaltyDays: summary.latePenaltyDays,
        }));
        return {
            status: 200,
            data,
        };
    }
    async validatePayrollInitiation(entityId, initiator) {
        const { workflow, reviewerIds, approverIds, auditViewerIds, postingIds, entityId: normalizedEntityId, } = await this.loadPayrollWorkflowConfig(entityId);
        const allowedInitiators = this.normalizeUserIdList(workflow.initiatorIds);
        if (!reviewerIds.length) {
            throw new common_1.BadRequestException('At least one reviewer must be configured for this entity.');
        }
        if (!approverIds.length) {
            throw new common_1.BadRequestException('At least one approver must be configured for this entity.');
        }
        if (!postingIds.length) {
            throw new common_1.BadRequestException('At least one poster must be configured for this entity.');
        }
        const initiatorId = this.normalizeUserId(initiator?._id);
        const isInitiatorAllowed = this.hasFinanceScope(initiator) ||
            (initiatorId ? allowedInitiators.includes(initiatorId) : false);
        if (!isInitiatorAllowed) {
            throw new common_1.ForbiddenException('You are not allowed to initiate payroll for this entity.');
        }
        return {
            workflow,
            reviewerIds,
            approverIds,
            auditViewerIds,
            postingIds,
            initiatorId,
            entityId: normalizedEntityId,
        };
    }
    async loadPayrollWorkflowConfig(entityId) {
        const normalizedEntityId = await this.normalizeEntityIdStrict(entityId);
        const workflow = await this.payrollWorkflowModel
            .findOne({ entity: new mongoose_2.Types.ObjectId(normalizedEntityId) })
            .lean();
        if (!workflow) {
            throw new common_1.BadRequestException('Payroll workflow configuration is missing for this entity.');
        }
        const reviewerIds = this.normalizeUserIdList(workflow.reviewerIds);
        const approverIds = this.normalizeUserIdList(workflow.approverIds);
        const auditViewerIds = this.normalizeUserIdList(workflow.auditViewerIds);
        const postingIds = this.normalizeUserIdList(workflow.postingIds);
        return {
            workflow,
            reviewerIds,
            approverIds,
            auditViewerIds,
            postingIds,
            entityId: normalizedEntityId,
        };
    }
    resolveWorkflowType(value) {
        if (typeof value !== 'string')
            return 'payroll';
        const normalized = value.trim().toLowerCase().replace(/[\s_]+/g, '-');
        if (normalized === 'leave' || normalized === 'leave-allowance' || normalized === 'leaveallowance') {
            return 'leave-allowance';
        }
        return 'payroll';
    }
    async validateLeaveAllowanceInitiation(entityId, initiator) {
        const { workflow, reviewerIds, approverIds, auditViewerIds, postingIds, entityId: normalizedEntityId, } = await this.loadLeaveAllowanceWorkflowConfig(entityId);
        const allowedInitiators = this.normalizeUserIdList(workflow.initiatorIds);
        if (!reviewerIds.length) {
            throw new common_1.BadRequestException('At least one reviewer must be configured for this entity.');
        }
        if (!approverIds.length) {
            throw new common_1.BadRequestException('At least one approver must be configured for this entity.');
        }
        if (!postingIds.length) {
            throw new common_1.BadRequestException('At least one poster must be configured for this entity.');
        }
        const initiatorId = this.normalizeUserId(initiator?._id);
        const isInitiatorAllowed = this.hasFinanceScope(initiator) ||
            (initiatorId ? allowedInitiators.includes(initiatorId) : false);
        if (!isInitiatorAllowed) {
            throw new common_1.ForbiddenException('You are not allowed to initiate leave allowance for this entity.');
        }
        return {
            workflow,
            reviewerIds,
            approverIds,
            auditViewerIds,
            postingIds,
            initiatorId,
            entityId: normalizedEntityId,
        };
    }
    async loadLeaveAllowanceWorkflowConfig(entityId) {
        const normalizedEntityId = await this.normalizeEntityIdStrict(entityId);
        const workflow = await this.leaveAllowanceWorkflowModel
            .findOne({ entity: new mongoose_2.Types.ObjectId(normalizedEntityId) })
            .lean();
        if (!workflow) {
            throw new common_1.BadRequestException('Leave allowance workflow configuration is missing for this entity.');
        }
        const reviewerIds = this.normalizeUserIdList(workflow.reviewerIds);
        const approverIds = this.normalizeUserIdList(workflow.approverIds);
        const auditViewerIds = this.normalizeUserIdList(workflow.auditViewerIds);
        const postingIds = this.normalizeUserIdList(workflow.postingIds);
        return {
            workflow,
            reviewerIds,
            approverIds,
            auditViewerIds,
            postingIds,
            entityId: normalizedEntityId,
        };
    }
    async validateWorkflowInitiation(entityId, initiator, workflowType) {
        if (workflowType === 'leave-allowance') {
            return this.validateLeaveAllowanceInitiation(entityId, initiator);
        }
        return this.validatePayrollInitiation(entityId, initiator);
    }
    normalizeApprovalTypeToken(value) {
        if (typeof value !== 'string')
            return null;
        const trimmed = value.trim().toLowerCase();
        if (!trimmed)
            return null;
        return trimmed.replace(/[^a-z]/g, '');
    }
    isLeaveAllowanceBatchFromApproval(approval) {
        if (!approval || typeof approval !== 'object')
            return false;
        const LEAVE_TYPE_TOKENS = new Set(['leave', 'leaveallowance']);
        const approvalTypes = Array.isArray(approval?.types)
            ? approval.types
                .map((value) => this.normalizeApprovalTypeToken(value))
                .filter((value) => Boolean(value))
            : [];
        if (approvalTypes.length > 0) {
            return approvalTypes.some((type) => LEAVE_TYPE_TOKENS.has(type));
        }
        const rows = this.resolvePayrollApprovalRows(approval?.data);
        if (!rows.length)
            return false;
        const rowTypes = rows
            .map((row) => this.normalizeApprovalTypeToken(row?.type))
            .filter((value) => Boolean(value));
        if (rowTypes.length > 0) {
            return rowTypes.some((type) => LEAVE_TYPE_TOKENS.has(type));
        }
        return false;
    }
    async syncLeaveAllowanceApprovalRecord(approval, options) {
        if (!approval)
            return;
        const payrollApprovalId = String(approval?._id ?? '');
        if (!payrollApprovalId)
            return;
        const existing = await this.leaveAllowanceApprovalModel.exists({ payrollApprovalId });
        const shouldSync = options?.forceCreate === true || Boolean(existing);
        if (!shouldSync)
            return;
        const payload = {
            payrollApprovalId,
            batchId: String(approval?.batchId ?? ''),
            entity: String(approval?.entity ?? ''),
            status: approval?.status ?? PAYROLL_APPROVAL_STATUS.PENDING_REVIEW,
            data: this.resolvePayrollApprovalRows(approval?.data),
            types: Array.isArray(approval?.types) ? approval.types : [],
            year: Number.isFinite(Number(approval?.year)) ? Number(approval?.year) : undefined,
            month: Number.isFinite(Number(approval?.month)) ? Number(approval?.month) : undefined,
            requestedBy: approval?.requestedBy,
            requestedByName: approval?.requestedByName,
            initiatorId: approval?.initiatorId,
            initiatorName: approval?.initiatorName,
            initiatorComment: approval?.initiatorComment,
            reviewerIds: Array.isArray(approval?.reviewerIds) ? approval.reviewerIds : [],
            auditViewerIds: Array.isArray(approval?.auditViewerIds) ? approval.auditViewerIds : [],
            approverIds: Array.isArray(approval?.approverIds) ? approval.approverIds : [],
            postingIds: Array.isArray(approval?.postingIds) ? approval.postingIds : [],
            reviewerApprovedBy: approval?.reviewerApprovedBy,
            reviewerApprovedByName: approval?.reviewerApprovedByName,
            reviewerApprovedAt: approval?.reviewerApprovedAt,
            reviewerComment: approval?.reviewerComment,
            approverApprovedBy: approval?.approverApprovedBy,
            approverApprovedByName: approval?.approverApprovedByName,
            approverApprovedAt: approval?.approverApprovedAt,
            postingApprovedBy: approval?.postingApprovedBy,
            postingApprovedByName: approval?.postingApprovedByName,
            postingApprovedAt: approval?.postingApprovedAt,
            processedAt: approval?.processedAt,
            rejectionReason: approval?.rejectionReason,
            currentStage: approval?.currentStage,
        };
        if (!payload.batchId || !payload.entity)
            return;
        await this.leaveAllowanceApprovalModel.findOneAndUpdate({ payrollApprovalId: payload.payrollApprovalId }, { $set: payload }, { upsert: true, new: true, setDefaultsOnInsert: true });
    }
    async getPayrollApprovals(user, status, entity, approverOnly = false, assignedOnly = false, userIdFilter, workflowType) {
        const query = {};
        if (workflowType) {
            query.workflowType = workflowType;
        }
        else {
            query.workflowType = { $ne: 'leave-allowance' };
        }
        const normalizedStatus = typeof status === 'string' && status.trim() ? status.trim().toUpperCase() : undefined;
        const userId = this.normalizeUserId(user?._id);
        const normalizeIdentifierList = (...values) => {
            const identifiers = this.collectIdentifierValues(...values)
                .map((value) => String(value ?? '').trim())
                .filter((value) => value &&
                value.toLowerCase() !== 'null' &&
                value.toLowerCase() !== 'undefined' &&
                value.toLowerCase() !== '[object object]');
            return Array.from(new Set(identifiers));
        };
        const currentUserIdentifiers = normalizeIdentifierList(user?.id, user?._id, user?.userId, user?.email);
        const requestedUserIdentifiers = normalizeIdentifierList(userIdFilter);
        const currentUserIdentifierSet = new Set(currentUserIdentifiers.map((value) => value.toLowerCase()));
        const requestedMatchesCurrent = requestedUserIdentifiers.some((value) => currentUserIdentifierSet.has(value.toLowerCase()));
        const targetUserIdentifiers = requestedUserIdentifiers.length
            ? (requestedMatchesCurrent
                ? Array.from(new Set([...requestedUserIdentifiers, ...currentUserIdentifiers]))
                : requestedUserIdentifiers)
            : currentUserIdentifiers;
        const targetUserObjectIds = targetUserIdentifiers
            .filter((value) => mongoose_2.Types.ObjectId.isValid(value))
            .map((value) => new mongoose_2.Types.ObjectId(value));
        const isSuperAdmin = this.userHasSuperAdminRole(user);
        const isFinanceOrAudit = this.hasFinanceScope(user) || this.isAuditDepartment(user);
        const restrictToUser = assignedOnly === true || requestedUserIdentifiers.length > 0;
        const hasSuperAdminAccess = isSuperAdmin && !restrictToUser;
        const hasFinanceOrAuditAccess = isFinanceOrAudit && !restrictToUser;
        const requestedEntityId = this.resolveEntityId(entity);
        if (requestedUserIdentifiers.length && !isSuperAdmin && !isFinanceOrAudit) {
            const currentUserSet = new Set(currentUserIdentifiers.map((value) => value.toLowerCase()));
            const requestingOwnScope = requestedUserIdentifiers.some((value) => currentUserSet.has(value.toLowerCase()));
            if (!requestingOwnScope) {
                throw new common_1.ForbiddenException('You are not allowed to filter payroll approvals for another user.');
            }
        }
        if (requestedEntityId) {
            query.entity = requestedEntityId;
        }
        if (hasFinanceOrAuditAccess && !hasSuperAdminAccess && !approverOnly) {
            const mappedEntities = new Set();
            const registerEntity = (value) => {
                const resolved = this.resolveEntityId(value);
                if (resolved) {
                    mappedEntities.add(resolved);
                }
            };
            registerEntity(user?.entity ?? user?.entityId);
            if (Array.isArray(user?.additionalRoles)) {
                user.additionalRoles.forEach((assignment) => registerEntity(assignment?.entity));
            }
            const allowedEntities = Array.from(mappedEntities);
            if (!allowedEntities.length) {
                return { status: 200, data: [] };
            }
            if (requestedEntityId) {
                if (!allowedEntities.includes(requestedEntityId)) {
                    return { status: 200, data: [] };
                }
                query.entity = requestedEntityId;
            }
            else if (allowedEntities.length === 1) {
                query.entity = allowedEntities[0];
            }
            else {
                query.entity = { $in: allowedEntities };
            }
        }
        if (approverOnly) {
            if (!targetUserIdentifiers.length) {
                return { status: 200, data: [] };
            }
            if (normalizedStatus && !PayrollService_1.APPROVER_VIEW_STATUSES.has(normalizedStatus)) {
                return { status: 200, data: [] };
            }
            query.status = normalizedStatus ?? { $in: Array.from(PayrollService_1.APPROVER_VIEW_STATUSES) };
            query.$or = [{ approverIds: { $in: targetUserIdentifiers } }];
            if (targetUserObjectIds.length) {
                query.$or.push({ approverIds: { $in: targetUserObjectIds } });
                query.$or.push({ approverApprovedBy: { $in: targetUserObjectIds } });
            }
        }
        else if (hasSuperAdminAccess) {
            query.status =
                normalizedStatus ??
                    {
                        $in: Array.from(PayrollService_1.DEFAULT_APPROVAL_VIEW_STATUSES),
                    };
        }
        else if (hasFinanceOrAuditAccess) {
            if (normalizedStatus && !PayrollService_1.FINANCE_AUDIT_VIEW_STATUSES.has(normalizedStatus)) {
                return { status: 200, data: [] };
            }
            query.status =
                normalizedStatus ?? { $in: Array.from(PayrollService_1.FINANCE_AUDIT_VIEW_STATUSES) };
        }
        else {
            if (!targetUserIdentifiers.length && !userId) {
                throw new common_1.ForbiddenException('You are not allowed to view payroll approvals.');
            }
            query.status =
                normalizedStatus ??
                    {
                        $in: Array.from(PayrollService_1.DEFAULT_APPROVAL_VIEW_STATUSES),
                    };
            const roleFilters = [
                { initiatorId: { $in: targetUserIdentifiers } },
                { requestedBy: { $in: targetUserIdentifiers } },
                {
                    reviewerIds: { $in: targetUserIdentifiers },
                    status: { $in: Array.from(PayrollService_1.REVIEWER_VIEW_STATUSES) },
                },
                {
                    auditViewerIds: { $in: targetUserIdentifiers },
                    status: { $in: Array.from(PayrollService_1.FINANCE_AUDIT_VIEW_STATUSES) },
                },
                {
                    approverIds: { $in: targetUserIdentifiers },
                    status: { $in: Array.from(PayrollService_1.APPROVER_VIEW_STATUSES) },
                },
                {
                    postingIds: { $in: targetUserIdentifiers },
                    status: { $in: Array.from(PayrollService_1.POSTER_VIEW_STATUSES) },
                },
            ];
            if (targetUserObjectIds.length) {
                roleFilters.push({ initiatorId: { $in: targetUserObjectIds } }, { requestedBy: { $in: targetUserObjectIds } }, {
                    reviewerIds: { $in: targetUserObjectIds },
                    status: { $in: Array.from(PayrollService_1.REVIEWER_VIEW_STATUSES) },
                }, {
                    auditViewerIds: { $in: targetUserObjectIds },
                    status: { $in: Array.from(PayrollService_1.FINANCE_AUDIT_VIEW_STATUSES) },
                }, {
                    approverIds: { $in: targetUserObjectIds },
                    status: { $in: Array.from(PayrollService_1.APPROVER_VIEW_STATUSES) },
                }, {
                    postingIds: { $in: targetUserObjectIds },
                    status: { $in: Array.from(PayrollService_1.POSTER_VIEW_STATUSES) },
                });
            }
            query.$or = roleFilters;
            if (targetUserObjectIds.length) {
                query.$or.push({
                    reviewerApprovedBy: { $in: targetUserObjectIds },
                    status: { $in: Array.from(PayrollService_1.REVIEWER_VIEW_STATUSES) },
                }, { approverApprovedBy: { $in: targetUserObjectIds } }, { postingApprovedBy: { $in: targetUserObjectIds } });
            }
        }
        const approvals = await this.payrollApprovalModel
            .find(query)
            .populate([
            {
                path: 'reviewerApprovedBy',
                model: this.staffModel,
                select: 'firstName lastName middleName email staffId',
            },
            {
                path: 'approverApprovedBy',
                model: this.staffModel,
                select: 'firstName lastName middleName email staffId',
            },
            {
                path: 'postingApprovedBy',
                model: this.staffModel,
                select: 'firstName lastName middleName email staffId',
            },
        ])
            .sort({ createdAt: -1 })
            .lean();
        const approvalsWithBreakdown = await Promise.all((approvals ?? []).map(async (approval) => {
            const baseData = this.resolvePayrollApprovalRows(approval?.data);
            if (!baseData.length)
                return approval;
            const approvalPeriodDate = approval.processedAt ??
                approval.postingApprovedAt ??
                approval.approverApprovedAt ??
                approval.reviewerApprovedAt ??
                approval.createdAt ??
                new Date();
            let viewData = baseData;
            let viewTypes = Array.isArray(approval.types) && approval.types.length
                ? approval.types
                : Array.from(new Set(baseData.map((row) => row?.type).filter(Boolean)));
            try {
                const breakdown = await this.buildApprovalDisplayData(baseData, approval.entity, approvalPeriodDate);
                if (breakdown?.rows?.length) {
                    viewData = breakdown.rows;
                    viewTypes = breakdown.types;
                }
                else if (breakdown?.types?.length) {
                    viewTypes = breakdown.types;
                }
            }
            catch (error) {
                return approval;
            }
            return { ...approval, data: viewData, types: viewTypes };
        }));
        const enriched = await this.enrichPayrollApprovals(approvalsWithBreakdown, entity);
        return { status: 200, data: enriched };
    }
    async getLeaveAllowancePaidUsers(user, entity, year) {
        if (!entity) {
            throw new common_1.BadRequestException('Entity is required.');
        }
        const entityId = await this.normalizeEntityIdStrict(entity);
        const targetYear = Number.isFinite(Number(year))
            ? Math.round(Number(year))
            : new Date().getFullYear();
        if (!Number.isFinite(targetYear) || targetYear < 1970 || targetYear > 3000) {
            throw new common_1.BadRequestException('Year is invalid.');
        }
        const resolveApprovalYear = (approval) => {
            const explicitYear = Number(approval?.year);
            const explicitMonth = Number(approval?.month);
            if (Number.isFinite(explicitYear) &&
                Number.isFinite(explicitMonth) &&
                explicitMonth >= 1 &&
                explicitMonth <= 12) {
                return explicitYear;
            }
            const fallback = approval?.postingApprovedAt ??
                approval?.approverApprovedAt ??
                approval?.reviewerApprovedAt ??
                approval?.createdAt ??
                approval?.updatedAt;
            if (!fallback)
                return null;
            const parsed = fallback instanceof Date ? fallback : new Date(fallback);
            if (Number.isNaN(parsed.getTime()))
                return null;
            return parsed.getFullYear();
        };
        const entityMatch = this.buildProcessedPayrollEntityMatch(entityId);
        const approvalQuery = {
            status: PAYROLL_APPROVAL_STATUS.APPROVED,
            ...(entityMatch?.entity ? { entity: entityMatch.entity } : { entity: entityId }),
        };
        const projection = 'entity status types data year month createdAt updatedAt reviewerApprovedAt approverApprovedAt postingApprovedAt initiatorId requestedBy reviewerIds approverIds postingIds auditViewerIds reviewerApprovedBy approverApprovedBy postingApprovedBy batchId requestedByName initiatorName initiatorComment reviewerApprovedByName approverApprovedByName postingApprovedByName reviewerComment rejectionReason currentStage processedAt';
        let approvals = await this.leaveAllowanceApprovalModel
            .find(approvalQuery)
            .select(projection)
            .lean();
        if (!approvals.length) {
            const legacyApprovals = await this.payrollApprovalModel
                .find(approvalQuery)
                .select(projection)
                .lean();
            const leaveLegacyApprovals = legacyApprovals.filter((legacyApproval) => this.isLeaveAllowanceBatchFromApproval(legacyApproval));
            if (leaveLegacyApprovals.length) {
                await Promise.all(leaveLegacyApprovals.map((legacyApproval) => this.syncLeaveAllowanceApprovalRecord(legacyApproval, { forceCreate: true })));
                approvals = await this.leaveAllowanceApprovalModel
                    .find(approvalQuery)
                    .select(projection)
                    .lean();
            }
        }
        const paidUserIds = new Set();
        approvals.forEach((approval) => {
            if (!this.isLeaveAllowanceBatchFromApproval(approval))
                return;
            if (resolveApprovalYear(approval) !== targetYear)
                return;
            const rows = this.resolvePayrollApprovalRows(approval?.data);
            rows.forEach((row) => {
                const identifiers = this.collectIdentifierValues(row, row?.staff, row?.staffId, row?.employeeId, row?.userId, row?.staffObjectId, row?.id, row?._id, row?.email, row?.employeeInformation);
                identifiers.forEach((identifier) => {
                    const normalized = String(identifier ?? '').trim().toLowerCase();
                    if (normalized) {
                        paidUserIds.add(normalized);
                    }
                });
            });
        });
        return {
            status: 200,
            data: {
                year: targetYear,
                userIds: Array.from(paidUserIds),
            },
        };
    }
    async backfillPayrollApprovalActorNames(user) {
        const nameMissingFilter = {
            $or: [
                { reviewerApprovedByName: { $exists: false } },
                { reviewerApprovedByName: null },
                { reviewerApprovedByName: '' },
                { approverApprovedByName: { $exists: false } },
                { approverApprovedByName: null },
                { approverApprovedByName: '' },
                { postingApprovedByName: { $exists: false } },
                { postingApprovedByName: null },
                { postingApprovedByName: '' },
            ],
        };
        const batchSize = 200;
        let lastId = null;
        let scanned = 0;
        let batches = 0;
        while (true) {
            const query = { ...nameMissingFilter };
            if (lastId) {
                query._id = mongoose_2.Types.ObjectId.isValid(lastId)
                    ? { $gt: new mongoose_2.Types.ObjectId(lastId) }
                    : { $gt: lastId };
            }
            const approvals = await this.payrollApprovalModel
                .find(query)
                .sort({ _id: 1 })
                .limit(batchSize)
                .lean();
            if (!approvals.length)
                break;
            scanned += approvals.length;
            batches += 1;
            await this.enrichPayrollApprovals(approvals);
            const lastItemId = approvals[approvals.length - 1]?._id;
            if (lastItemId) {
                lastId = String(lastItemId);
            }
        }
        return {
            status: 200,
            message: 'Payroll approval name backfill completed.',
            scanned,
            batches,
        };
    }
    async getApprovalStaff(user, approvalId) {
        const approval = await this.payrollApprovalModel
            .findById(approvalId)
            .populate([
            {
                path: 'reviewerApprovedBy',
                model: this.staffModel,
                select: 'firstName lastName middleName email staffId',
            },
            {
                path: 'approverApprovedBy',
                model: this.staffModel,
                select: 'firstName lastName middleName email staffId',
            },
            {
                path: 'postingApprovedBy',
                model: this.staffModel,
                select: 'firstName lastName middleName email staffId',
            },
        ])
            .lean();
        if (!approval) {
            throw new common_1.NotFoundException('Payroll approval request not found');
        }
        if (!this.canViewPayrollApproval(user, approval)) {
            throw new common_1.ForbiddenException('You are not allowed to view this approval request');
        }
        const entityId = await this.normalizeEntityIdStrict(approval.entity);
        const staff = await this.staffService.getStaffList(entityId);
        return { status: 200, data: staff };
    }
    resolvePayrollApprovalRows(value) {
        const unwrap = (candidate, depth) => {
            if (Array.isArray(candidate))
                return candidate;
            if (!candidate || depth > 2)
                return [];
            if (typeof candidate === 'string') {
                const trimmed = candidate.trim();
                if (!trimmed)
                    return [];
                try {
                    const parsed = JSON.parse(trimmed);
                    return unwrap(parsed, depth + 1);
                }
                catch {
                    return [];
                }
            }
            if (typeof candidate === 'object') {
                if (Array.isArray(candidate.data))
                    return candidate.data;
                if (Array.isArray(candidate.rows))
                    return candidate.rows;
                if (candidate.data)
                    return unwrap(candidate.data, depth + 1);
                if (candidate.rows)
                    return unwrap(candidate.rows, depth + 1);
            }
            return [];
        };
        return unwrap(value, 0);
    }
    async hydratePayrollRowIdentifiers(rows, entity) {
        if (!Array.isArray(rows) || rows.length === 0) {
            return { rows: rows ?? [], changed: false };
        }
        let entityId;
        try {
            entityId = await this.normalizeEntityIdStrict(entity);
        }
        catch {
            entityId = this.resolveEntityId(entity);
        }
        if (!entityId) {
            return { rows, changed: false };
        }
        const staffRows = await this.staffModel
            .find(this.buildProcessedPayrollEntityMatch(entityId))
            .select('_id staffId employeeInformation')
            .lean()
            .exec();
        if (!staffRows.length) {
            return { rows, changed: false };
        }
        const staffLookup = new Map();
        const registerKey = (value, staff) => {
            if (value === null || value === undefined)
                return;
            const key = String(value).trim();
            if (!key)
                return;
            if (!staffLookup.has(key)) {
                staffLookup.set(key, staff);
            }
            const lower = key.toLowerCase();
            if (!staffLookup.has(lower)) {
                staffLookup.set(lower, staff);
            }
        };
        staffRows.forEach((staff) => {
            registerKey(staff?._id, staff);
            registerKey(staff?.id, staff);
            registerKey(staff?.staffId, staff);
        });
        const normalizeText = (value) => this.normalizePayrollText(value) ?? null;
        const resolveStaffForRow = (row) => {
            const candidates = [
                row?.staffId,
                row?.staffID,
                row?.staffObjectId,
                row?.employeeId,
                row?.userId,
                row?.userID,
                row?.id,
                row?._id,
            ];
            for (const candidate of candidates) {
                if (candidate === null || candidate === undefined)
                    continue;
                const key = String(candidate).trim();
                if (!key)
                    continue;
                const direct = staffLookup.get(key);
                if (direct)
                    return direct;
                const lowerMatch = staffLookup.get(key.toLowerCase());
                if (lowerMatch)
                    return lowerMatch;
            }
            return null;
        };
        let changed = false;
        const updatedRows = rows.map((row) => {
            if (!row || typeof row !== 'object')
                return row;
            const rowType = String(row?.type ?? '').toLowerCase();
            const staff = resolveStaffForRow(row);
            const rowDetail = row?.accountDetail ?? row?.employeeInformation?.accountDetail ?? {};
            const staffDetail = staff?.employeeInformation?.accountDetail ?? {};
            const resolvedPension = normalizeText(staffDetail?.pensionAccount ??
                staffDetail?.rsaNumber ??
                staff?.employeeInformation?.pensionAccount ??
                staff?.employeeInformation?.rsaNumber) ??
                normalizeText(row?.pensionAccount ??
                    row?.rsaNumber ??
                    row?.rsaPin ??
                    row?.rsa ??
                    rowDetail?.pensionAccount ??
                    rowDetail?.rsaNumber);
            const resolvedNhf = normalizeText(staffDetail?.nhfAccount ??
                staffDetail?.nhf ??
                staff?.employeeInformation?.nhfAccount ??
                staff?.employeeInformation?.nhf) ??
                normalizeText(row?.nhfAccount ??
                    row?.nhfNumber ??
                    row?.nhfNo ??
                    row?.nhfPin ??
                    row?.nhf ??
                    rowDetail?.nhfAccount ??
                    rowDetail?.nhf);
            const resolvedPaye = normalizeText(staffDetail?.payeAccount ??
                staffDetail?.taxProfileId ??
                staff?.employeeInformation?.payeAccount ??
                staff?.employeeInformation?.taxProfileId) ??
                normalizeText(row?.payeAccount ??
                    row?.taxProfileId ??
                    row?.taxId ??
                    row?.taxID ??
                    row?.paye ??
                    rowDetail?.payeAccount ??
                    rowDetail?.taxProfileId);
            const next = { ...row };
            const canUpdatePension = !rowType || ['salary', 'pension', 'companypension'].includes(rowType);
            const canUpdateNhf = !rowType || ['salary', 'nhf'].includes(rowType);
            const canUpdatePaye = !rowType || ['salary', 'paye'].includes(rowType);
            if (canUpdatePension && resolvedPension && normalizeText(row?.pensionAccount) !== resolvedPension) {
                next.pensionAccount = resolvedPension;
                changed = true;
            }
            if (canUpdatePension && resolvedPension && normalizeText(row?.rsaNumber) !== resolvedPension) {
                next.rsaNumber = resolvedPension;
                changed = true;
            }
            if (canUpdateNhf && resolvedNhf && normalizeText(row?.nhfAccount) !== resolvedNhf) {
                next.nhfAccount = resolvedNhf;
                changed = true;
            }
            if (canUpdatePaye && resolvedPaye && normalizeText(row?.payeAccount) !== resolvedPaye) {
                next.payeAccount = resolvedPaye;
                changed = true;
            }
            if (canUpdatePaye && resolvedPaye && normalizeText(row?.taxId) !== resolvedPaye) {
                next.taxId = resolvedPaye;
                changed = true;
            }
            if (canUpdatePaye && resolvedPaye && normalizeText(row?.taxID) !== resolvedPaye) {
                next.taxID = resolvedPaye;
                changed = true;
            }
            if (canUpdatePaye && resolvedPaye && normalizeText(row?.taxProfileId) !== resolvedPaye) {
                next.taxProfileId = resolvedPaye;
                changed = true;
            }
            return next;
        });
        return { rows: updatedRows, changed };
    }
    async refreshPayrollApprovalIdentifiers(approval) {
        const rawRows = Array.isArray(approval?.data)
            ? approval.data
            : this.resolvePayrollApprovalRows(approval?.data);
        if (!rawRows.length)
            return false;
        const { rows: updatedRows, changed } = await this.hydratePayrollRowIdentifiers(rawRows, approval.entity);
        if (changed) {
            approval.data = updatedRows;
            approval.markModified('data');
        }
        return changed;
    }
    async getPayrollApprovalById(user, approvalId) {
        const approval = await this.payrollApprovalModel.findById(approvalId).lean();
        if (!approval) {
            throw new common_1.NotFoundException('Payroll approval request not found');
        }
        if (!this.canViewPayrollApproval(user, approval)) {
            throw new common_1.ForbiddenException('You are not allowed to view this approval request');
        }
        const baseData = this.resolvePayrollApprovalRows(approval.data);
        const approvalPeriodDate = approval.processedAt ??
            approval.postingApprovedAt ??
            approval.approverApprovedAt ??
            approval.reviewerApprovedAt ??
            approval.createdAt ??
            new Date();
        let viewData = baseData;
        let viewTypes = Array.isArray(approval.types) && approval.types.length
            ? approval.types
            : Array.from(new Set(baseData.map((row) => row?.type).filter(Boolean)));
        if (baseData.length > 0) {
            const breakdown = await this.buildApprovalDisplayData(baseData, approval.entity, approvalPeriodDate);
            if (breakdown?.rows?.length) {
                viewData = breakdown.rows;
                viewTypes = breakdown.types;
            }
            else if (breakdown?.types?.length) {
                viewTypes = breakdown.types;
            }
        }
        const totals = this.computeSectionTotals(viewData);
        const responsePayload = { ...approval, data: viewData, totals, types: viewTypes };
        const [enriched] = await this.enrichPayrollApprovals([responsePayload], approval.entity);
        return {
            status: 200,
            data: enriched ?? responsePayload,
        };
    }
    async updatePayrollApprovalComment(approvalId, user, payload) {
        const approval = await this.payrollApprovalModel.findById(approvalId);
        if (!approval) {
            throw new common_1.NotFoundException('Payroll approval request not found');
        }
        if (this.isAuditDepartment(user)) {
            throw new common_1.ForbiddenException('Audit department has read-only access to payroll approvals.');
        }
        const initiatorComment = typeof payload?.initiatorComment === 'string' ? payload.initiatorComment.trim() : undefined;
        const reviewerComment = typeof payload?.reviewerComment === 'string' ? payload.reviewerComment.trim() : undefined;
        if (initiatorComment === undefined && reviewerComment === undefined) {
            throw new common_1.BadRequestException('No comment provided');
        }
        const hasFinanceScope = this.hasFinanceScope(user) || this.userHasSuperAdminRole(user);
        if (initiatorComment !== undefined) {
            if (!this.isInitiator(user, approval) && !hasFinanceScope) {
                throw new common_1.ForbiddenException('Only the initiator can update this comment.');
            }
            approval.initiatorComment = initiatorComment || undefined;
        }
        if (reviewerComment !== undefined) {
            if (!this.isReviewer(user, approval) && !hasFinanceScope) {
                throw new common_1.ForbiddenException('Only the reviewer can update this comment.');
            }
            approval.reviewerComment = reviewerComment || undefined;
        }
        await approval.save();
        await this.syncLeaveAllowanceApprovalRecord(approval);
        return { status: 200, message: 'Comment updated successfully.' };
    }
    async approvePayroll(approvalId, user, comment) {
        const approval = await this.payrollApprovalModel.findById(approvalId);
        if (!approval) {
            throw new common_1.NotFoundException('Payroll approval request not found');
        }
        if (this.isAuditDepartment(user)) {
            throw new common_1.ForbiddenException('Audit department has read-only access to payroll approvals.');
        }
        if (approval.status === PAYROLL_APPROVAL_STATUS.APPROVED) {
            throw new common_1.BadRequestException('Payroll batch already approved');
        }
        if (approval.status === PAYROLL_APPROVAL_STATUS.REJECTED) {
            throw new common_1.BadRequestException('Payroll batch has been rejected');
        }
        const userId = this.normalizeUserId(user?._id);
        const actorName = this.composeUserName(user);
        const entityName = await this.resolveEntityName(approval.entity);
        const hasFinanceScope = this.hasFinanceScope(user);
        const isSuperAdmin = this.userHasSuperAdminRole(user);
        const reviewerComment = typeof comment === 'string' && comment.trim() ? comment.trim() : '';
        if (approval.status === PAYROLL_APPROVAL_STATUS.PENDING_REVIEW) {
            if (!this.isReviewer(user, approval) && !hasFinanceScope) {
                throw new common_1.ForbiddenException('Only configured reviewers can approve at this stage');
            }
            approval.reviewerApprovedBy = userId ?? approval.reviewerApprovedBy;
            approval.reviewerApprovedByName = actorName ?? approval.reviewerApprovedByName;
            approval.reviewerApprovedAt = new Date();
            if (reviewerComment) {
                approval.reviewerComment = reviewerComment;
            }
            approval.status = PAYROLL_APPROVAL_STATUS.PENDING_APPROVAL;
            approval.currentStage = 'APPROVER';
            await approval.save();
            await this.syncLeaveAllowanceApprovalRecord(approval);
            const monthLabel = this.resolveApprovalMonthLabel(approval);
            await this.notifyStageAssignees(approval.approverIds ?? [], approval._id.toString(), entityName, monthLabel, 'APPROVER');
            return {
                status: 200,
                message: 'Payroll approved and escalated to final approvers.',
            };
        }
        if (approval.status === PAYROLL_APPROVAL_STATUS.PENDING_APPROVAL) {
            if (!this.isApprover(user, approval) && !hasFinanceScope) {
                throw new common_1.ForbiddenException('Only configured approvers can approve at this stage');
            }
            approval.approverApprovedBy = userId ?? approval.approverApprovedBy;
            approval.approverApprovedByName = actorName ?? approval.approverApprovedByName;
            approval.approverApprovedAt = new Date();
            approval.status = PAYROLL_APPROVAL_STATUS.PENDING_POSTING;
            approval.currentStage = 'POSTING';
            const entityId = await this.normalizeEntityIdStrict(approval.entity);
            const createdAt = approval.createdAt ?? new Date();
            const periodStart = new Date(createdAt.getFullYear(), createdAt.getMonth(), 1);
            const periodEnd = new Date(createdAt.getFullYear(), createdAt.getMonth() + 1, 1);
            const types = (approval.types?.length ? approval.types : approval.data.map((row) => row?.type).filter(Boolean)) ||
                [];
            const uniqueTypes = Array.from(new Set(types.length ? types : ['salary']));
            const existing = await this.processedPayrollModel.exists({
                entity: { $in: [entityId, approval.entity] },
                type: { $in: uniqueTypes },
                createdAt: { $gte: periodStart, $lt: periodEnd },
            });
            if (existing) {
                throw new common_1.BadRequestException(`A processed payroll already exists for ${uniqueTypes.join(', ')} in ${periodStart.toLocaleString('default', {
                    month: 'long',
                    year: 'numeric',
                })}.`);
            }
            const periodDate = approval.processedAt ??
                approval.postingApprovedAt ??
                approval.approverApprovedAt ??
                approval.reviewerApprovedAt ??
                approval.createdAt ??
                new Date();
            await this.persistProcessedPayroll(approval.batchId, approval.data, approval.entity, periodDate);
            await approval.save();
            await this.syncLeaveAllowanceApprovalRecord(approval);
            const monthLabel = this.resolveApprovalMonthLabel(approval);
            await this.notifyStageAssignees(approval.postingIds ?? [], approval._id.toString(), entityName, monthLabel, 'POSTING');
            return {
                status: 200,
                message: 'Payroll approved and forwarded for posting.',
            };
        }
        if (approval.status === PAYROLL_APPROVAL_STATUS.PENDING_POSTING) {
            const canPost = this.isPoster(user, approval) || hasFinanceScope || isSuperAdmin;
            if (!canPost) {
                throw new common_1.ForbiddenException('Only the configured poster or super admin can complete posting at this stage');
            }
            approval.postingApprovedBy = userId ?? approval.postingApprovedBy;
            approval.postingApprovedByName = actorName ?? approval.postingApprovedByName;
            approval.postingApprovedAt = new Date();
            approval.status = PAYROLL_APPROVAL_STATUS.APPROVED;
            approval.currentStage = 'POSTING';
            approval.processedAt = new Date();
            const periodDate = approval.processedAt ??
                approval.postingApprovedAt ??
                approval.approverApprovedAt ??
                approval.reviewerApprovedAt ??
                approval.createdAt ??
                new Date();
            await this.persistProcessedPayroll(approval.batchId, approval.data, approval.entity, periodDate);
            await approval.save();
            await this.syncLeaveAllowanceApprovalRecord(approval);
            await this.notifyCompletion(approval, entityName);
            return {
                status: 200,
                message: 'Payroll posted and processed successfully.',
            };
        }
        throw new common_1.BadRequestException('Invalid approval status');
    }
    async rejectPayroll(approvalId, user, reason) {
        const approval = await this.payrollApprovalModel.findById(approvalId);
        if (!approval) {
            throw new common_1.NotFoundException('Payroll approval request not found');
        }
        if (this.isAuditDepartment(user)) {
            throw new common_1.ForbiddenException('Audit department has read-only access to payroll approvals.');
        }
        if (approval.status === PAYROLL_APPROVAL_STATUS.APPROVED) {
            throw new common_1.BadRequestException('Payroll batch already approved');
        }
        if (approval.status === PAYROLL_APPROVAL_STATUS.REJECTED) {
            throw new common_1.BadRequestException('Payroll batch has already been rejected');
        }
        const hasFinanceScope = this.hasFinanceScope(user);
        const entityName = await this.resolveEntityName(approval.entity);
        if (approval.status === PAYROLL_APPROVAL_STATUS.PENDING_REVIEW) {
            if (!this.isReviewer(user, approval) && !hasFinanceScope) {
                throw new common_1.ForbiddenException('Only the assigned reviewer can reject at this stage');
            }
        }
        else if (approval.status === PAYROLL_APPROVAL_STATUS.PENDING_APPROVAL) {
            if (!this.isApprover(user, approval) && !hasFinanceScope) {
                throw new common_1.ForbiddenException('Only the assigned approver can reject at this stage');
            }
        }
        else if (approval.status === PAYROLL_APPROVAL_STATUS.PENDING_POSTING) {
            const canPost = this.isPoster(user, approval) || hasFinanceScope || this.userHasSuperAdminRole(user);
            if (!canPost) {
                throw new common_1.ForbiddenException('Only the assigned poster can reject at this stage');
            }
        }
        else {
            throw new common_1.BadRequestException('This payroll batch can no longer be rejected');
        }
        approval.status = PAYROLL_APPROVAL_STATUS.REJECTED;
        approval.rejectionReason = reason;
        await approval.save();
        await this.syncLeaveAllowanceApprovalRecord(approval);
        await this.notifyRejection(approval, entityName);
        return { status: 200, message: 'Payroll batch rejected successfully.' };
    }
    async getPayrollWorkflowConfigs(user, entity) {
        if (!this.hasFinanceScope(user)) {
            throw new common_1.ForbiddenException('You do not have permission to view workflow configurations.');
        }
        const query = {};
        if (entity) {
            query.entity = new mongoose_2.Types.ObjectId(await this.normalizeEntityIdStrict(entity));
        }
        const configs = await this.payrollWorkflowModel
            .find(query)
            .populate('entity', 'name short code')
            .lean();
        return { status: 200, data: configs };
    }
    async getWorkflowRoleFromModel(workflowModel, user, entity, scanAll = false) {
        const userIdentifiers = this.collectIdentifierValues(user?.id, user?._id, user?.userId, user?.email)
            .map((value) => String(value).trim())
            .filter((value) => value &&
            value.toLowerCase() !== 'null' &&
            value.toLowerCase() !== 'undefined' &&
            value.toLowerCase() !== '[object object]');
        const identifierSet = new Set(userIdentifiers.map((value) => value.toLowerCase()));
        const normalizedUserId = this.normalizeUserId(user?.id ??
            user?._id ??
            user?.userId ??
            user?.employeeId);
        const entityValue = entity;
        const readList = (...values) => values.flatMap((value) => (Array.isArray(value) ? value : value ? [value] : []));
        const matchesNormalizedUserId = (value) => {
            if (!normalizedUserId || value == null)
                return false;
            if (Array.isArray(value)) {
                return value.some((entry) => matchesNormalizedUserId(entry));
            }
            const normalized = this.normalizeUserId(value);
            if (normalized) {
                return normalized === normalizedUserId;
            }
            const raw = typeof value === 'string' ? value.trim() : '';
            return raw ? raw.toLowerCase() === normalizedUserId.toLowerCase() : false;
        };
        const matchesIdentifier = (value) => {
            if (matchesNormalizedUserId(value)) {
                return true;
            }
            const candidates = this.collectIdentifierValues(value);
            return candidates.some((candidate) => {
                const normalized = String(candidate ?? '').trim();
                if (!normalized)
                    return false;
                const tokens = normalized
                    .split(',')
                    .map((part) => part.trim())
                    .filter(Boolean);
                return tokens.some((token) => {
                    const lowered = token.toLowerCase();
                    if (lowered === 'null' || lowered === 'undefined' || lowered === '[object object]') {
                        return false;
                    }
                    return identifierSet.has(lowered);
                });
            });
        };
        if (!identifierSet.size) {
            return {
                status: 200,
                data: {
                    entity: null,
                    isFinalApprover: false,
                    isPoster: false,
                    isAuditViewer: false,
                    isReviewer: false,
                    isInitiator: false,
                    entities: [],
                    entityCount: 0,
                },
            };
        }
        let entityId = null;
        let entityString = null;
        if (entityValue) {
            try {
                entityId = new mongoose_2.Types.ObjectId(entityValue);
            }
            catch {
                entityString = String(entityValue).trim();
            }
        }
        if (scanAll) {
            if (!userIdentifiers.length) {
                return {
                    status: 200,
                    data: {
                        entity: null,
                        isFinalApprover: false,
                        isPoster: false,
                        isAuditViewer: false,
                        isReviewer: false,
                        isInitiator: false,
                        entities: [],
                        entityCount: 0,
                    },
                };
            }
            const identifierTokens = Array.from(new Set(userIdentifiers.map((value) => String(value).trim()).filter(Boolean)));
            const identifierObjectIds = identifierTokens
                .filter((value) => mongoose_2.Types.ObjectId.isValid(value))
                .map((value) => new mongoose_2.Types.ObjectId(value));
            if (!identifierTokens.length) {
                return {
                    status: 200,
                    data: {
                        entity: null,
                        isFinalApprover: false,
                        isPoster: false,
                        isAuditViewer: false,
                        isReviewer: false,
                        isInitiator: false,
                        entities: [],
                        entityCount: 0,
                    },
                };
            }
            const scanQueryOr = [
                { approverIds: { $in: identifierTokens } },
                { postingIds: { $in: identifierTokens } },
                { auditViewerIds: { $in: identifierTokens } },
                { reviewerIds: { $in: identifierTokens } },
                { initiatorIds: { $in: identifierTokens } },
                { approvers: { $in: identifierTokens } },
                { posters: { $in: identifierTokens } },
                { posterIds: { $in: identifierTokens } },
                { auditViewers: { $in: identifierTokens } },
                { reviewers: { $in: identifierTokens } },
                { initiators: { $in: identifierTokens } },
            ];
            if (identifierObjectIds.length) {
                scanQueryOr.push({ approverIds: { $in: identifierObjectIds } }, { postingIds: { $in: identifierObjectIds } }, { auditViewerIds: { $in: identifierObjectIds } }, { reviewerIds: { $in: identifierObjectIds } }, { initiatorIds: { $in: identifierObjectIds } });
            }
            const scanQuery = { $or: scanQueryOr };
            const configs = await workflowModel
                .find(scanQuery, {
                approverIds: 1,
                postingIds: 1,
                auditViewerIds: 1,
                reviewerIds: 1,
                initiatorIds: 1,
                entity: 1,
                approvers: 1,
                posters: 1,
                posterIds: 1,
                auditViewers: 1,
                reviewers: 1,
                initiators: 1,
            })
                .lean();
            const isFinalApprover = configs.some((config) => readList(config?.approverIds, config?.approvers).some(matchesIdentifier));
            const isPoster = configs.some((config) => readList(config?.postingIds, config?.posters, config?.posterIds).some(matchesIdentifier));
            const isAuditViewer = configs.some((config) => readList(config?.auditViewerIds, config?.auditViewers).some(matchesIdentifier));
            const isReviewer = configs.some((config) => readList(config?.reviewerIds, config?.reviewers).some(matchesIdentifier));
            const isInitiator = configs.some((config) => readList(config?.initiatorIds, config?.initiators).some(matchesIdentifier));
            const matchedEntities = new Set();
            configs.forEach((config) => {
                const match = readList(config?.approverIds, config?.approvers).some(matchesIdentifier) ||
                    readList(config?.postingIds, config?.posters, config?.posterIds).some(matchesIdentifier) ||
                    readList(config?.auditViewerIds, config?.auditViewers).some(matchesIdentifier) ||
                    readList(config?.reviewerIds, config?.reviewers).some(matchesIdentifier) ||
                    readList(config?.initiatorIds, config?.initiators).some(matchesIdentifier);
                if (match && config?.entity) {
                    matchedEntities.add(String(config.entity));
                }
            });
            const entities = Array.from(matchedEntities);
            return {
                status: 200,
                data: {
                    entity: entityId ?? entityString,
                    isFinalApprover: Boolean(isFinalApprover),
                    isPoster: Boolean(isPoster),
                    isAuditViewer: Boolean(isAuditViewer),
                    isReviewer: Boolean(isReviewer),
                    isInitiator: Boolean(isInitiator),
                    entities,
                    entityCount: entities.length,
                },
            };
        }
        if (!entityId && !entityString) {
            return {
                status: 200,
                data: {
                    entity: null,
                    isFinalApprover: false,
                    isPoster: false,
                    isAuditViewer: false,
                    isReviewer: false,
                    isInitiator: false,
                    entities: [],
                    entityCount: 0,
                },
            };
        }
        const config = await workflowModel
            .findOne({
            $or: [
                entityId ? { entity: entityId } : null,
                entityString ? { entity: entityString } : null,
            ].filter(Boolean),
        })
            .lean();
        if (!config) {
            return {
                status: 200,
                data: {
                    entity: entityId ?? entityString,
                    isFinalApprover: false,
                    isPoster: false,
                    isAuditViewer: false,
                    isReviewer: false,
                    isInitiator: false,
                    entities: [],
                    entityCount: 0,
                },
            };
        }
        const approverIds = readList(config.approverIds, config?.approvers);
        const postingIds = readList(config.postingIds, config?.posters, config?.posterIds);
        const auditViewerIds = readList(config.auditViewerIds, config?.auditViewers);
        const reviewerIds = readList(config.reviewerIds, config?.reviewers);
        const initiatorIds = readList(config.initiatorIds, config?.initiators);
        const isFinalApprover = approverIds.some(matchesIdentifier);
        const isPoster = postingIds.some(matchesIdentifier);
        const isAuditViewer = auditViewerIds.some(matchesIdentifier);
        const isReviewer = reviewerIds.some(matchesIdentifier);
        const isInitiator = initiatorIds.some(matchesIdentifier);
        const hasMatch = isFinalApprover || isPoster || isAuditViewer || isReviewer || isInitiator;
        return {
            status: 200,
            data: {
                entity: entityId ?? entityString,
                isFinalApprover,
                isPoster,
                isAuditViewer,
                isReviewer,
                isInitiator,
                entities: hasMatch && (entityId || entityString) ? [String(entityId ?? entityString)] : [],
                entityCount: hasMatch && (entityId || entityString) ? 1 : 0,
            },
        };
    }
    async getPayrollWorkflowRole(user, entity, scanAll = false) {
        return this.getWorkflowRoleFromModel(this.payrollWorkflowModel, user, entity, scanAll);
    }
    async getLeaveAllowanceWorkflowRole(user, entity, scanAll = false) {
        return this.getWorkflowRoleFromModel(this.leaveAllowanceWorkflowModel, user, entity, scanAll);
    }
    async savePayrollWorkflowConfig(user, payload) {
        this.assertSuperAdmin(user);
        if (!this.hasFinanceScope(user)) {
            throw new common_1.ForbiddenException('You do not have permission to update workflow configurations.');
        }
        const entityId = await this.normalizeEntityIdStrict(payload?.entity);
        const initiatorIds = this.normalizeUserIdList(payload?.initiators);
        const reviewerIds = this.normalizeUserIdList(payload?.reviewers);
        const auditViewerIds = this.normalizeUserIdList(payload?.auditViewers);
        const approverIds = this.normalizeUserIdList(payload?.approvers);
        const postingIds = this.normalizeUserIdList(payload?.posters ?? payload?.postingIds);
        if (!reviewerIds.length) {
            throw new common_1.BadRequestException('At least one reviewer must be selected.');
        }
        if (!approverIds.length) {
            throw new common_1.BadRequestException('At least one approver must be selected.');
        }
        if (!postingIds.length) {
            throw new common_1.BadRequestException('At least one poster must be selected.');
        }
        const config = await this.payrollWorkflowModel
            .findOneAndUpdate({ entity: new mongoose_2.Types.ObjectId(entityId) }, {
            $set: {
                entity: new mongoose_2.Types.ObjectId(entityId),
                initiatorIds,
                reviewerIds,
                auditViewerIds,
                approverIds,
                postingIds,
            },
        }, { upsert: true, new: true, setDefaultsOnInsert: true })
            .populate('entity', 'name short code')
            .lean();
        return { status: 200, data: config };
    }
    async getLeaveAllowanceWorkflowConfigs(user, entity) {
        if (!this.hasFinanceScope(user)) {
            throw new common_1.ForbiddenException('You do not have permission to view workflow configurations.');
        }
        const query = {};
        if (entity) {
            query.entity = new mongoose_2.Types.ObjectId(await this.normalizeEntityIdStrict(entity));
        }
        const configs = await this.leaveAllowanceWorkflowModel
            .find(query)
            .populate('entity', 'name short code')
            .lean();
        return { status: 200, data: configs };
    }
    async saveLeaveAllowanceWorkflowConfig(user, payload) {
        this.assertSuperAdmin(user);
        if (!this.hasFinanceScope(user)) {
            throw new common_1.ForbiddenException('You do not have permission to update workflow configurations.');
        }
        const entityId = await this.normalizeEntityIdStrict(payload?.entity);
        const initiatorIds = this.normalizeUserIdList(payload?.initiators);
        const reviewerIds = this.normalizeUserIdList(payload?.reviewers);
        const auditViewerIds = this.normalizeUserIdList(payload?.auditViewers);
        const approverIds = this.normalizeUserIdList(payload?.approvers);
        const postingIds = this.normalizeUserIdList(payload?.posters ?? payload?.postingIds);
        const hasCompanyGL = payload?.companyGL !== undefined;
        const companyGL = hasCompanyGL
            ? this.normalizePayrollText(payload?.companyGL) ?? ''
            : undefined;
        if (!reviewerIds.length) {
            throw new common_1.BadRequestException('At least one reviewer must be selected.');
        }
        if (!approverIds.length) {
            throw new common_1.BadRequestException('At least one approver must be selected.');
        }
        if (!postingIds.length) {
            throw new common_1.BadRequestException('At least one poster must be selected.');
        }
        const updatePayload = {
            entity: new mongoose_2.Types.ObjectId(entityId),
            initiatorIds,
            reviewerIds,
            auditViewerIds,
            approverIds,
            postingIds,
        };
        if (hasCompanyGL) {
            updatePayload.companyGL = companyGL;
        }
        const config = await this.leaveAllowanceWorkflowModel
            .findOneAndUpdate({ entity: new mongoose_2.Types.ObjectId(entityId) }, {
            $set: updatePayload,
        }, { upsert: true, new: true, setDefaultsOnInsert: true })
            .populate('entity', 'name short code')
            .lean();
        return { status: 200, data: config };
    }
    getUserIdentifierSet(user) {
        const identifiers = this.collectIdentifierValues(user?.id, user?._id, user?.userId, user?.email)
            .map((value) => String(value ?? '').trim().toLowerCase())
            .filter((value) => value &&
            value !== 'null' &&
            value !== 'undefined' &&
            value !== '[object object]');
        return new Set(identifiers);
    }
    listIncludesUserIdentifier(values, identifierSet) {
        if (!identifierSet.size || values == null)
            return false;
        const bucket = Array.isArray(values) ? values : [values];
        return bucket.some((entry) => {
            const candidates = this.collectIdentifierValues(entry);
            return candidates.some((candidate) => {
                const normalized = String(candidate ?? '').trim();
                if (!normalized)
                    return false;
                const tokens = normalized
                    .split(',')
                    .map((part) => part.trim().toLowerCase())
                    .filter((part) => part &&
                    part !== 'null' &&
                    part !== 'undefined' &&
                    part !== '[object object]');
                return tokens.some((token) => identifierSet.has(token));
            });
        });
    }
    isInitiator(user, approval) {
        const identifierSet = this.getUserIdentifierSet(user);
        return this.listIncludesUserIdentifier([approval.initiatorId, approval.requestedBy], identifierSet);
    }
    isReviewer(user, approval) {
        const identifierSet = this.getUserIdentifierSet(user);
        if (this.listIncludesUserIdentifier(approval.reviewerIds, identifierSet)) {
            return true;
        }
        return this.listIncludesUserIdentifier(approval.reviewerApprovedBy, identifierSet);
    }
    isApprover(user, approval) {
        const identifierSet = this.getUserIdentifierSet(user);
        if (this.listIncludesUserIdentifier(approval.approverIds, identifierSet)) {
            return true;
        }
        return this.listIncludesUserIdentifier(approval.approverApprovedBy, identifierSet);
    }
    isPoster(user, approval) {
        const identifierSet = this.getUserIdentifierSet(user);
        if (this.listIncludesUserIdentifier(approval.postingIds, identifierSet)) {
            return true;
        }
        return this.listIncludesUserIdentifier(approval.postingApprovedBy, identifierSet);
    }
    isAuditViewer(user, approval) {
        const identifierSet = this.getUserIdentifierSet(user);
        return this.listIncludesUserIdentifier(approval.auditViewerIds, identifierSet);
    }
    canViewFinanceOrAudit(user, approval) {
        if (!approval)
            return false;
        const status = String(approval.status ?? '').toUpperCase();
        if (!PayrollService_1.FINANCE_AUDIT_VIEW_STATUSES.has(status)) {
            return false;
        }
        return (this.hasFinanceScope(user) ||
            this.isAuditDepartment(user) ||
            this.isAuditViewer(user, approval));
    }
    canViewPayrollApproval(user, approval) {
        if (!approval)
            return false;
        if (this.userHasSuperAdminRole(user))
            return true;
        if (this.isInitiator(user, approval))
            return true;
        if (this.isReviewer(user, approval))
            return true;
        if (this.canViewFinanceOrAudit(user, approval))
            return true;
        if (this.isApprover(user, approval) &&
            PayrollService_1.APPROVER_VIEW_STATUSES.has(String(approval.status))) {
            return true;
        }
        if (this.isPoster(user, approval) &&
            PayrollService_1.POSTER_VIEW_STATUSES.has(String(approval.status))) {
            return true;
        }
        return false;
    }
    isPayslipReviewer(user, approval) {
        const userId = this.normalizeUserId(user?._id);
        if (!userId || !Array.isArray(approval.reviewerIds))
            return false;
        return approval.reviewerIds.includes(userId);
    }
    isPayslipApprover(user, approval) {
        const userId = this.normalizeUserId(user?._id);
        if (!userId || !Array.isArray(approval.approverIds))
            return false;
        return approval.approverIds.includes(userId);
    }
    async persistProcessedPayroll(batchId, payrollData, entity, periodDate) {
        if (!Array.isArray(payrollData) || !payrollData.length) {
            throw new common_1.BadRequestException('No payroll data available for processing');
        }
        const existing = await this.processedPayrollModel.exists({ batchId });
        if (existing) {
            return;
        }
        const { workingDays, performanceBrackets } = await this.loadEntityPayrollSettings(entity);
        const normalizedData = this.normalizePayrollData(payrollData, {
            workingDays,
            performanceBrackets,
        });
        const resolvedPeriodDate = periodDate instanceof Date && !Number.isNaN(periodDate.getTime()) ? periodDate : new Date();
        const periodKey = this.buildPeriodKey(resolvedPeriodDate);
        const periodLabel = this.formatPayrollMonthLabel(resolvedPeriodDate);
        const periodFields = {
            periodDate: resolvedPeriodDate,
            periodKey,
            period: periodLabel,
        };
        const accountDetailOf = (row) => row?.accountDetail ??
            row?.employeeInformation?.accountDetail ??
            null;
        const resolveNhfAccount = (row) => {
            const detail = accountDetailOf(row);
            return (row?.nhfAccount ??
                detail?.nhf ??
                detail?.nhfAccount ??
                null);
        };
        const resolvePayeAccount = (row) => {
            const detail = accountDetailOf(row);
            return (row?.payeAccount ??
                detail?.payeAccount ??
                detail?.taxProfileId ??
                null);
        };
        const resolvePensionAccount = (row) => {
            const detail = accountDetailOf(row);
            return (row?.pensionAccount ??
                detail?.pensionAccount ??
                detail?.rsaNumber ??
                null);
        };
        const resolvePensionProvider = (row) => {
            const detail = accountDetailOf(row);
            return (row?.pensionProvider ??
                detail?.pensionProvider ??
                detail?.pfa ??
                null);
        };
        const resolveBranchName = (row) => {
            const raw = row?.branch ??
                row?.branchName ??
                row?.branchname ??
                row?.branchCode ??
                row?.branch_code ??
                row?.department ??
                row?.departmentName;
            if (!raw)
                return null;
            if (typeof raw === 'string')
                return raw.trim() || null;
            if (typeof raw === 'object') {
                return raw?.name ?? raw?.short ?? raw?.code ?? null;
            }
            try {
                return String(raw);
            }
            catch {
                return null;
            }
        };
        const hasSalary = normalizedData.some((item) => item.type === 'salary');
        const hasReimbursable = normalizedData.some((item) => item.type === 'reimbursable');
        const hasVariable = normalizedData.some((item) => item.type === 'variable');
        const resolveStaffId = (item) => item?.staffId ??
            item?.employeeId ??
            item?.userId ??
            item?.id ??
            null;
        const resolveAccountNo = (item) => item?.accountNo ??
            item?.accountNumber ??
            item?.account ??
            item?.addosserAccount ??
            item?.atlasAccount ??
            item?.bankAccount ??
            item?.employeeAccount ??
            null;
        const defaultPayslipApproval = 'Pending';
        if (hasSalary) {
            const salaryItems = normalizedData
                .filter((item) => item.type === 'salary')
                .map((item) => {
                const prorateFactor = this.resolveProrationFactor(item, workingDays, {
                    type: 'salary',
                    periodDate: resolvedPeriodDate,
                });
                const branchName = resolveBranchName(item);
                const nhfAccount = resolveNhfAccount(item);
                const payeAccount = resolvePayeAccount(item);
                const pensionAccount = resolvePensionAccount(item);
                const pensionProvider = resolvePensionProvider(item);
                return {
                    batchId,
                    ...periodFields,
                    branch: branchName,
                    name: item.name,
                    account: item?.account || item?.addosserAccount,
                    accountNo: resolveAccountNo(item),
                    staffId: resolveStaffId(item),
                    grade: item.grade,
                    basic: item.basic * prorateFactor,
                    housing: item.housing * prorateFactor,
                    transport: item.transport * prorateFactor,
                    dress: item.dress * prorateFactor,
                    utilities: item.utilities * prorateFactor,
                    lunch: item.lunch * prorateFactor,
                    telephone: item.telephone * prorateFactor,
                    gross: item.gross * prorateFactor,
                    pension: item.pension * prorateFactor,
                    companyPension: item.monthlyCompanyPension * prorateFactor,
                    nhf: item.nhf * prorateFactor,
                    paye: item.paye * prorateFactor,
                    amount: item.monthlyNet * prorateFactor,
                    type: 'salary',
                    status: 'Processed',
                    payslipApproval: defaultPayslipApproval,
                    entity,
                    nhfAccount,
                    payeAccount,
                    pensionAccount,
                    pensionProvider,
                };
            });
            const pensionData = salaryItems
                .filter((item) => item.pension || item.companyPension)
                .map(({ branch, name, grade, pensionAccount, pensionProvider, pension, companyPension, staffId, }) => {
                const employeeContribution = this.toSafeNumber(pension);
                const employerContribution = this.toSafeNumber(companyPension);
                const total = this.round(employeeContribution + employerContribution);
                const pensionAcctNo = pensionAccount ?? resolveAccountNo({
                    account: pensionAccount,
                    accountNumber: pensionAccount,
                });
                return {
                    batchId,
                    ...periodFields,
                    branch,
                    account: pensionAccount,
                    accountNo: pensionAcctNo,
                    pensionAccount,
                    pensionProvider,
                    staffId,
                    provider: pensionProvider,
                    pension: employeeContribution,
                    companyPension: employerContribution,
                    amount: total,
                    type: 'pension',
                    name,
                    grade,
                    status: 'Processed',
                    payslipApproval: defaultPayslipApproval,
                    entity,
                };
            });
            const nhfData = salaryItems
                .filter((item) => item.nhf)
                .map(({ branch, name, grade, nhfAccount, nhf, staffId }) => ({
                batchId,
                ...periodFields,
                branch,
                account: nhfAccount,
                accountNo: nhfAccount ?? resolveAccountNo({ account: nhfAccount, accountNumber: nhfAccount }),
                staffId,
                nhfAccount,
                nhf: nhfAccount,
                amount: nhf,
                type: 'nhf',
                name,
                grade,
                status: 'Processed',
                payslipApproval: defaultPayslipApproval,
                entity,
            }));
            const payeData = salaryItems
                .filter((item) => item.paye)
                .map(({ branch, name, grade, payeAccount, paye, staffId }) => ({
                batchId,
                ...periodFields,
                branch,
                account: payeAccount,
                accountNo: payeAccount ?? resolveAccountNo({ account: payeAccount, accountNumber: payeAccount }),
                staffId,
                payeAccount,
                amount: paye,
                type: 'paye',
                name,
                grade,
                status: 'Processed',
                payslipApproval: defaultPayslipApproval,
                entity,
            }));
            await this.processedPayrollModel.insertMany([
                ...salaryItems.map(({ nhfAccount, payeAccount, pensionAccount, pensionProvider, ...rest }) => rest),
                ...pensionData,
                ...payeData,
                ...nhfData,
            ]);
        }
        if (hasReimbursable) {
            const reimbursableData = normalizedData
                .filter((item) => item.type === 'reimbursable')
                .map((item) => {
                const prorateFactor = this.resolveProrationFactor(item, workingDays, {
                    type: 'reimbursable',
                    periodDate: resolvedPeriodDate,
                });
                const branchName = resolveBranchName(item);
                return {
                    batchId,
                    ...periodFields,
                    branch: branchName,
                    name: item.name,
                    account: item?.addosserAccount,
                    accountNo: resolveAccountNo(item),
                    staffId: resolveStaffId(item),
                    grade: item.grade,
                    amount: item.reimbursable * prorateFactor,
                    type: 'reimbursable',
                    status: 'Processed',
                    payslipApproval: defaultPayslipApproval,
                    entity,
                };
            });
            if (reimbursableData.length) {
                await this.processedPayrollModel.insertMany(reimbursableData);
            }
        }
        if (hasVariable) {
            const variableData = normalizedData.filter((item) => item.type === 'variable');
            const bankData = variableData.map((item) => {
                const prorateFactor = this.resolveProrationFactor(item, workingDays, {
                    type: 'variable',
                    periodDate: resolvedPeriodDate,
                });
                const variableBase = item.variable * prorateFactor;
                const branchName = resolveBranchName(item);
                return {
                    batchId,
                    ...periodFields,
                    branch: branchName,
                    name: item.name,
                    account: item?.atlasAccount || item?.addosserAccount,
                    accountNo: resolveAccountNo(item),
                    staffId: resolveStaffId(item),
                    grade: item.grade,
                    amount: variableBase / 2,
                    type: 'bank',
                    status: 'Processed',
                    payslipApproval: defaultPayslipApproval,
                    entity,
                };
            });
            const individualData = variableData.map((item) => {
                const prorateFactor = this.resolveProrationFactor(item, workingDays, {
                    type: 'variable',
                    periodDate: resolvedPeriodDate,
                });
                const variableBase = item.variable * prorateFactor;
                const performancePercent = this.normalizePercent(item.proratePercent ??
                    this.resolvePerformancePercent(item.performanceScore, performanceBrackets) ??
                    100, 100);
                const branchName = resolveBranchName(item);
                return {
                    batchId,
                    ...periodFields,
                    branch: branchName,
                    name: item.name,
                    account: item?.atlasAccount || item?.addosserAccount,
                    accountNo: resolveAccountNo(item),
                    staffId: resolveStaffId(item),
                    grade: item.grade,
                    amount: (variableBase / 2) * (performancePercent / 100),
                    type: 'individual',
                    status: 'Processed',
                    payslipApproval: defaultPayslipApproval,
                    entity,
                };
            });
            await this.processedPayrollModel.insertMany([...bankData, ...individualData]);
        }
    }
    formatPayrollMonthLabel(value) {
        const date = value ? new Date(value) : new Date();
        if (Number.isNaN(date.getTime())) {
            return new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
        }
        return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    }
    resolveApprovalMonthLabel(approval) {
        const approvalAny = approval;
        const candidate = approvalAny?.processedAt ??
            approvalAny?.postingApprovedAt ??
            approvalAny?.approverApprovedAt ??
            approvalAny?.reviewerApprovedAt ??
            approvalAny?.gmdApprovedAt ??
            approvalAny?.mdApprovedAt ??
            approval?.createdAt ??
            new Date();
        return this.formatPayrollMonthLabel(candidate);
    }
    async isPayrollEmailEnabled() {
        const config = await this.smtpConfigService?.getConfig();
        if (config && config.payrollEmailEnabled === false) {
            return false;
        }
        return true;
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
    buildPortalUrl(path) {
        const base = this.getPortalBaseUrl();
        if (!path)
            return base;
        if (/^https?:\/\//i.test(path)) {
            return path;
        }
        return `${base}${path.startsWith('/') ? path : `/${path}`}`;
    }
    normalizeEmail(value) {
        if (typeof value !== 'string')
            return null;
        const trimmed = value.trim();
        return trimmed ? trimmed : null;
    }
    async collectNotificationEmails(userIds) {
        const recipients = new Set();
        const uniqueIds = Array.from(new Set((userIds ?? []).map((value) => String(value)).filter(Boolean)));
        await Promise.all(uniqueIds.map(async (userId) => {
            const staff = await this.staffService.getById(userId).catch(() => null);
            if (!staff)
                return;
            const email = this.normalizeEmail(staff?.email);
            if (email)
                recipients.add(email);
            const deptEmail = this.normalizeEmail(typeof staff?.department === 'object'
                ? staff.department?.groupEmail
                : null);
            if (deptEmail)
                recipients.add(deptEmail);
        }));
        return Array.from(recipients);
    }
    async sendPayrollApprovalEmail(userIds, templateType, templateVariables) {
        if (!this.mailService || !userIds?.length)
            return;
        if (!(await this.isPayrollEmailEnabled()))
            return;
        const recipients = await this.collectNotificationEmails(userIds);
        if (!recipients.length)
            return;
        const results = await Promise.allSettled(recipients.map((to) => this.mailService.sendMail({ to, templateType, templateVariables })));
        results.forEach((result) => {
            if (result.status === 'rejected') {
                console.error('Failed to send payroll approval email', result.reason);
            }
        });
    }
    async notifyCompletion(approval, entityName) {
        const recipients = this.collectParticipantIds(approval);
        if (!recipients.length)
            return;
        const link = `/payroll/approvals/${approval._id.toString()}`;
        const monthLabel = this.resolveApprovalMonthLabel(approval);
        const approvalLink = this.buildPortalUrl('/payroll-approval');
        const message = `Payroll (${monthLabel}) for ${entityName} has been approved.`;
        await Promise.all(recipients.map((userId) => this.noticeService.createNotice({
            userId,
            message,
            link,
            type: 'payroll-approval-approved',
        })));
        await this.sendPayrollApprovalEmail(recipients, 'payroll-approval-approved', {
            entityName,
            periodLabel: monthLabel,
            approvalLink,
        });
        await this.notifyBankingOperations(approval, entityName);
    }
    async notifyRejection(approval, entityName) {
        const recipients = this.collectParticipantIds(approval);
        if (!recipients.length)
            return;
        const link = `/payroll/approvals/${approval._id.toString()}`;
        const monthLabel = this.resolveApprovalMonthLabel(approval);
        const approvalLink = this.buildPortalUrl('/payroll-approval');
        const message = `Payroll (${monthLabel}) for ${entityName} was rejected.`;
        await Promise.all(recipients.map((userId) => this.noticeService.createNotice({
            userId,
            message,
            link,
            type: 'payroll-approval-rejected',
        })));
        await this.sendPayrollApprovalEmail(recipients, 'payroll-approval-rejected', {
            entityName,
            periodLabel: monthLabel,
            approvalLink,
        });
    }
    collectParticipantIds(approval) {
        const recipients = new Set();
        const register = (value) => {
            if (value) {
                recipients.add(String(value));
            }
        };
        const registerList = (values) => {
            (values ?? []).forEach((value) => value && recipients.add(value));
        };
        register(approval.requestedBy);
        register(approval.initiatorId);
        registerList(approval.reviewerIds);
        registerList(approval.approverIds);
        registerList(approval.auditViewerIds);
        return Array.from(recipients);
    }
    async notifyStageAssignees(userIds, approvalId, entityName, monthLabel, stage) {
        if (!userIds?.length)
            return;
        const message = `Payroll (${monthLabel}) for ${entityName} requires your approval (${stage}).`;
        const link = `/payroll/approvals/${approvalId}`;
        const approvalLink = this.buildPortalUrl('/payroll-approval');
        await Promise.all(userIds.map((userId) => this.noticeService.createNotice({
            userId,
            message,
            link,
            type: 'payroll-approval',
        })));
        await this.sendPayrollApprovalEmail(userIds, 'payroll-approval', {
            entityName,
            periodLabel: monthLabel,
            stage,
            approvalLink,
        });
    }
    async notifyAuditViewers(userIds, approvalId, entityName, monthLabel) {
        if (!userIds?.length)
            return;
        const message = `Payroll (${monthLabel}) for ${entityName} is ready for audit/finance viewing.`;
        const link = `/payroll/approvals/${approvalId}`;
        const approvalLink = this.buildPortalUrl('/payroll-approval');
        await Promise.all(userIds.map((userId) => this.noticeService.createNotice({
            userId,
            message,
            link,
            type: 'payroll-approval-view',
        })));
        await this.sendPayrollApprovalEmail(userIds, 'payroll-approval-view', {
            entityName,
            periodLabel: monthLabel,
            approvalLink,
        });
    }
    async notifyBankingOperations(approval, entityName) {
        try {
            const keywords = [
                'head of banking operations',
                'banking operations',
                'hbo',
                'head of operations',
                'operations head',
            ];
            const candidates = await this.staffService.getStaffByRoleKeywords(keywords, approval.entity);
            const recipients = (candidates ?? [])
                .map((staff) => String(staff?._id ?? staff?.id ?? ''))
                .filter((value) => value && value !== 'undefined');
            if (!recipients.length)
                return;
            const link = `/payroll/approvals/${approval._id.toString()}`;
            const monthLabel = this.resolveApprovalMonthLabel(approval);
            const approvalLink = this.buildPortalUrl('/payroll-approval');
            const message = `Payroll (${monthLabel}) for ${entityName} has been approved and awaits banking operations funding.`;
            await Promise.all(recipients.map((userId) => this.noticeService.createNotice({
                userId,
                message,
                link,
                type: 'payroll-approval-banking',
            })));
            await this.sendPayrollApprovalEmail(recipients, 'payroll-approval-banking', {
                entityName,
                periodLabel: monthLabel,
                approvalLink,
            });
        }
        catch (error) {
        }
    }
    computeSectionTotals(rows) {
        const totals = { all: {} };
        const addValue = (bucket, key, value) => {
            if (!Number.isFinite(value))
                return;
            bucket[key] = (bucket[key] ?? 0) + value;
        };
        (rows ?? []).forEach((row) => {
            if (!row || typeof row !== 'object')
                return;
            const sectionKey = row.type ? String(row.type) : 'general';
            totals[sectionKey] = totals[sectionKey] ?? {};
            Object.entries(row).forEach(([key, rawValue]) => {
                if (key === 'type')
                    return;
                const numeric = typeof rawValue === 'number'
                    ? rawValue
                    : typeof rawValue === 'string'
                        ? Number(rawValue)
                        : NaN;
                if (!Number.isFinite(numeric))
                    return;
                addValue(totals[sectionKey], key, numeric);
                addValue(totals.all, key, numeric);
            });
        });
        return totals;
    }
    async buildApprovalDisplayData(rows, entity, periodDate) {
        if (!Array.isArray(rows) || !rows.length) {
            return { rows: [], types: [] };
        }
        const entityId = await this.normalizeEntityIdStrict(entity);
        const { workingDays, performanceBrackets } = await this.loadEntityPayrollSettings(entityId);
        const normalized = this.normalizePayrollData(rows, { workingDays, performanceBrackets })
            .map((row, index) => {
            const raw = rows[index];
            const hasExplicitProration = raw?.prorateValues !== undefined &&
                raw?.prorateValues !== null ||
                raw?.prorateBase !== undefined &&
                    raw?.prorateBase !== null ||
                raw?.proratePercent !== undefined &&
                    raw?.proratePercent !== null;
            return { ...row, __explicitProration: hasExplicitProration };
        });
        const roundVal = (value) => this.round(value, 2);
        const expanded = [];
        normalized.forEach((row) => {
            if (!row || typeof row !== 'object')
                return;
            const type = row.type ?? this.detectRowType(row);
            const proration = this.resolveProrationDetails(row, workingDays, {
                type,
                periodDate,
                respectProvided: true,
            });
            const factor = proration.factor;
            const withProration = {
                ...row,
                type,
                prorateValues: proration.workedDays,
                prorateBase: proration.baseDays,
            };
            if (type === 'salary') {
                const netBase = this.toSafeNumber(withProration.monthlyNet ?? withProration.netPay ?? withProration.net ?? withProration.amount, 0);
                const basic = roundVal(this.toSafeNumber(withProration.basic) * factor);
                const housing = roundVal(this.toSafeNumber(withProration.housing) * factor);
                const transport = roundVal(this.toSafeNumber(withProration.transport) * factor);
                const dress = roundVal(this.toSafeNumber(withProration.dress) * factor);
                const utilities = roundVal(this.toSafeNumber(withProration.utilities) * factor);
                const lunch = roundVal(this.toSafeNumber(withProration.lunch) * factor);
                const telephone = roundVal(this.toSafeNumber(withProration.telephone) * factor);
                const gross = roundVal(this.toSafeNumber(withProration.gross) * factor);
                const reconciled = this.reconcileSalaryComponents({
                    basic,
                    housing,
                    transport,
                    dress,
                    utilities,
                    lunch,
                    telephone,
                    gross,
                });
                const pension = roundVal(this.toSafeNumber(withProration.pension) * factor);
                const companyPension = roundVal(this.toSafeNumber(withProration.monthlyCompanyPension ?? withProration.companyPension) * factor);
                const monthlyCompanyPension = roundVal(this.toSafeNumber(withProration.monthlyCompanyPension ?? withProration.companyPension) * factor);
                const nhf = roundVal(this.toSafeNumber(withProration.nhf) * factor);
                const paye = roundVal(this.toSafeNumber(withProration.paye) * factor);
                let monthlyNet = roundVal(netBase * factor);
                const roundingGap = roundVal(reconciled.gross - (pension + nhf + paye + monthlyNet));
                if (roundingGap !== 0) {
                    monthlyNet = roundVal(monthlyNet + roundingGap);
                }
                expanded.push({
                    ...withProration,
                    type: 'salary',
                    ...reconciled,
                    pension,
                    companyPension,
                    monthlyCompanyPension,
                    nhf,
                    paye,
                    monthlyNet,
                    amount: monthlyNet,
                });
                return;
            }
            if (type === 'reimbursable') {
                const reimbursableBase = this.toSafeNumber(withProration.reimbursable ??
                    withProration.reimbursableAmount ??
                    withProration.remibursableAmount ??
                    withProration.amount, 0);
                const reimbursable = roundVal(reimbursableBase * factor);
                expanded.push({
                    ...withProration,
                    type: 'reimbursable',
                    reimbursable,
                    amount: reimbursable,
                });
                return;
            }
            if (type === 'bank' || type === 'individual') {
                expanded.push(withProration);
                return;
            }
            if (type !== 'variable') {
                expanded.push(withProration);
                return;
            }
            const baseVariable = this.toSafeNumber(this.parseBooleanFlag(withProration.prorationApplied)
                ? withProration.variable
                : withProration.baseVariable ?? withProration.variable, 0);
            const variableBase = roundVal(baseVariable * factor);
            const resolvedPercent = this.normalizePercent(withProration.proratePercent ??
                withProration.performancePercent ??
                this.resolvePerformancePercent(withProration.performanceScore, performanceBrackets) ??
                100, 100);
            const hasBankAmount = withProration.bankAmount !== undefined && withProration.bankAmount !== null;
            const hasIndividualAmount = withProration.individualAmount !== undefined &&
                withProration.individualAmount !== null;
            const derivedBankAmount = this.round(variableBase / 2, 2);
            const derivedIndividualAmount = this.round((variableBase / 2) * (resolvedPercent / 100), 2);
            const bankAmount = hasBankAmount
                ? this.toSafeNumber(withProration.bankAmount, derivedBankAmount)
                : derivedBankAmount;
            const individualAmount = hasIndividualAmount
                ? this.toSafeNumber(withProration.individualAmount, derivedIndividualAmount)
                : derivedIndividualAmount;
            expanded.push({
                ...withProration,
                type: 'bank',
                variable: variableBase,
                amount: bankAmount,
                bankAmount,
                baseVariable,
                prorateValues: withProration.prorateValues,
                prorateBase: withProration.prorateBase,
                proratePercent: undefined,
                performancePercent: undefined,
            });
            expanded.push({
                ...withProration,
                type: 'individual',
                variable: variableBase,
                amount: individualAmount,
                bankAmount,
                individualAmount,
                baseVariable,
                prorateValues: withProration.prorateValues,
                prorateBase: withProration.prorateBase,
                proratePercent: withProration.proratePercent ?? resolvedPercent,
                performancePercent: withProration.performancePercent ?? resolvedPercent,
            });
        });
        const types = Array.from(new Set(expanded.map((item) => item?.type).filter(Boolean)));
        return { rows: expanded, types };
    }
    composeUserName(user) {
        if (!user)
            return undefined;
        const directName = [user?.name, user?.fullName, user?.displayName, user?.staffName]
            .map((value) => (typeof value === 'string' ? value.trim() : ''))
            .find(Boolean);
        if (directName)
            return directName;
        const parts = [user?.firstName, user?.middleName, user?.lastName]
            .map((value) => (typeof value === 'string' ? value.trim() : ''))
            .filter(Boolean);
        if (parts.length)
            return parts.join(' ');
        const fallback = [user?.email, user?.staffId, user?.userId]
            .map((value) => (typeof value === 'string' ? value.trim() : ''))
            .find(Boolean);
        return fallback || undefined;
    }
    async resolveEntityName(entityRef) {
        const candidate = entityRef?.data ?? entityRef;
        if (candidate && typeof candidate === 'object') {
            const label = candidate?.name ??
                candidate?.short ??
                candidate?.title ??
                candidate?.code ??
                candidate?.abbr ??
                candidate?.label ??
                candidate?.entityName ??
                candidate?.subsidiaryName;
            if (label) {
                return String(label).trim();
            }
        }
        const rawText = typeof candidate === 'string' ? candidate.trim() : '';
        if (rawText && !mongoose_2.Types.ObjectId.isValid(rawText)) {
            const entityByShort = await this.entityService
                .getSubsidiaryByShort(rawText)
                .catch(() => null);
            const shortLabel = entityByShort?.name ?? entityByShort?.short;
            if (shortLabel) {
                return String(shortLabel).trim();
            }
            return rawText;
        }
        const entityId = this.resolveEntityId(candidate ?? entityRef);
        if (!entityId)
            return 'the entity';
        try {
            const entity = await this.entityService.findSubsidiaryById(entityId);
            const resolved = entity?.data?.name || entity?.data?.short;
            return resolved ? String(resolved).trim() : 'the entity';
        }
        catch {
            return 'the entity';
        }
    }
    resolveEntityLabel(entityRef) {
        const candidate = entityRef?.data ?? entityRef;
        if (candidate && typeof candidate === 'object') {
            const label = candidate?.name ??
                candidate?.short ??
                candidate?.title ??
                candidate?.code ??
                candidate?.abbr ??
                candidate?.label ??
                candidate?.entityName ??
                candidate?.subsidiaryName;
            if (label) {
                return String(label).trim();
            }
            const fallback = candidate?._id ?? candidate?.id ?? candidate?.entityId ?? candidate?.value;
            if (fallback) {
                return String(fallback).trim();
            }
        }
        if (typeof candidate === 'string') {
            const trimmed = candidate.trim();
            return trimmed ? trimmed : undefined;
        }
        return undefined;
    }
    resolveStaffLabel(directory, value) {
        if (!value)
            return undefined;
        if (typeof value === 'object') {
            const directName = this.composeUserName(value);
            if (directName) {
                return directName;
            }
            const named = value?.name ??
                value?.fullName ??
                value?.label ??
                value?.title;
            if (named) {
                const trimmed = String(named).trim();
                if (trimmed)
                    return trimmed;
            }
        }
        const candidate = typeof value === 'object'
            ? value?._id ?? value?.id ?? value?.userId ?? value
            : value;
        const key = typeof candidate === 'string' || typeof candidate === 'number'
            ? String(candidate).trim()
            : String(candidate ?? '').trim();
        if (!key)
            return undefined;
        const resolved = directory.get(key) ??
            directory.get(key.toLowerCase()) ??
            directory.get(key.toUpperCase());
        if (resolved)
            return resolved;
        if (typeof candidate === 'string') {
            const trimmed = candidate.trim();
            if (trimmed && /[a-z]/i.test(trimmed) && /\s+/.test(trimmed)) {
                return trimmed;
            }
        }
        return undefined;
    }
    async enrichPayrollApprovals(approvals, entityHint) {
        if (!Array.isArray(approvals) || approvals.length === 0) {
            return approvals ?? [];
        }
        const staffIds = new Set();
        const entityIds = new Set();
        const registerStaff = (value) => {
            const key = typeof value === 'string' || typeof value === 'number'
                ? String(value).trim()
                : typeof value === 'object'
                    ? String(value?._id ?? value?.id ?? value?.userId ?? value ?? '').trim()
                    : String(value ?? '').trim();
            if (key) {
                staffIds.add(key);
            }
        };
        approvals.forEach((approval) => {
            const entityId = this.resolveEntityId(approval?.entity);
            if (entityId) {
                entityIds.add(entityId);
            }
            registerStaff(approval?.initiatorId);
            registerStaff(approval?.requestedBy);
            registerStaff(approval?.reviewerApprovedBy);
            registerStaff(approval?.approverApprovedBy);
            registerStaff(approval?.postingApprovedBy);
            (approval?.reviewerIds ?? []).forEach(registerStaff);
            (approval?.approverIds ?? []).forEach(registerStaff);
            (approval?.postingIds ?? []).forEach(registerStaff);
            (approval?.auditViewerIds ?? []).forEach(registerStaff);
        });
        const staffDirectory = new Map();
        const registerDirectory = (entries) => {
            (entries ?? []).forEach((entry) => {
                const name = typeof entry?.name === 'string' ? entry.name.trim() : '';
                if (!name)
                    return;
                const staffId = typeof entry?.staffId === 'string' ? entry.staffId.trim() : '';
                const staffObjectId = typeof entry?.staffObjectId === 'string' ? entry.staffObjectId.trim() : '';
                const userId = typeof entry?.userId === 'string' ? entry.userId.trim() : '';
                const email = typeof entry?.email === 'string' ? entry.email.trim() : '';
                const registerKey = (key) => {
                    if (!key)
                        return;
                    staffDirectory.set(key, name);
                    staffDirectory.set(key.toLowerCase(), name);
                    staffDirectory.set(key.toUpperCase(), name);
                };
                registerKey(staffId);
                registerKey(staffObjectId);
                registerKey(userId);
                registerKey(email);
            });
        };
        if (staffIds.size) {
            const directory = await this.staffService
                .resolveStaffDirectory(Array.from(staffIds), entityHint)
                .catch(() => ({ data: [], missing: [] }));
            registerDirectory(directory?.data ?? []);
            const missing = Array.isArray(directory?.missing) ? directory.missing : [];
            if (missing.length) {
                const fallback = await this.staffService
                    .resolveStaffDirectory(missing)
                    .catch(() => ({ data: [] }));
                registerDirectory(fallback?.data ?? []);
            }
        }
        const entityDirectory = new Map();
        if (entityIds.size) {
            const entries = await Promise.all(Array.from(entityIds).map(async (id) => {
                const response = await this.entityService.findSubsidiaryById(id).catch(() => null);
                const entity = response?.data ?? response;
                if (entity?._id) {
                    return { id, entity };
                }
                return null;
            }));
            entries.forEach((entry) => {
                if (!entry)
                    return;
                entityDirectory.set(entry.id, entry.entity);
            });
        }
        const resolveName = (value) => {
            if (typeof value !== 'string')
                return undefined;
            const trimmed = value.trim();
            return trimmed ? trimmed : undefined;
        };
        const pendingUpdates = [];
        const enriched = approvals.map((approval) => {
            const entityId = this.resolveEntityId(approval?.entity);
            const entityDetails = entityId ? entityDirectory.get(entityId) : null;
            const resolvedEntity = entityDetails ?? approval?.entity;
            const entityName = this.resolveEntityLabel(resolvedEntity) ??
                approval?.entityName;
            const initiatorDisplayName = resolveName(approval?.initiatorName) ??
                resolveName(approval?.requestedByName) ??
                this.resolveStaffLabel(staffDirectory, approval?.initiatorId) ??
                this.resolveStaffLabel(staffDirectory, approval?.requestedBy);
            const reviewerApprovedByName = resolveName(approval?.reviewerApprovedByName) ??
                this.resolveStaffLabel(staffDirectory, approval?.reviewerApprovedBy);
            const reviewerNames = (approval?.reviewerIds ?? [])
                .map((id) => this.resolveStaffLabel(staffDirectory, id))
                .filter((name) => Boolean(name));
            const reviewerDisplayName = resolveName(approval?.reviewerDisplayName) ??
                reviewerApprovedByName ??
                (reviewerNames.length ? reviewerNames.join(', ') : undefined);
            const approverApprovedByName = resolveName(approval?.approverApprovedByName) ??
                this.resolveStaffLabel(staffDirectory, approval?.approverApprovedBy);
            const approverNames = (approval?.approverIds ?? [])
                .map((id) => this.resolveStaffLabel(staffDirectory, id))
                .filter((name) => Boolean(name));
            const approverDisplayName = resolveName(approval?.approverDisplayName) ??
                approverApprovedByName ??
                (approverNames.length ? approverNames.join(', ') : undefined);
            const postingApprovedByName = resolveName(approval?.postingApprovedByName) ??
                this.resolveStaffLabel(staffDirectory, approval?.postingApprovedBy);
            const postingNames = (approval?.postingIds ?? [])
                .map((id) => this.resolveStaffLabel(staffDirectory, id))
                .filter((name) => Boolean(name));
            const postingDisplayName = resolveName(approval?.postingDisplayName) ??
                postingApprovedByName ??
                (postingNames.length ? postingNames.join(', ') : undefined);
            const auditViewerNames = (approval?.auditViewerIds ?? [])
                .map((id) => this.resolveStaffLabel(staffDirectory, id))
                .filter((name) => Boolean(name));
            const updatePayload = {};
            const hasReviewerApprovedByName = Boolean(resolveName(approval?.reviewerApprovedByName));
            const hasApproverApprovedByName = Boolean(resolveName(approval?.approverApprovedByName));
            const hasPostingApprovedByName = Boolean(resolveName(approval?.postingApprovedByName));
            if (!hasReviewerApprovedByName && reviewerApprovedByName) {
                updatePayload.reviewerApprovedByName = reviewerApprovedByName;
            }
            if (!hasApproverApprovedByName && approverApprovedByName) {
                updatePayload.approverApprovedByName = approverApprovedByName;
            }
            if (!hasPostingApprovedByName && postingApprovedByName) {
                updatePayload.postingApprovedByName = postingApprovedByName;
            }
            if (approval?._id && Object.keys(updatePayload).length) {
                pendingUpdates.push({
                    updateOne: {
                        filter: { _id: approval._id },
                        update: { $set: updatePayload },
                    },
                });
            }
            return {
                ...approval,
                entity: resolvedEntity,
                entityName,
                initiatorDisplayName,
                reviewerApprovedByName,
                reviewerNames,
                reviewerDisplayName,
                approverApprovedByName,
                approverNames,
                approverDisplayName,
                postingApprovedByName,
                postingNames,
                postingDisplayName,
                auditViewerNames,
            };
        });
        if (pendingUpdates.length) {
            try {
                await this.payrollApprovalModel.bulkWrite(pendingUpdates, { ordered: false });
            }
            catch (error) {
                console.error('Failed to backfill payroll approval names', error);
            }
        }
        return enriched;
    }
    extractEmployeeIdFromRow(row) {
        if (!row)
            return null;
        const candidate = row?.employeeId ??
            row?.userId ??
            row?.staffObjectId ??
            row?.id ??
            row?.staffId;
        const resolved = typeof candidate === 'object'
            ? candidate?._id ?? candidate?.id ?? candidate?.toString?.()
            : candidate;
        const value = typeof resolved === 'string' ? resolved.trim() : String(resolved ?? '').trim();
        return value ? value : null;
    }
    collectAttendanceIdentifiers(row) {
        if (!row || typeof row !== 'object')
            return [];
        return this.collectIdentifierValues(row?.employeeId, row?.userId, row?.staffObjectId, row?.id, row?.staffId);
    }
    mergeAttendanceAliasSets(aliasMap, values) {
        const cleaned = values
            .map((value) => (typeof value === 'string' ? value.trim() : value))
            .filter((value) => Boolean(value && value !== 'undefined' && value !== 'null'));
        if (!cleaned.length)
            return;
        const merged = new Set();
        cleaned.forEach((value) => merged.add(value));
        cleaned.forEach((value) => {
            const existing = aliasMap.get(value);
            if (existing) {
                existing.forEach((alias) => merged.add(alias));
            }
        });
        merged.forEach((value) => {
            aliasMap.set(value, merged);
        });
    }
    expandAttendanceIdentifiers(identifiers, aliasMap) {
        if (!aliasMap || !aliasMap.size)
            return identifiers;
        const expanded = new Set();
        identifiers.forEach((id) => {
            if (!id)
                return;
            expanded.add(id);
            const aliases = aliasMap.get(id);
            if (aliases) {
                aliases.forEach((alias) => expanded.add(alias));
            }
        });
        return Array.from(expanded);
    }
    async resolveAttendanceIdentifierAliases(rows, entityId) {
        const aliasMap = new Map();
        const baseIds = new Set();
        rows.forEach((row) => {
            this.collectAttendanceIdentifiers(row).forEach((id) => baseIds.add(id));
        });
        if (!baseIds.size) {
            return aliasMap;
        }
        baseIds.forEach((id) => this.mergeAttendanceAliasSets(aliasMap, [id]));
        const directory = await this.staffService
            .resolveStaffDirectory(Array.from(baseIds), entityId)
            .catch(() => null);
        const staffRows = Array.isArray(directory?.data) ? directory.data : [];
        staffRows.forEach((entry) => {
            this.mergeAttendanceAliasSets(aliasMap, [
                entry?.staffId ? String(entry.staffId) : undefined,
                entry?.userId ? String(entry.userId) : undefined,
                entry?.staffObjectId ? String(entry.staffObjectId) : undefined,
            ]);
        });
        return aliasMap;
    }
    resolveAttendanceSummaryForRow(attendanceSummary, row) {
        const identifiers = this.collectAttendanceIdentifiers(row);
        for (const id of identifiers) {
            const summary = attendanceSummary.get(id);
            if (summary)
                return summary;
        }
        return undefined;
    }
    hasLateAttendancePenalty(deductionIds, row) {
        const identifiers = this.collectAttendanceIdentifiers(row);
        return identifiers.some((id) => deductionIds.has(id));
    }
    normalizeHolidayDate(value) {
        if (!value)
            return null;
        if (value instanceof Date) {
            return moment(value).tz('Africa/Lagos').format('YYYY-MM-DD');
        }
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed)
                return null;
            const parsed = moment(trimmed, ['DD-MM-YYYY', 'YYYY-MM-DD', moment.ISO_8601], true);
            if (!parsed.isValid())
                return null;
            return parsed.tz('Africa/Lagos').format('YYYY-MM-DD');
        }
        if (typeof value === 'object') {
            return this.normalizeHolidayDate(value?.date ?? value?.holidayDate);
        }
        return null;
    }
    normalizeHolidayList(source) {
        const list = Array.isArray(source)
            ? source
            : typeof source === 'string'
                ? source.split(/\r?\n/)
                : [];
        const normalized = list
            .map((value) => this.normalizeHolidayDate(value))
            .filter((value) => Boolean(value));
        return Array.from(new Set(normalized));
    }
    async buildAttendanceWorkdayKeys(monthStart, monthEnd, monthEndInclusive) {
        const config = await this.attendanceConfigModel.findOne().lean().exec();
        const excludeWeekends = config?.excludeWeekends ?? true;
        const holidayRecords = await this.holidayModel
            .find({ date: { $gte: monthStart.toDate(), $lte: monthEndInclusive.toDate() } })
            .select({ date: 1 })
            .lean()
            .exec();
        const holidayDays = new Set();
        holidayRecords.forEach((record) => {
            if (!record?.date)
                return;
            const dayKey = moment(record.date).tz('Africa/Lagos').format('YYYY-MM-DD');
            holidayDays.add(dayKey);
        });
        if (config) {
            const additions = this.normalizeHolidayList(config?.publicHolidayAdditions ?? config?.holidayAdditions);
            const removals = this.normalizeHolidayList(config?.publicHolidayRemovals ?? config?.holidayRemovals);
            const legacyOverride = this.normalizeHolidayList(config?.publicHolidays);
            const mergedAdditions = new Set(additions);
            legacyOverride.forEach((date) => {
                if (!holidayDays.has(date)) {
                    mergedAdditions.add(date);
                }
            });
            mergedAdditions.forEach((date) => holidayDays.add(date));
            removals.forEach((date) => holidayDays.delete(date));
        }
        const today = moment().tz('Africa/Lagos').startOf('day');
        const dayKeys = [];
        for (let cursor = monthStart.clone(); cursor.isSameOrBefore(monthEnd); cursor.add(1, 'day')) {
            if (cursor.isAfter(today, 'day'))
                continue;
            if (excludeWeekends && [0, 6].includes(cursor.day()))
                continue;
            const dayKey = cursor.format('YYYY-MM-DD');
            if (holidayDays.has(dayKey))
                continue;
            dayKeys.push(dayKey);
        }
        return { dayKeys, holidayDays };
    }
    async resolveLateDeductionEmployees(rows, periodDate, identifierAliases) {
        const aliasMap = identifierAliases ?? (await this.resolveAttendanceIdentifierAliases(rows));
        const ids = Array.from(new Set(rows.flatMap((row) => this.expandAttendanceIdentifiers(this.collectAttendanceIdentifiers(row), aliasMap))));
        if (!ids.length) {
            return new Set();
        }
        const monthStart = moment(periodDate).tz('Africa/Lagos').startOf('month').toDate();
        const monthEnd = moment(periodDate).tz('Africa/Lagos').endOf('month').toDate();
        try {
            const results = await this.disciplinaryCaseModel
                .find({
                employeeId: { $in: ids },
                salaryDeductionApplied: true,
                salaryDeductionRequired: true,
                incidentDate: { $gte: monthStart, $lte: monthEnd },
            })
                .select('employeeId')
                .lean()
                .exec();
            const matched = new Set();
            results
                .map((entry) => entry?.employeeId)
                .filter((value) => value !== undefined && value !== null)
                .map((value) => String(value))
                .forEach((value) => {
                matched.add(value);
                const aliases = aliasMap.get(value);
                if (aliases) {
                    aliases.forEach((alias) => matched.add(alias));
                }
            });
            return matched;
        }
        catch (error) {
            console.error('Failed to resolve salary deduction cases', error);
            return new Set();
        }
    }
    parseLeaveDate(value) {
        if (!value)
            return null;
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return moment(value).tz('Africa/Lagos');
        }
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed)
                return null;
            const parsed = moment(trimmed, ['DD-MM-YYYY', 'YYYY-MM-DD', moment.ISO_8601], true);
            if (parsed.isValid()) {
                return parsed.tz('Africa/Lagos');
            }
            const fallback = moment(trimmed);
            return fallback.isValid() ? fallback.tz('Africa/Lagos') : null;
        }
        return null;
    }
    async resolveAttendanceSummaryByEmployee(rows, periodDate, identifierAliases) {
        const aliasMap = identifierAliases ?? (await this.resolveAttendanceIdentifierAliases(rows));
        const identifierToGroup = new Map();
        const groupToIdentifiers = new Map();
        const resolveGroupId = (identifiers) => {
            let groupId;
            identifiers.forEach((id) => {
                const existing = identifierToGroup.get(id);
                if (existing && !groupId) {
                    groupId = existing;
                }
            });
            groupId = groupId ?? identifiers[0];
            identifiers.forEach((id) => {
                const existing = identifierToGroup.get(id);
                if (existing && existing !== groupId) {
                    const existingMembers = groupToIdentifiers.get(existing);
                    if (existingMembers) {
                        const target = groupToIdentifiers.get(groupId) ?? new Set();
                        existingMembers.forEach((member) => {
                            identifierToGroup.set(member, groupId);
                            target.add(member);
                        });
                        groupToIdentifiers.set(groupId, target);
                        groupToIdentifiers.delete(existing);
                    }
                }
                identifierToGroup.set(id, groupId);
                const bucket = groupToIdentifiers.get(groupId) ?? new Set();
                bucket.add(id);
                groupToIdentifiers.set(groupId, bucket);
            });
            return groupId;
        };
        const attendanceWindowsByGroup = new Map();
        rows.forEach((row) => {
            const identifiers = this.expandAttendanceIdentifiers(this.collectAttendanceIdentifiers(row), aliasMap);
            if (!identifiers.length)
                return;
            const groupId = resolveGroupId(identifiers);
            const startDate = this.resolveDateValue(row?.startDate);
            let exitDate = this.resolveDateValue(row?.exitDate);
            if (exitDate && exitDate.getFullYear() <= 1971) {
                exitDate = null;
            }
            if (startDate && exitDate && exitDate < startDate) {
                exitDate = null;
            }
            const current = attendanceWindowsByGroup.get(groupId) ?? {};
            if (startDate && (!current.start || startDate < current.start)) {
                current.start = startDate;
            }
            if (exitDate && (!current.end || exitDate < current.end)) {
                current.end = exitDate;
            }
            attendanceWindowsByGroup.set(groupId, current);
        });
        const ids = Array.from(identifierToGroup.keys());
        if (!ids.length) {
            return new Map();
        }
        const monthStart = moment(periodDate).tz('Africa/Lagos').startOf('month').startOf('day');
        const monthEnd = moment(periodDate).tz('Africa/Lagos').endOf('month').startOf('day');
        const monthEndInclusive = monthEnd.clone().endOf('day');
        const { dayKeys } = await this.buildAttendanceWorkdayKeys(monthStart, monthEnd, monthEndInclusive);
        const leaveDaysByGroup = new Map();
        const approvedLeaves = await this.leaveModel
            .find({
            userId: { $in: ids },
            status: { $regex: /^approved$/i },
        })
            .select({ userId: 1, startDate: 1, endDate: 1, resumptionDate: 1 })
            .lean()
            .exec();
        approvedLeaves.forEach((leave) => {
            const owner = leave?.userId ? String(leave.userId).trim() : '';
            if (!owner)
                return;
            const groupId = identifierToGroup.get(owner);
            if (!groupId)
                return;
            const start = this.parseLeaveDate(leave?.startDate);
            const resumption = this.parseLeaveDate(leave?.resumptionDate ?? leave?.endDate);
            if (!start || !resumption)
                return;
            const leaveStart = start.clone().startOf('day');
            const leaveEnd = resumption.clone().startOf('day').subtract(1, 'day');
            if (leaveEnd.isBefore(leaveStart, 'day'))
                return;
            if (leaveEnd.isBefore(monthStart) || leaveStart.isAfter(monthEnd))
                return;
            const rangeStart = moment.max(leaveStart, monthStart);
            const rangeEnd = moment.min(leaveEnd, monthEnd);
            const bucket = leaveDaysByGroup.get(groupId) ?? new Set();
            for (let cursor = rangeStart.clone(); cursor.isSameOrBefore(rangeEnd); cursor.add(1, 'day')) {
                bucket.add(cursor.format('YYYY-MM-DD'));
            }
            leaveDaysByGroup.set(groupId, bucket);
        });
        const attendanceRecords = await this.attendanceModel
            .find({
            employeeId: { $in: ids },
            date: { $gte: monthStart.toDate(), $lte: monthEndInclusive.toDate() },
        })
            .select({ employeeId: 1, date: 1, status: 1 })
            .lean()
            .exec();
        const attendanceByGroup = new Map();
        attendanceRecords.forEach((record) => {
            const employeeId = record?.employeeId ? String(record.employeeId).trim() : '';
            if (!employeeId || !record?.date)
                return;
            const groupId = identifierToGroup.get(employeeId);
            if (!groupId)
                return;
            const dayKey = moment(record.date).tz('Africa/Lagos').format('YYYY-MM-DD');
            const status = typeof record?.status === 'string' ? record.status : 'Present';
            const bucket = attendanceByGroup.get(groupId) ?? new Map();
            const existing = bucket.get(dayKey);
            if (existing && existing.toLowerCase() !== 'absent') {
                attendanceByGroup.set(groupId, bucket);
                return;
            }
            if (existing && existing.toLowerCase() === 'absent' && status.toLowerCase() === 'absent') {
                attendanceByGroup.set(groupId, bucket);
                return;
            }
            bucket.set(dayKey, status);
            attendanceByGroup.set(groupId, bucket);
        });
        const result = new Map();
        groupToIdentifiers.forEach((identifiers, groupId) => {
            const leaveDays = leaveDaysByGroup.get(groupId) ?? new Set();
            const attendanceByDay = attendanceByGroup.get(groupId);
            const window = attendanceWindowsByGroup.get(groupId);
            const windowStart = window?.start
                ? moment(window.start).tz('Africa/Lagos').startOf('day')
                : monthStart;
            const windowEnd = window?.end
                ? moment(window.end).tz('Africa/Lagos').startOf('day')
                : monthEnd;
            const startKey = moment.max(windowStart, monthStart).format('YYYY-MM-DD');
            const endKey = moment.min(windowEnd, monthEnd).format('YYYY-MM-DD');
            let effectiveAbsentDays = 0;
            if (startKey <= endKey) {
                dayKeys.forEach((dayKey) => {
                    if (dayKey < startKey || dayKey > endKey)
                        return;
                    if (leaveDays.has(dayKey))
                        return;
                    const status = attendanceByDay?.get(dayKey);
                    if (!status || String(status).toLowerCase() === 'absent') {
                        effectiveAbsentDays += 1;
                    }
                });
            }
            identifiers.forEach((id) => {
                result.set(id, {
                    absentDays: effectiveAbsentDays,
                });
            });
        });
        return result;
    }
    applyAbsenceDeduction(rows, attendanceSummary, defaultWorkingDays, periodDate) {
        if (!attendanceSummary.size)
            return rows;
        const eligibleTypes = new Set(['salary', 'variable', 'reimbursable']);
        return rows.map((row) => {
            if (!row || typeof row !== 'object')
                return row;
            const type = row?.type ?? this.detectRowType(row);
            if (!eligibleTypes.has(type))
                return row;
            const summary = this.resolveAttendanceSummaryForRow(attendanceSummary, row);
            if (!summary)
                return row;
            const proration = this.resolveProrationDetails(row, defaultWorkingDays, {
                type,
                periodDate,
                includeAttendance: false,
            });
            const expectedDays = this.toSafeNumber(proration.workedDays, defaultWorkingDays);
            const rawAbsentDays = this.toSafeNumber(summary.absentDays, 0);
            const absentDays = Math.max(Math.min(rawAbsentDays, expectedDays), 0);
            if (!absentDays)
                return row;
            const baseDays = this.toSafeNumber(row?.prorateBase ?? row?.totalDays ?? row?.workingDays ?? defaultWorkingDays, defaultWorkingDays);
            return {
                ...row,
                prorateBase: baseDays,
                attendanceAbsentDays: absentDays,
            };
        });
    }
    applyLateAttendanceDeduction(rows, deductionIds, defaultWorkingDays) {
        if (!deductionIds.size)
            return rows;
        return rows.map((row) => {
            if (!this.hasLateAttendancePenalty(deductionIds, row)) {
                return row;
            }
            const type = row?.type ?? this.detectRowType(row);
            if (type !== 'salary') {
                return row;
            }
            const baseDays = this.toSafeNumber(row?.prorateBase ?? row?.totalDays ?? row?.workingDays ?? defaultWorkingDays, defaultWorkingDays);
            const existingPenalty = this.toSafeNumber(row?.attendanceLatePenaltyDays, 0);
            return {
                ...row,
                prorateBase: baseDays,
                attendanceLatePenaltyDays: existingPenalty + 1,
            };
        });
    }
    normalizePayrollData(data, options) {
        if (!Array.isArray(data))
            return [];
        return data.map((item) => {
            const type = item.type || this.detectRowType(item);
            const workingDays = options?.workingDays ?? 30;
            const normalizeIdentifier = (value) => this.normalizePayrollText(value) ?? undefined;
            const pensionAccount = normalizeIdentifier(item?.pensionAccount ?? item?.rsaNumber ?? item?.rsaPin ?? item?.rsa);
            const pensionProvider = normalizeIdentifier(item?.pensionProvider ?? item?.pfaCode ?? item?.pfaName ?? item?.pfa);
            const nhfAccount = normalizeIdentifier(item?.nhfAccount ?? item?.nhfNumber ?? item?.nhfNo ?? item?.nhfPin);
            const payeAccount = normalizeIdentifier(item?.payeAccount ?? item?.taxProfileId ?? item?.taxId ?? item?.taxID);
            const prorateValues = this.toSafeNumber(item.prorateValues, workingDays);
            const prorateBase = this.toSafeNumber(item.prorateBase ?? item.totalDays ?? item.workingDays ?? workingDays, workingDays);
            const performanceScore = item.performanceScore !== undefined && item.performanceScore !== null
                ? this.toSafeNumber(item.performanceScore)
                : undefined;
            const resolvedPerformancePercent = type === 'variable'
                ? this.resolvePerformancePercent(performanceScore, options?.performanceBrackets)
                : undefined;
            const proratePercent = type === 'variable'
                ? this.normalizePercent(item.proratePercent ?? resolvedPerformancePercent ?? 100, 100)
                : undefined;
            return {
                ...item,
                type,
                pensionAccount,
                pensionProvider,
                nhfAccount,
                payeAccount,
                rsaNumber: normalizeIdentifier(item?.rsaNumber),
                rsaPin: normalizeIdentifier(item?.rsaPin),
                rsa: normalizeIdentifier(item?.rsa),
                taxId: normalizeIdentifier(item?.taxId ?? item?.taxID),
                prorateValues,
                prorateBase,
                performanceScore,
                performancePercent: type === 'variable' ? proratePercent : undefined,
                proratePercent,
                basic: this.toSafeNumber(item.basic),
                housing: this.toSafeNumber(item.housing),
                transport: this.toSafeNumber(item.transport),
                dress: this.toSafeNumber(item.dress),
                utilities: this.toSafeNumber(item.utilities),
                lunch: this.toSafeNumber(item.lunch),
                telephone: this.toSafeNumber(item.telephone),
                gross: this.toSafeNumber(item.gross),
                pension: this.toSafeNumber(item.pension),
                monthlyCompanyPension: this.toSafeNumber(item.monthlyCompanyPension ?? item.companyPension),
                nhf: this.toSafeNumber(item.nhf),
                paye: this.toSafeNumber(item.paye),
                amount: this.toSafeNumber(item.amount),
                monthlyNet: this.toSafeNumber(item.monthlyNet),
                loanDeduction: this.toSafeNumber(item.loanDeduction),
                reimbursable: this.toSafeNumber(item.reimbursable),
                variable: this.toSafeNumber(item.variable),
            };
        });
    }
    normalizePayrollText(value) {
        if (value === null || value === undefined)
            return null;
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed)
                return null;
            const lowered = trimmed.toLowerCase();
            if (lowered === 'null' || lowered === 'undefined')
                return null;
            return trimmed;
        }
        if (typeof value === 'number') {
            if (!Number.isFinite(value))
                return null;
            return String(value);
        }
        if (typeof value === 'object') {
            const nested = value?.name ??
                value?.level ??
                value?.value ??
                value?._id ??
                value?.id;
            if (nested !== undefined && nested !== null) {
                return this.normalizePayrollText(nested);
            }
        }
        try {
            const asString = String(value).trim();
            if (!asString)
                return null;
            if (asString === '[object Object]')
                return null;
            const lowered = asString.toLowerCase();
            if (lowered === 'null' || lowered === 'undefined')
                return null;
            return asString;
        }
        catch {
            return null;
        }
    }
    resolvePayrollRowAccount(row) {
        if (!row)
            return null;
        const candidate = row?.account ??
            row?.accountNo ??
            row?.accountNumber ??
            row?.account_no ??
            row?.addosserAccount ??
            row?.atlasAccount ??
            row?.bankAccount ??
            row?.employeeAccount ??
            null;
        return this.normalizePayrollText(candidate);
    }
    resolvePayrollRowLevel(row) {
        if (!row)
            return null;
        const candidate = row?.grade ??
            row?.level ??
            row?.levelName ??
            row?.level?.name ??
            row?.level?.level ??
            null;
        return this.normalizePayrollText(candidate);
    }
    assertPayrollRowsHaveAccountAndLevel(rows) {
        if (!Array.isArray(rows) || !rows.length)
            return;
        const missing = rows.reduce((acc, row, index) => {
            const hasAccount = Boolean(this.resolvePayrollRowAccount(row));
            const hasLevel = Boolean(this.resolvePayrollRowLevel(row));
            if (hasAccount && hasLevel)
                return acc;
            const name = this.normalizePayrollText(row?.name);
            const staffId = this.extractEmployeeIdFromRow(row);
            const label = name && staffId
                ? `${name} (${staffId})`
                : name
                    ? name
                    : staffId
                        ? staffId
                        : `Row ${index + 1}`;
            acc.push({
                index,
                label,
                missingAccount: !hasAccount,
                missingLevel: !hasLevel,
            });
            return acc;
        }, []);
        if (!missing.length)
            return;
        const missingAccountCount = missing.filter((row) => row.missingAccount).length;
        const missingLevelCount = missing.filter((row) => row.missingLevel).length;
        const issueParts = [];
        if (missingAccountCount) {
            issueParts.push(`account on ${missingAccountCount} row(s)`);
        }
        if (missingLevelCount) {
            issueParts.push(`level on ${missingLevelCount} row(s)`);
        }
        const sample = missing
            .slice(0, 5)
            .map((row) => {
            const problems = [
                row.missingAccount ? 'account' : null,
                row.missingLevel ? 'level' : null,
            ]
                .filter(Boolean)
                .join('/');
            return `${row.label} (${problems})`;
        })
            .join(', ');
        const sampleSuffix = sample ? ` Example: ${sample}.` : '';
        throw new common_1.BadRequestException(`Payroll submission blocked: missing ${issueParts.join(' and ')}. Fill in the account and level for all staff before submitting.${sampleSuffix}`);
    }
    normalizePercent(value, fallback = 0) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
            return fallback;
        }
        return Math.min(Math.max(parsed, 0), 100);
    }
    resolveDateValue(value) {
        if (!value)
            return null;
        if (value instanceof Date) {
            return Number.isNaN(value.getTime()) ? null : value;
        }
        if (typeof value === 'number' && Number.isFinite(value)) {
            const asString = String(value);
            if (/^\d{8}$/.test(asString)) {
                const year = Number(asString.slice(0, 4));
                const month = Number(asString.slice(4, 6));
                const day = Number(asString.slice(6, 8));
                if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
                    const parsed = new Date(year, month - 1, day);
                    return Number.isNaN(parsed.getTime()) ? null : parsed;
                }
            }
        }
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed)
                return null;
            if (/^\d{8}$/.test(trimmed)) {
                const year = Number(trimmed.slice(0, 4));
                const month = Number(trimmed.slice(4, 6));
                const day = Number(trimmed.slice(6, 8));
                if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
                    const parsed = new Date(year, month - 1, day);
                    return Number.isNaN(parsed.getTime()) ? null : parsed;
                }
            }
            const parsed = new Date(trimmed);
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        }
        try {
            const parsed = new Date(value);
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        }
        catch {
            return null;
        }
    }
    resolvePayrollPeriodDate(value) {
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return value;
        }
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (/^\d{4}[-/]\d{1,2}$/.test(trimmed)) {
                const [yearPart, monthPart] = trimmed.split(/[-/]/);
                const year = Number(yearPart);
                const month = Number(monthPart);
                if (Number.isFinite(year) && Number.isFinite(month)) {
                    return new Date(year, month - 1, 1);
                }
            }
            const parsed = new Date(trimmed);
            if (!Number.isNaN(parsed.getTime())) {
                return parsed;
            }
        }
        return new Date();
    }
    isSamePayrollMonth(left, right) {
        if (!left)
            return false;
        return (left.getFullYear() === right.getFullYear() &&
            left.getMonth() === right.getMonth());
    }
    shiftPayrollMonth(source, offset) {
        return new Date(source.getFullYear(), source.getMonth() + offset, 1);
    }
    resolveProrationDetails(item, defaultBase, options) {
        const baseDays = this.toSafeNumber(item?.prorateBase ?? item?.totalDays ?? item?.workingDays ?? defaultBase, defaultBase);
        if (!baseDays || baseDays <= 0) {
            return { workedDays: baseDays || defaultBase || 0, baseDays: baseDays || defaultBase || 0, factor: 1 };
        }
        if (this.parseBooleanFlag(item?.prorationApplied)) {
            const workedDays = Math.max(this.toSafeNumber(item?.prorateValues, baseDays), 0);
            return { workedDays, baseDays, factor: 1 };
        }
        const hasExplicitValues = options?.respectProvided &&
            this.parseBooleanFlag(item?.__explicitProration ?? item?.prorationHandledOnClient);
        if (hasExplicitValues) {
            const workedDays = Math.max(this.toSafeNumber(item?.prorateValues, baseDays), 0);
            const ratio = baseDays ? workedDays / baseDays : 1;
            const allowOverage = this.parseBooleanFlag(item?.prorationAllowOverage);
            const factor = allowOverage ? Math.max(ratio, 0) : Math.min(Math.max(ratio, 0), 1);
            return { workedDays, baseDays, factor };
        }
        if (item?.prorationHandledOnClient) {
            const workedDays = Math.max(this.toSafeNumber(item?.prorateValues, baseDays), 0);
            const ratio = workedDays / baseDays;
            const allowOverage = this.parseBooleanFlag(item?.prorationAllowOverage);
            const factor = allowOverage ? Math.max(ratio, 0) : Math.min(Math.max(ratio, 0), 1);
            return { workedDays, baseDays, factor };
        }
        const periodDate = this.resolvePayrollPeriodDate(options?.periodDate);
        const includeAttendance = options?.includeAttendance !== false;
        const type = options?.type ?? item?.type ?? this.detectRowType(item);
        const periodStart = new Date(periodDate.getFullYear(), periodDate.getMonth(), 1);
        const periodEnd = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 1);
        const startDate = this.resolveDateValue(item?.startDate);
        let exitDate = this.resolveDateValue(item?.exitDate);
        if (exitDate && exitDate.getFullYear() <= 1971) {
            exitDate = null;
        }
        if (startDate && exitDate && exitDate < startDate) {
            exitDate = null;
        }
        const joinCutoffDay = 9;
        const salaryCarryForwardCutoffDay = 24;
        let workedDays = null;
        let allowOverage = false;
        if (exitDate && exitDate < periodStart) {
            workedDays = 0;
        }
        else if (startDate && startDate >= periodEnd) {
            workedDays = 0;
        }
        else if (exitDate && this.isSamePayrollMonth(exitDate, periodDate)) {
            const exitDay = Math.min(exitDate.getDate(), baseDays);
            const joinDay = startDate && this.isSamePayrollMonth(startDate, periodDate)
                ? Math.min(startDate.getDate(), baseDays)
                : 0;
            const daysThroughExit = Math.max(exitDay, 0);
            workedDays = Math.max(Math.min(daysThroughExit - joinDay, baseDays), 0);
        }
        else if (startDate && this.isSamePayrollMonth(startDate, periodDate)) {
            const joinDay = Math.min(startDate.getDate(), baseDays);
            const daysWorked = Math.max(baseDays - joinDay + 1, 0);
            if ((type === 'variable' || type === 'reimbursable') && joinDay >= joinCutoffDay) {
                workedDays = 0;
            }
            else {
                workedDays = daysWorked;
            }
        }
        else if ((type === 'variable' || type === 'reimbursable') &&
            startDate &&
            this.isSamePayrollMonth(startDate, this.shiftPayrollMonth(periodDate, -1))) {
            const joinDay = Math.min(startDate.getDate(), baseDays);
            if (joinDay >= joinCutoffDay) {
                const extraDays = Math.max(baseDays - joinDay, 0);
                if (extraDays > 0) {
                    workedDays = baseDays + extraDays;
                    allowOverage = true;
                }
            }
        }
        else if (type === 'salary' &&
            startDate &&
            this.isSamePayrollMonth(startDate, this.shiftPayrollMonth(periodDate, -1))) {
            const joinDay = Math.min(startDate.getDate(), baseDays);
            if (joinDay >= salaryCarryForwardCutoffDay) {
                const carryForwardDays = Math.max(baseDays - joinDay + 1, 0);
                if (carryForwardDays > 0) {
                    workedDays = baseDays + carryForwardDays;
                    allowOverage = true;
                }
            }
        }
        if (workedDays === null) {
            workedDays = this.toSafeNumber(item?.prorateValues, baseDays);
        }
        if (includeAttendance) {
            const absentDays = this.toSafeNumber(item?.attendanceAbsentDays, 0);
            const latePenaltyDays = this.toSafeNumber(item?.attendanceLatePenaltyDays, 0);
            const attendanceDeductions = Math.max(absentDays, 0) + Math.max(latePenaltyDays, 0);
            if (attendanceDeductions) {
                workedDays = Math.max(workedDays - attendanceDeductions, 0);
            }
        }
        const ratio = workedDays / baseDays;
        const factor = allowOverage
            ? Math.max(ratio, 0)
            : Math.min(Math.max(ratio, 0), 1);
        return { workedDays, baseDays, factor };
    }
    resolveProrationFactor(item, defaultBase, options) {
        return this.resolveProrationDetails(item, defaultBase, options).factor;
    }
    resolvePerformancePercent(score, brackets) {
        if (score === undefined || Number.isNaN(score)) {
            return undefined;
        }
        const numericScore = Number(score);
        const source = (brackets && brackets.length ? brackets : payroll_schema_1.DEFAULT_PERFORMANCE_BRACKETS).slice();
        source.sort((a, b) => b.minScore - a.minScore);
        for (const bracket of source) {
            if (numericScore >= bracket.minScore &&
                (bracket.maxScore === undefined ||
                    bracket.maxScore === null ||
                    numericScore <= bracket.maxScore)) {
                return this.normalizePercent(bracket.percent, 0);
            }
        }
        const lastBracket = source[source.length - 1];
        return lastBracket ? this.normalizePercent(lastBracket.percent, 0) : undefined;
    }
    normalizePerformanceBrackets(data) {
        const source = Array.isArray(data) && data.length ? data : payroll_schema_1.DEFAULT_PERFORMANCE_BRACKETS;
        const cleaned = source
            .map((item) => {
            const minScore = Number(item?.minScore);
            if (!Number.isFinite(minScore)) {
                return null;
            }
            const maxScoreRaw = item?.maxScore;
            const maxScore = maxScoreRaw === null || maxScoreRaw === undefined ? null : Number(maxScoreRaw);
            if (maxScore !== null && !Number.isFinite(maxScore)) {
                return null;
            }
            return {
                minScore,
                maxScore,
                percent: this.normalizePercent(item?.percent, 0),
            };
        })
            .filter(Boolean);
        if (!cleaned.length) {
            return payroll_schema_1.DEFAULT_PERFORMANCE_BRACKETS;
        }
        cleaned.sort((a, b) => b.minScore - a.minScore);
        return cleaned;
    }
    async loadEntityPayrollSettings(entityId) {
        const match = [{ entity: entityId }];
        if (mongoose_2.Types.ObjectId.isValid(entityId)) {
            match.push({ entity: new mongoose_2.Types.ObjectId(entityId) });
        }
        const config = await this.payrollModel.findOne({ $or: match }).lean();
        const workingDays = this.toSafeNumber(config?.workingDays ?? 30, 30);
        const performanceBrackets = this.normalizePerformanceBrackets(config?.performanceBrackets);
        return { workingDays, performanceBrackets };
    }
    applyProrationForDisplay(rows, workingDays, performanceBrackets, periodDate) {
        const roundVal = (value) => this.round(value, 2);
        return rows.map((row) => {
            if (!row || typeof row !== 'object')
                return row;
            const type = row.type ?? this.detectRowType(row);
            const prorationType = type === 'bank' || type === 'individual' ? 'variable' : type;
            const proration = this.resolveProrationDetails(row, workingDays, {
                type: prorationType,
                periodDate,
            });
            const factor = proration.factor;
            const prorateValues = proration.workedDays;
            const prorateBase = proration.baseDays;
            if (type === 'salary') {
                const { proratePercent, performancePercent, performanceScore, ...rest } = row;
                const basic = roundVal(this.toSafeNumber(row.basic) * factor);
                const housing = roundVal(this.toSafeNumber(row.housing) * factor);
                const transport = roundVal(this.toSafeNumber(row.transport) * factor);
                const dress = roundVal(this.toSafeNumber(row.dress) * factor);
                const utilities = roundVal(this.toSafeNumber(row.utilities) * factor);
                const lunch = roundVal(this.toSafeNumber(row.lunch) * factor);
                const telephone = roundVal(this.toSafeNumber(row.telephone) * factor);
                const gross = roundVal(this.toSafeNumber(row.gross) * factor);
                const reconciled = this.reconcileSalaryComponents({
                    basic,
                    housing,
                    transport,
                    dress,
                    utilities,
                    lunch,
                    telephone,
                    gross,
                });
                const pension = roundVal(this.toSafeNumber(row.pension) * factor);
                const companyPension = roundVal(this.toSafeNumber(row.monthlyCompanyPension ?? row.companyPension) * factor);
                const monthlyCompanyPension = roundVal(this.toSafeNumber(row.monthlyCompanyPension ?? row.companyPension) * factor);
                const nhf = roundVal(this.toSafeNumber(row.nhf) * factor);
                const paye = roundVal(this.toSafeNumber(row.paye) * factor);
                let monthlyNet = roundVal(this.toSafeNumber(row.monthlyNet) * factor);
                const roundingGap = roundVal(gross - (pension + nhf + paye + monthlyNet));
                if (roundingGap !== 0) {
                    monthlyNet = roundVal(monthlyNet + roundingGap);
                }
                return {
                    ...rest,
                    type: 'salary',
                    prorateValues,
                    prorateBase,
                    ...reconciled,
                    pension,
                    companyPension,
                    monthlyCompanyPension,
                    nhf,
                    paye,
                    monthlyNet,
                    amount: monthlyNet,
                };
            }
            if (type === 'reimbursable') {
                const { proratePercent, performancePercent, performanceScore, ...rest } = row;
                return {
                    ...rest,
                    type: 'reimbursable',
                    prorateValues,
                    prorateBase,
                    reimbursable: roundVal(this.toSafeNumber(row.reimbursable) * factor),
                    amount: roundVal(this.toSafeNumber(row.reimbursable) * factor),
                };
            }
            if (type === 'variable') {
                const resolvedPercent = this.normalizePercent(row.proratePercent ??
                    this.resolvePerformancePercent(row.performanceScore, performanceBrackets) ??
                    100, 100);
                const variableBase = roundVal(this.toSafeNumber(row.variable) * factor);
                return {
                    ...row,
                    type: 'variable',
                    prorateValues,
                    prorateBase,
                    variable: variableBase,
                    proratePercent: resolvedPercent,
                    performancePercent: resolvedPercent,
                };
            }
            if (type === 'bank' || type === 'individual') {
                const resolvedPercent = this.normalizePercent(row.proratePercent ??
                    row.performancePercent ??
                    this.resolvePerformancePercent(row.performanceScore, performanceBrackets) ??
                    100, 100);
                return {
                    ...row,
                    type,
                    prorateValues,
                    prorateBase,
                    proratePercent: type === 'individual' ? (row.proratePercent ?? resolvedPercent) : row.proratePercent,
                    performancePercent: type === 'individual' ? (row.performancePercent ?? resolvedPercent) : row.performancePercent,
                };
            }
            return row;
        });
    }
    detectRowType(row) {
        const toNumber = (value) => {
            if (value === null || value === undefined || value === '') {
                return null;
            }
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
        };
        const variableValue = toNumber(row?.variable);
        const bankValue = toNumber(row?.bankAmount);
        const individualValue = toNumber(row?.individualAmount);
        const hasVariableValue = (variableValue !== null && variableValue !== 0) ||
            (bankValue !== null && bankValue !== 0) ||
            (individualValue !== null && individualValue !== 0);
        if (hasVariableValue)
            return 'variable';
        const salaryValues = [
            row?.monthlyNet,
            row?.basic,
            row?.gross,
            row?.housing,
            row?.transport,
            row?.utilities,
            row?.lunch,
            row?.telephone,
        ];
        const hasSalaryValue = salaryValues.some((value) => {
            const parsed = toNumber(value);
            return parsed !== null && parsed !== 0;
        });
        if (hasSalaryValue)
            return 'salary';
        const reimbursableValue = toNumber(row?.reimbursable ?? row?.reimbursableAmount ?? row?.remibursableAmount);
        if (reimbursableValue !== null && reimbursableValue !== 0)
            return 'reimbursable';
        return 'reimbursable';
    }
    toSafeNumber(value, fallback = 0) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
        return fallback;
    }
    async getProcessedPayrollById(user, id) {
        const approval = await this.payrollApprovalModel.findById(id).lean();
        if (!approval) {
            throw new common_1.NotFoundException('Payroll approval request not found');
        }
        if (!this.canViewPayrollApproval(user, approval)) {
            throw new common_1.ForbiddenException('You are not allowed to access batch files.');
        }
        const status = String(approval?.status ?? '').toUpperCase();
        if (!['PENDING_POSTING', 'APPROVED'].includes(status)) {
            return { status: 200, data: [] };
        }
        const baseData = this.resolvePayrollApprovalRows(approval.data);
        if (!baseData.length) {
            return { status: 200, data: [] };
        }
        const approvalPeriodDate = approval.processedAt ??
            approval.postingApprovedAt ??
            approval.approverApprovedAt ??
            approval.reviewerApprovedAt ??
            approval.createdAt ??
            new Date();
        try {
            const breakdown = await this.buildApprovalDisplayData(baseData, approval.entity, approvalPeriodDate);
            if (breakdown?.rows?.length) {
                return { status: 200, data: breakdown.rows };
            }
            return { status: 200, data: baseData };
        }
        catch (error) {
            throw new Error(`Error building approval display data: ${error.message}`);
        }
    }
    async getPayslipsForUser(idOrUser, viewer) {
        if (!viewer) {
            throw new common_1.UnauthorizedException('Authenticated user required to fetch payslips.');
        }
        const lookup = await this.staffService
            .getById(idOrUser)
            .catch(() => null);
        const slips = await this.processedPayrollModel
            .find({ staffId: lookup?.staffId })
            .sort({ createdAt: -1 })
            .lean()
            .exec();
        const canViewAll = this.hasFinanceScope(viewer) || this.userHasSuperAdminRole(viewer);
        const normalized = slips.map((slip) => {
            const createdAt = slip?.periodDate ? new Date(slip.periodDate) : slip?.createdAt ? new Date(slip.createdAt) : new Date();
            const periodKey = (typeof slip?.periodKey === 'string' && slip.periodKey.trim())
                ? slip.periodKey.toLowerCase()
                : this.buildPeriodKey(createdAt);
            const periodLabel = slip?.period ??
                createdAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            const payslipApproval = slip?.payslipApproval ?? 'Pending';
            const detailsVisible = canViewAll || payslipApproval === 'Approved';
            if (!detailsVisible) {
                return {
                    _id: slip?._id,
                    name: slip?.name,
                    staffId: slip?.staffId,
                    userId: slip?.userId ?? slip?._id,
                    staffObjectId: slip?.staffObjectId ?? slip?.userId ?? slip?._id,
                    employeeId: slip?.employeeId ?? slip?.staffId,
                    entity: slip?.entity,
                    batchId: slip?.batchId,
                    type: slip?.type,
                    status: slip?.status,
                    payslipApproval,
                    detailsVisible,
                    periodKey,
                    period: periodLabel,
                    periodDate: createdAt,
                };
            }
            return {
                ...slip,
                userId: slip?.userId ?? slip?._id,
                staffObjectId: slip?.staffObjectId ?? slip?.userId ?? slip?._id,
                employeeId: slip?.employeeId ?? slip?.staffId,
                payslipApproval,
                detailsVisible,
                periodKey,
                period: periodLabel,
                periodDate: createdAt,
            };
        });
        return { status: 200, data: normalized };
    }
    async getProcessedPayrollByStaffId(staffId, user) {
        const staffRef = typeof staffId === 'string' ? staffId.trim() : String(staffId ?? '').trim();
        if (!staffRef) {
            throw new common_1.BadRequestException('Staff ID is required');
        }
        const identifiers = new Set();
        const addId = (val) => {
            if (!val)
                return;
            if (typeof val === 'object') {
                const candidate = val?._id ??
                    val?.id ??
                    val?.userId ??
                    val?.staffId ??
                    val?.employeeId ??
                    val?.email;
                if (candidate) {
                    addId(candidate);
                }
                return;
            }
            const str = String(val).trim();
            if (str)
                identifiers.add(str);
        };
        addId(staffRef);
        const ids = Array.from(identifiers);
        const query = {
            $or: [
                { staffId: { $in: ids } },
                { employeeId: { $in: ids } },
                { userId: { $in: ids } },
                { staffObjectId: { $in: ids } },
            ],
        };
        const canViewAll = this.hasFinanceScope(user) || this.userHasSuperAdminRole(user);
        if (!canViewAll) {
            query.payslipApproval = 'Approved';
        }
        const slips = await this.processedPayrollModel
            .find(query)
            .sort({ createdAt: -1 })
            .lean()
            .exec();
        const staffObjectId = this.normalizeUserId(staffRef);
        const normalized = slips.map((slip) => {
            const createdAt = slip?.periodDate ? new Date(slip.periodDate) : slip?.createdAt ? new Date(slip.createdAt) : new Date();
            const periodKey = (typeof slip?.periodKey === 'string' && slip.periodKey.trim())
                ? slip.periodKey.toLowerCase()
                : this.buildPeriodKey(createdAt);
            const periodLabel = slip?.period ??
                createdAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            return {
                ...slip,
                userId: slip?.userId ?? staffObjectId ?? slip?._id,
                staffObjectId: slip?.staffObjectId ?? slip?.userId ?? staffObjectId ?? slip?._id,
                employeeId: slip?.employeeId ?? slip?.staffId ?? staffRef,
                staffId: slip?.staffId ?? staffRef,
                periodKey,
                period: periodLabel,
                periodDate: createdAt,
            };
        });
        return { status: 200, data: normalized };
    }
    async requestPayslipApproval(payload, requester) {
        const isPrivileged = this.hasFinanceScope(requester) || this.userHasSuperAdminRole(requester);
        const requesterIdentifiers = this.collectIdentifierValues(requester?._id, requester?.id, requester?.userId, requester?.staffId, requester?.employeeId, requester?.email);
        const requestedFor = payload?.staffId ??
            payload?.employeeId ??
            payload?.userId ??
            payload?.staffObjectId ??
            payload?.staff ??
            null;
        if (!isPrivileged && requestedFor) {
            const target = String(requestedFor).trim();
            if (target && !requesterIdentifiers.includes(target)) {
                throw new common_1.ForbiddenException('You can only request your own payslip approval.');
            }
        }
        const targetRef = requestedFor ??
            requester?.staffId ??
            requester?.employeeId ??
            requester?._id ??
            requester?.id ??
            requester?.userId ??
            null;
        if (!targetRef) {
            throw new common_1.BadRequestException('Staff ID is required');
        }
        const staff = await this.staffService.getById(String(targetRef)).catch(() => null);
        const staffId = typeof staff?.staffId === 'string' && staff.staffId.trim()
            ? staff.staffId.trim()
            : String(targetRef).trim();
        const staffObjectId = staff?._id ? String(staff._id) : this.normalizeUserId(targetRef) ?? undefined;
        const employeeId = staff?.employeeId ?? staff?.id ?? undefined;
        const staffName = staff
            ? `${staff?.lastName ?? ''} ${staff?.firstName ?? ''}`.trim()
            : undefined;
        const periodWindow = this.resolvePayslipPeriodWindow(payload?.periodKey ?? payload?.period ?? payload?.month ?? payload?.periodDate);
        let entityRef = payload?.entity ?? staff?.entity ?? null;
        if (!entityRef) {
            const fallbackIdentifiers = this.collectIdentifierValues(staffId, staffObjectId, employeeId, targetRef);
            const fallbackRow = await this.processedPayrollModel
                .findOne(this.buildPayslipStaffQuery(fallbackIdentifiers))
                .lean();
            entityRef = fallbackRow?.entity ?? null;
        }
        if (!entityRef) {
            throw new common_1.BadRequestException('Entity is required to request payslip approval.');
        }
        const { reviewerIds, approverIds, entityId } = await this.loadPayrollWorkflowConfig(entityRef);
        if (!approverIds.length) {
            throw new common_1.BadRequestException('At least one approver must be configured for this entity.');
        }
        const identifiers = this.collectIdentifierValues(staffId, staffObjectId, employeeId, targetRef, staff?.userId, staff?.email);
        const staffQuery = this.buildPayslipStaffQuery(identifiers);
        const periodQuery = this.buildPayslipPeriodQuery(periodWindow.periodKey, periodWindow.start, periodWindow.end);
        const entityQuery = this.buildProcessedPayrollEntityMatch(entityId);
        const existingPayroll = await this.processedPayrollModel
            .findOne({ ...staffQuery, ...periodQuery, ...entityQuery })
            .lean();
        if (!existingPayroll) {
            throw new common_1.NotFoundException('No processed payroll found for the requested period.');
        }
        const alreadyApproved = await this.processedPayrollModel.exists({
            ...staffQuery,
            ...periodQuery,
            ...entityQuery,
            payslipApproval: 'Approved',
        });
        if (alreadyApproved) {
            return { status: 200, message: 'Payslip already approved for this period.' };
        }
        const approvalQuery = {
            periodKey: periodWindow.periodKey,
            status: { $in: [PAYSLIP_APPROVAL_STATUS.PENDING_REVIEW, PAYSLIP_APPROVAL_STATUS.PENDING_APPROVAL] },
        };
        const approvalOr = [];
        if (staffId)
            approvalOr.push({ staffId });
        if (staffObjectId)
            approvalOr.push({ staffObjectId });
        if (employeeId)
            approvalOr.push({ employeeId });
        if (approvalOr.length) {
            approvalQuery.$or = approvalOr;
        }
        const pendingApproval = await this.payslipApprovalModel.findOne(approvalQuery).lean();
        if (pendingApproval) {
            return { status: 200, message: 'Payslip approval already pending.', data: pendingApproval };
        }
        const hasReviewers = reviewerIds.length > 0;
        const status = hasReviewers
            ? PAYSLIP_APPROVAL_STATUS.PENDING_REVIEW
            : PAYSLIP_APPROVAL_STATUS.PENDING_APPROVAL;
        const currentStage = hasReviewers ? 'REVIEWER' : 'APPROVER';
        const requesterId = this.normalizeUserId(requester?._id);
        const approval = await this.payslipApprovalModel.create({
            staffId,
            staffObjectId,
            employeeId,
            staffName,
            entity: entityId,
            periodKey: periodWindow.periodKey,
            period: periodWindow.periodLabel,
            periodDate: periodWindow.periodDate,
            status,
            currentStage,
            reviewerIds,
            approverIds,
            requestedBy: requesterId ?? undefined,
            requestedByName: this.composeUserName(requester),
        });
        await this.updateProcessedPayrollPayslipApproval(identifiers, periodWindow, entityId, 'Pending');
        const recipients = hasReviewers ? reviewerIds : approverIds;
        const subjectName = staffName || staffId || 'staff member';
        const noticeMessage = `Payslip approval requested for ${subjectName} (${periodWindow.periodLabel}).`;
        await Promise.all(recipients.map((userId) => this.noticeService.createNotice({
            userId,
            message: noticeMessage,
            link: '/payroll/payslip-approvals',
            type: 'payslip-approval',
        })));
        return {
            status: 200,
            message: 'Payslip approval request submitted.',
            data: approval,
        };
    }
    async getPayslipApprovals(user, status, entity) {
        const query = {};
        if (status) {
            query.status = status;
        }
        else {
            query.status = {
                $in: [PAYSLIP_APPROVAL_STATUS.PENDING_REVIEW, PAYSLIP_APPROVAL_STATUS.PENDING_APPROVAL],
            };
        }
        if (entity) {
            query.entity = entity;
        }
        const userId = this.normalizeUserId(user?._id);
        const hasFinanceScope = this.hasFinanceScope(user) || this.userHasSuperAdminRole(user);
        if (!hasFinanceScope) {
            if (!userId) {
                throw new common_1.ForbiddenException('You are not allowed to view payslip approvals.');
            }
            query.$or = [{ requestedBy: userId }, { reviewerIds: userId }, { approverIds: userId }];
        }
        const approvals = await this.payslipApprovalModel.find(query).sort({ createdAt: -1 }).lean();
        return { status: 200, data: approvals };
    }
    async getPayslipApprovalById(user, approvalId) {
        const approval = await this.payslipApprovalModel.findById(approvalId).lean();
        if (!approval) {
            throw new common_1.NotFoundException('Payslip approval request not found');
        }
        const hasFinanceScope = this.hasFinanceScope(user) || this.userHasSuperAdminRole(user);
        const canView = hasFinanceScope ||
            this.isPayslipReviewer(user, approval) ||
            this.isPayslipApprover(user, approval) ||
            (approval.requestedBy && this.normalizeUserId(user?._id) === approval.requestedBy);
        if (!canView) {
            throw new common_1.ForbiddenException('You are not allowed to view this payslip approval request');
        }
        return { status: 200, data: approval };
    }
    async approvePayslipApproval(approvalId, user) {
        const approval = await this.payslipApprovalModel.findById(approvalId);
        if (!approval) {
            throw new common_1.NotFoundException('Payslip approval request not found');
        }
        if (approval.status === PAYSLIP_APPROVAL_STATUS.APPROVED) {
            throw new common_1.BadRequestException('Payslip approval already completed');
        }
        if (approval.status === PAYSLIP_APPROVAL_STATUS.REJECTED) {
            throw new common_1.BadRequestException('Payslip approval has been rejected');
        }
        const userId = this.normalizeUserId(user?._id);
        const hasFinanceScope = this.hasFinanceScope(user);
        const isSuperAdmin = this.userHasSuperAdminRole(user);
        if (approval.status === PAYSLIP_APPROVAL_STATUS.PENDING_REVIEW) {
            if (!this.isPayslipReviewer(user, approval) && !hasFinanceScope && !isSuperAdmin) {
                throw new common_1.ForbiddenException('Only configured reviewers can approve at this stage');
            }
            approval.reviewerApprovedBy = userId ?? approval.reviewerApprovedBy;
            approval.reviewerApprovedAt = new Date();
            approval.status = PAYSLIP_APPROVAL_STATUS.PENDING_APPROVAL;
            approval.currentStage = 'APPROVER';
            await approval.save();
            const recipients = approval.approverIds ?? [];
            const subjectName = approval.staffName ?? approval.staffId ?? 'staff member';
            const noticeMessage = `Payslip approval for ${subjectName} (${approval.period ?? approval.periodKey}) requires your approval.`;
            await Promise.all(recipients.map((recipientId) => this.noticeService.createNotice({
                userId: recipientId,
                message: noticeMessage,
                link: '/payroll/payslip-approvals',
                type: 'payslip-approval',
            })));
            return { status: 200, message: 'Payslip approval escalated to final approvers.' };
        }
        if (approval.status === PAYSLIP_APPROVAL_STATUS.PENDING_APPROVAL) {
            if (!this.isPayslipApprover(user, approval) && !hasFinanceScope && !isSuperAdmin) {
                throw new common_1.ForbiddenException('Only configured approvers can approve at this stage');
            }
            approval.approverApprovedBy = userId ?? approval.approverApprovedBy;
            approval.approverApprovedAt = new Date();
            approval.status = PAYSLIP_APPROVAL_STATUS.APPROVED;
            approval.currentStage = 'APPROVED';
            await approval.save();
            const periodWindow = this.resolvePayslipPeriodWindow(approval.periodKey ?? approval.periodDate);
            const identifiers = this.collectIdentifierValues(approval.staffId, approval.staffObjectId, approval.employeeId);
            await this.updateProcessedPayrollPayslipApproval(identifiers, periodWindow, approval.entity, 'Approved');
            if (approval.requestedBy) {
                const noticeMessage = `Payslip approval completed for ${approval.period ?? approval.periodKey}.`;
                await this.noticeService.createNotice({
                    userId: approval.requestedBy,
                    message: noticeMessage,
                    link: `/my-payslips`,
                    type: 'payslip-approval-completed',
                });
            }
            return { status: 200, message: 'Payslip approval completed.' };
        }
        throw new common_1.BadRequestException('Invalid payslip approval status');
    }
    async rejectPayslipApproval(approvalId, user, reason) {
        const approval = await this.payslipApprovalModel.findById(approvalId);
        if (!approval) {
            throw new common_1.NotFoundException('Payslip approval request not found');
        }
        if (approval.status === PAYSLIP_APPROVAL_STATUS.APPROVED) {
            throw new common_1.BadRequestException('Payslip approval already completed');
        }
        if (approval.status === PAYSLIP_APPROVAL_STATUS.REJECTED) {
            throw new common_1.BadRequestException('Payslip approval has already been rejected');
        }
        const hasFinanceScope = this.hasFinanceScope(user);
        const isSuperAdmin = this.userHasSuperAdminRole(user);
        if (approval.status === PAYSLIP_APPROVAL_STATUS.PENDING_REVIEW) {
            if (!this.isPayslipReviewer(user, approval) && !hasFinanceScope && !isSuperAdmin) {
                throw new common_1.ForbiddenException('Only configured reviewers can reject at this stage');
            }
        }
        else if (approval.status === PAYSLIP_APPROVAL_STATUS.PENDING_APPROVAL) {
            if (!this.isPayslipApprover(user, approval) && !hasFinanceScope && !isSuperAdmin) {
                throw new common_1.ForbiddenException('Only configured approvers can reject at this stage');
            }
        }
        approval.status = PAYSLIP_APPROVAL_STATUS.REJECTED;
        approval.currentStage = 'REJECTED';
        approval.rejectionReason = reason;
        await approval.save();
        const periodWindow = this.resolvePayslipPeriodWindow(approval.periodKey ?? approval.periodDate);
        const identifiers = this.collectIdentifierValues(approval.staffId, approval.staffObjectId, approval.employeeId);
        await this.updateProcessedPayrollPayslipApproval(identifiers, periodWindow, approval.entity, 'Rejected');
        if (approval.requestedBy) {
            const noticeMessage = `Payslip approval for ${approval.period ?? approval.periodKey} was rejected.`;
            await this.noticeService.createNotice({
                userId: approval.requestedBy,
                message: noticeMessage,
                link: `/my-payslips`,
                type: 'payslip-approval-rejected',
            });
        }
        return { status: 200, message: 'Payslip approval rejected.' };
    }
    async getProcessedPayroll(entity, month, type) {
        try {
            const entityId = await this.normalizeEntityIdStrict(entity);
            const [year, mon] = month?.split("-").map(Number);
            const query = {
                entity: entityId,
                createdAt: {
                    $gte: new Date(year, mon - 1, 1),
                    $lt: new Date(year, mon, 1),
                },
            };
            if (type) {
                if (type === 'pension') {
                    query.type = { $in: ['pension', 'companyPension'] };
                }
                else {
                    query.type = type;
                }
            }
            const payrollData = await this.processedPayrollModel.find(query).exec();
            return { status: 200, data: payrollData };
        }
        catch (error) {
            throw new Error(`Error fetching payroll data: ${error.message}`);
        }
    }
    async savePayrollPerformance(payload) {
        const records = Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload?.records)
                ? payload.records
                : payload
                    ? [payload]
                    : [];
        if (!records.length) {
            throw new common_1.BadRequestException('No performance records provided.');
        }
        const fallbackMonth = payload?.month ?? payload?.period ?? payload?.periodKey;
        let fallbackEntity = null;
        if (payload?.entity) {
            fallbackEntity = await this.normalizeEntityIdStrict(payload.entity).catch(() => null);
        }
        const errors = [];
        const operations = [];
        for (let index = 0; index < records.length; index += 1) {
            const entry = records[index] ?? {};
            const rowNumber = index + 1;
            const staffId = String(entry?.staffId ?? entry?.employeeId ?? entry?.userId ?? '').trim();
            if (!staffId) {
                errors.push({ row: rowNumber, error: 'Missing staffId.' });
                continue;
            }
            const rawScore = entry?.score ?? entry?.performanceScore ?? entry?.rating;
            const score = this.parsePerformanceScore(rawScore);
            if (score === null) {
                errors.push({
                    row: rowNumber,
                    staffId,
                    error: 'Score must be a number between 0 and 100.',
                });
                continue;
            }
            const periodInput = entry?.month ?? entry?.period ?? entry?.periodKey ?? fallbackMonth;
            if (!periodInput) {
                errors.push({ row: rowNumber, staffId, error: 'Month is required.' });
                continue;
            }
            let periodKey = '';
            let periodLabel = '';
            let periodDate = null;
            try {
                const resolved = this.resolvePerformancePeriod(periodInput);
                periodKey = resolved.periodKey;
                periodLabel = resolved.periodLabel;
                periodDate = resolved.periodDate;
            }
            catch (error) {
                errors.push({
                    row: rowNumber,
                    staffId,
                    error: error?.message || 'Invalid month.',
                });
                continue;
            }
            let entityId = this.resolveEntityId(entry?.entity) ?? fallbackEntity ?? null;
            let employeeId;
            let userId;
            if (!entityId) {
                const staff = await this.staffService.getStaffById(staffId).catch(() => null);
                if (staff) {
                    entityId = this.normalizeEntityKey(staff?.entity) ?? null;
                    employeeId = staff?._id ? String(staff._id) : undefined;
                    userId = staff?.userId ? String(staff.userId) : undefined;
                }
            }
            else {
                if (entry?.employeeId) {
                    employeeId = String(entry.employeeId).trim() || undefined;
                }
                if (entry?.userId) {
                    userId = String(entry.userId).trim() || undefined;
                }
            }
            if (!entityId) {
                errors.push({
                    row: rowNumber,
                    staffId,
                    error: 'Entity is required or could not be resolved from staffId.',
                });
                continue;
            }
            const update = {
                staffId,
                score,
                periodKey,
                periodLabel,
                periodDate,
                entity: entityId,
            };
            if (employeeId) {
                update.employeeId = employeeId;
            }
            if (userId) {
                update.userId = userId;
            }
            operations.push({
                updateOne: {
                    filter: { staffId, periodKey, entity: entityId },
                    update: { $set: update },
                    upsert: true,
                },
            });
        }
        if (!operations.length) {
            throw new common_1.BadRequestException('No valid performance records to save.');
        }
        await this.payrollPerformanceModel.bulkWrite(operations, { ordered: false });
        return {
            status: 200,
            message: 'Performance scores saved.',
            processed: operations.length,
            errors,
        };
    }
    async getPayrollPerformance(entity, month, staffId) {
        const { periodKey, periodLabel } = this.resolvePerformancePeriod(month);
        const query = { periodKey };
        const entityId = this.resolveEntityId(entity);
        if (entityId) {
            Object.assign(query, this.buildProcessedPayrollEntityMatch(entityId));
        }
        if (staffId) {
            query.staffId = String(staffId).trim();
        }
        const data = await this.payrollPerformanceModel
            .find(query)
            .sort({ staffId: 1 })
            .lean()
            .exec();
        return {
            status: 200,
            periodKey,
            periodLabel,
            data,
        };
    }
    async getTemplates(payload, type, entity, periodInput) {
        let users = await this.rearrangeUser(payload, entity);
        if (type === "variable") {
            const { periodKey } = this.resolvePerformancePeriod(periodInput);
            const entityId = this.resolveEntityId(entity);
            const performanceLookup = entityId
                ? await this.loadPerformanceScoreLookup(entityId, periodKey)
                : new Map();
            return users?.map(({ employeeId, staffId, firstName, lastName, middleName, addosserAccount, atlasAccount, levelName = null, branch = null, monthlyVariable, startDate, exitDate }) => {
                const score = performanceLookup.get(String(staffId ?? '').trim()) ??
                    performanceLookup.get(String(employeeId ?? '').trim());
                return {
                    entity,
                    employeeId,
                    staffId,
                    name: `${lastName} ${firstName} ${middleName ? middleName : ""}`,
                    account: addosserAccount,
                    atlas: atlasAccount,
                    grade: levelName,
                    branch: branch,
                    variable: monthlyVariable,
                    performanceScore: score,
                    startDate: startDate,
                    exitDate: exitDate
                };
            });
        }
        if (type === "reimbursable") {
            return users.map(({ employeeId, staffId, firstName, lastName, middleName, addosserAccount, atlasAccount, levelName = null, branch = null, monthlyReimbursable, startDate, exitDate }) => {
                return {
                    entity,
                    employeeId,
                    staffId,
                    name: `${lastName} ${firstName} ${middleName ? middleName : ""}`,
                    account: addosserAccount,
                    atlas: atlasAccount,
                    grade: levelName,
                    branch: branch,
                    reimbursable: monthlyReimbursable,
                    startDate: startDate,
                    exitDate: exitDate,
                };
            });
        }
        if (type === "salary") {
            return users.map(({ employeeId, staffId, firstName, lastName, middleName, addosserAccount, levelName, branch = null, pensionAccount, nhfAccount, payeAccount, pensionProvider, accountDetail, basic, housing, transport, dress, utilities, lunch, telephone, monthlyGross, pension, nhf, monthlyTax, monthlyNet, monthlyCompanyPension, startDate, exitDate, rent }) => {
                const detail = accountDetail || {};
                const resolvedNhf = nhfAccount ?? detail?.nhf ?? detail?.nhfAccount;
                const resolvedPaye = payeAccount ?? detail?.payeAccount ?? detail?.taxProfileId;
                const resolvedPensionAccount = pensionAccount ?? detail?.pensionAccount ?? detail?.rsaNumber;
                const resolvedPensionProvider = pensionProvider ?? detail?.pensionProvider ?? detail?.pfa;
                return {
                    employeeId,
                    staffId,
                    name: `${lastName} ${firstName} ${middleName ? middleName : ""}`,
                    account: addosserAccount,
                    grade: levelName,
                    branch: branch,
                    basic,
                    housing,
                    transport,
                    dress,
                    utilities,
                    lunch,
                    telephone,
                    gross: monthlyGross,
                    pension,
                    nhf,
                    paye: monthlyTax,
                    monthlyCompanyPension,
                    monthlyNet,
                    nhfAccount: resolvedNhf,
                    payeAccount: resolvedPaye,
                    pensionAccount: resolvedPensionAccount,
                    pensionProvider: resolvedPensionProvider,
                    startDate: startDate,
                    exitDate: exitDate,
                    entity,
                    rent
                };
            });
        }
        throw new Error(`Invalid type: ${type}`);
    }
    async rearrangeUser(payload, entity) {
        const transformedUsers = payload?.map(({ _id, id, staffId, firstName, middleName, lastName, branch, atlasAccount, addosserAccount, level, startDate, exitDate, employeeInformation, rent, rentStartDate, rentEndDate }) => {
            const detail = employeeInformation?.accountDetail ?? {};
            return ({
                employeeId: _id ?? id ?? '',
                staffId,
                firstName,
                middleName: middleName,
                lastName,
                branch: branch?.name,
                levelId: level?._id,
                levelName: level?.name,
                atlasAccount,
                addosserAccount,
                accountDetail: detail,
                nhfAccount: detail?.nhf ?? detail?.nhfAccount ?? employeeInformation?.nhf ?? employeeInformation?.nhfAccount,
                payeAccount: detail?.payeAccount ?? detail?.taxProfileId ?? employeeInformation?.payeAccount ?? employeeInformation?.taxProfileId,
                pensionAccount: detail?.pensionAccount ?? detail?.rsaNumber ?? employeeInformation?.pensionAccount ?? employeeInformation?.rsaNumber,
                pensionProvider: detail?.pensionProvider ?? detail?.pfa ?? employeeInformation?.pensionProvider ?? employeeInformation?.pfa,
                startDate,
                exitDate,
                rent,
                rentStartDate,
                rentEndDate
            });
        });
        return Promise.all(transformedUsers?.map(async (item) => ({
            ...item,
            ...await this.findByLevelId(item?.levelName, entity, item.rent
                ? {
                    rent: item.rent,
                    rentStartDate: item.rentStartDate,
                    rentEndDate: item.rentEndDate,
                }
                : null)
        })));
    }
    async calculateTotal() {
        return await this.processedPayrollModel.aggregate([
            {
                $group: {
                    _id: "$entity",
                    totalAmount: { $sum: "$amount" },
                    totalCount: { $sum: 1 },
                    totalPension: { $sum: "$pension" },
                    totalpaye: { $sum: "$paye" },
                    totalReimbursable: { $sum: "$reimbursable" },
                    totalVariable: { $sum: "$variable" },
                    totalBank: { $sum: "$bank" },
                    totalIndividual: { $sum: "$individual" },
                    totalSalary: { $sum: "$salary" },
                    totalGross: { $sum: "$gross" },
                    totalNet: { $sum: "$net" },
                    totalTax: { $sum: "$tax" },
                    totalNHF: { $sum: "$nhf" },
                    totalCompanyPension: { $sum: "$companyPension" }
                }
            }
        ]);
    }
    async uploadXlsx(source, fileName) {
        try {
            const normalizedName = String(fileName ?? '').toLowerCase();
            if (normalizedName.endsWith('.xls')) {
                throw new Error('Legacy .xls files are not supported. Please save as .xlsx or .csv.');
            }
            let jsonData = [];
            if (normalizedName.endsWith('.csv')) {
                jsonData = (0, spreadsheet_util_1.csvBufferToRowArrays)(source);
            }
            else {
                try {
                    const workbook = await (0, spreadsheet_util_1.loadWorkbook)(source, fileName);
                    const sheet = (0, spreadsheet_util_1.getFirstWorksheet)(workbook);
                    if (!sheet) {
                        throw new Error('No worksheet found in uploaded file.');
                    }
                    jsonData = (0, spreadsheet_util_1.worksheetToRowArrays)(sheet);
                }
                catch (error) {
                    const fallback = (0, spreadsheet_util_1.csvBufferToRowArrays)(source);
                    if (!fallback.length) {
                        throw error;
                    }
                    jsonData = fallback;
                }
            }
            let processed = 0;
            let skipped = 0;
            for (const row of jsonData.slice(1)) {
                const rawEntity = row[0];
                const levelValue = row[1];
                const amountValue = row[2];
                const aftaValue = row[3];
                const entityShort = String(rawEntity ?? "").trim().toUpperCase();
                if (!entityShort) {
                    skipped += 1;
                    continue;
                }
                const entity = await this.entityService.getSubsidiaryByShort(entityShort);
                if (!entity) {
                    skipped += 1;
                    continue;
                }
                const level = String(levelValue ?? "").trim();
                if (!level) {
                    skipped += 1;
                    continue;
                }
                const hasAmountValue = amountValue !== undefined &&
                    amountValue !== null &&
                    String(amountValue).trim() !== "";
                const hasAftaValue = aftaValue !== undefined &&
                    aftaValue !== null &&
                    String(aftaValue).trim() !== "";
                if (!hasAmountValue && !hasAftaValue) {
                    skipped += 1;
                    continue;
                }
                const createMappingDto = {
                    entity: entity._id,
                    level: level.toUpperCase(),
                };
                if (hasAmountValue) {
                    createMappingDto.amount = this.ensureNumber(amountValue, 0);
                }
                if (hasAftaValue) {
                    createMappingDto.afta = this.ensureNumber(aftaValue, 0);
                }
                const result = await this.mapPayroll(createMappingDto, null);
                if (result?.status === 200) {
                    processed += 1;
                }
                else {
                    skipped += 1;
                }
            }
            return {
                status: 200,
                message: 'Updated successfully',
                processed,
                skipped,
            };
        }
        catch (e) {
            throw new Error(e.message);
        }
    }
    async sendAttachmentThroughSocket(filePath, fileName) {
        const file = await fetch(filePath);
        const fileBlob = await file.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const fileBase64 = reader.result;
                const data = {
                    fileBase64,
                    fileName,
                };
                resolve(data);
            };
            reader.onerror = (error) => {
                reject(error);
            };
            reader.readAsDataURL(fileBlob);
        });
    }
    async markPostingComplete(approvalId, user) {
        const approval = await this.payrollApprovalModel.findById(approvalId);
        if (!approval) {
            throw new common_1.NotFoundException('Payroll approval request not found');
        }
        if (this.isAuditDepartment(user)) {
            throw new common_1.ForbiddenException('Audit department has read-only access to payroll approvals.');
        }
        const canPost = this.isPoster(user, approval) || this.hasFinanceScope(user) || this.userHasSuperAdminRole(user);
        if (!canPost) {
            throw new common_1.ForbiddenException('Only the posting assignee or super admin can mark posting as completed.');
        }
        const userId = this.normalizeUserId(user?._id);
        const actorName = this.composeUserName(user);
        approval.postingApprovedBy = userId ?? approval.postingApprovedBy;
        approval.postingApprovedByName = actorName ?? approval.postingApprovedByName;
        approval.postingApprovedAt = new Date();
        approval.status = PAYROLL_APPROVAL_STATUS.APPROVED;
        approval.currentStage = 'POSTED';
        await approval.save();
        await this.syncLeaveAllowanceApprovalRecord(approval);
        return { message: 'Posting status updated successfully', data: approval };
    }
    async getLeaveAllowanceApprovals(user, status, entity, assignedOnly = false, userIdFilter) {
        const query = {};
        const normalizedStatus = typeof status === 'string' && status.trim() ? status.trim().toUpperCase() : undefined;
        const userId = this.normalizeUserId(user?._id);
        const currentUserIdentifiers = this.collectIdentifierValues(user?.id, user?._id, user?.userId, user?.email).map((v) => String(v).trim()).filter(Boolean);
        const requestedIdentifiers = userIdFilter
            ? this.collectIdentifierValues(userIdFilter).map((v) => String(v).trim()).filter(Boolean)
            : [];
        const targetIdentifiers = requestedIdentifiers.length ? requestedIdentifiers : currentUserIdentifiers;
        const isSuperAdmin = this.userHasSuperAdminRole(user);
        const isFinanceOrAudit = this.hasFinanceScope(user) || this.isAuditDepartment(user);
        if (entity) {
            const resolvedEntity = this.resolveEntityId(entity);
            if (resolvedEntity)
                query.entity = resolvedEntity;
        }
        if (normalizedStatus) {
            query.status = normalizedStatus;
        }
        else {
            query.status = { $in: ['PENDING_REVIEW', 'PENDING_APPROVAL', 'PENDING_POSTING', 'APPROVED', 'REJECTED'] };
        }
        if (!isSuperAdmin && !isFinanceOrAudit) {
            const targetObjectIds = targetIdentifiers
                .filter((v) => mongoose_2.Types.ObjectId.isValid(v))
                .map((v) => new mongoose_2.Types.ObjectId(v));
            const roleFilters = [
                { initiatorId: { $in: targetIdentifiers } },
                { requestedBy: { $in: targetIdentifiers } },
                { reviewerIds: { $in: targetIdentifiers } },
                { approverIds: { $in: targetIdentifiers } },
                { postingIds: { $in: targetIdentifiers } },
                { auditViewerIds: { $in: targetIdentifiers } },
            ];
            if (targetObjectIds.length) {
                roleFilters.push({ initiatorId: { $in: targetObjectIds } }, { reviewerIds: { $in: targetObjectIds } }, { approverIds: { $in: targetObjectIds } }, { postingIds: { $in: targetObjectIds } });
            }
            query.$or = roleFilters;
        }
        const approvals = await this.leaveAllowanceApprovalModel
            .find(query)
            .sort({ createdAt: -1 })
            .lean()
            .exec();
        return { status: 200, data: approvals };
    }
    async getLeaveAllowanceApprovalById(user, id) {
        if (!id || !mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid approval id.');
        }
        const approval = await this.leaveAllowanceApprovalModel
            .findById(new mongoose_2.Types.ObjectId(id))
            .lean()
            .exec();
        if (!approval) {
            throw new common_1.NotFoundException('Leave allowance approval not found.');
        }
        return { status: 200, data: approval };
    }
    async approveLeaveAllowanceApproval(user, id, comment) {
        const approval = await this.leaveAllowanceApprovalModel.findById(id).exec();
        if (!approval)
            throw new common_1.NotFoundException('Leave allowance approval not found.');
        if (approval.status === 'REJECTED')
            throw new common_1.BadRequestException('Approval has been rejected.');
        if (approval.status === 'APPROVED')
            throw new common_1.BadRequestException('Approval is already completed.');
        const userId = this.normalizeUserId(user?._id) ?? '';
        const userName = this.composeUserName(user) ?? '';
        if (approval.status === 'PENDING_REVIEW') {
            approval.status = 'PENDING_APPROVAL';
            approval.currentStage = 'APPROVER';
            approval.reviewerApprovedBy = userId;
            approval.reviewerApprovedByName = userName;
            approval.reviewerApprovedAt = new Date();
            if (comment)
                approval.reviewerComment = comment;
            await approval.save();
            await this.syncPayrollApprovalFromLeave(approval);
            return { status: 200, message: 'Leave batch moved to approvers.' };
        }
        if (approval.status === 'PENDING_APPROVAL') {
            approval.status = 'PENDING_POSTING';
            approval.currentStage = 'POSTING';
            approval.approverApprovedBy = userId;
            approval.approverApprovedByName = userName;
            approval.approverApprovedAt = new Date();
            await approval.save();
            await this.syncPayrollApprovalFromLeave(approval);
            return { status: 200, message: 'Leave batch approved and forwarded for posting.' };
        }
        throw new common_1.BadRequestException(`Cannot approve approval with status ${approval.status}.`);
    }
    async rejectLeaveAllowanceApproval(user, id, reason) {
        const approval = await this.leaveAllowanceApprovalModel.findById(id).exec();
        if (!approval)
            throw new common_1.NotFoundException('Leave allowance approval not found.');
        if (approval.status === 'REJECTED')
            throw new common_1.BadRequestException('Already rejected.');
        if (approval.status === 'APPROVED')
            throw new common_1.BadRequestException('Cannot reject a completed approval.');
        approval.status = 'REJECTED';
        approval.rejectionReason = reason ?? '';
        await approval.save();
        await this.syncPayrollApprovalFromLeave(approval);
        return { status: 200, message: 'Leave batch rejected.' };
    }
    async markLeaveAllowancePostingComplete(user, id) {
        const approval = await this.leaveAllowanceApprovalModel.findById(id).exec();
        if (!approval)
            throw new common_1.NotFoundException('Leave allowance approval not found.');
        if (approval.status !== 'PENDING_POSTING') {
            throw new common_1.BadRequestException('Approval is not in posting stage.');
        }
        const userId = this.normalizeUserId(user?._id) ?? '';
        const userName = this.composeUserName(user) ?? '';
        approval.postingApprovedBy = userId;
        approval.postingApprovedByName = userName;
        approval.postingApprovedAt = new Date();
        approval.status = 'APPROVED';
        approval.currentStage = 'POSTED';
        await approval.save();
        await this.syncPayrollApprovalFromLeave(approval);
        return { status: 200, message: 'Leave batch marked as posted.' };
    }
    async syncPayrollApprovalFromLeave(leaveApproval) {
        const payrollApprovalId = leaveApproval?.payrollApprovalId;
        if (!payrollApprovalId)
            return;
        try {
            await this.payrollApprovalModel.findByIdAndUpdate(payrollApprovalId, {
                $set: {
                    status: leaveApproval.status,
                    currentStage: leaveApproval.currentStage,
                    reviewerApprovedBy: leaveApproval.reviewerApprovedBy,
                    reviewerApprovedByName: leaveApproval.reviewerApprovedByName,
                    reviewerApprovedAt: leaveApproval.reviewerApprovedAt,
                    reviewerComment: leaveApproval.reviewerComment,
                    approverApprovedBy: leaveApproval.approverApprovedBy,
                    approverApprovedByName: leaveApproval.approverApprovedByName,
                    approverApprovedAt: leaveApproval.approverApprovedAt,
                    postingApprovedBy: leaveApproval.postingApprovedBy,
                    postingApprovedByName: leaveApproval.postingApprovedByName,
                    postingApprovedAt: leaveApproval.postingApprovedAt,
                    rejectionReason: leaveApproval.rejectionReason,
                },
            });
        }
        catch {
        }
    }
};
exports.PayrollService = PayrollService;
PayrollService.SUPER_ADMIN_ROLE_NAMES = new Set([
    'super admin',
    'super-admin',
    'superadmin',
    'hr super admin',
    'hr-super-admin',
    'hrsuperadmin',
    'gmd',
    'group hr director',
    'group-hr-director',
    'grouphrdirector',
]);
PayrollService.APPROVER_VIEW_STATUSES = new Set([
    PAYROLL_APPROVAL_STATUS.PENDING_APPROVAL,
    PAYROLL_APPROVAL_STATUS.PENDING_POSTING,
    PAYROLL_APPROVAL_STATUS.APPROVED,
    PAYROLL_APPROVAL_STATUS.REJECTED,
]);
PayrollService.REVIEWER_VIEW_STATUSES = new Set([
    PAYROLL_APPROVAL_STATUS.PENDING_REVIEW,
    PAYROLL_APPROVAL_STATUS.PENDING_APPROVAL,
    PAYROLL_APPROVAL_STATUS.PENDING_POSTING,
    PAYROLL_APPROVAL_STATUS.APPROVED,
]);
PayrollService.POSTER_VIEW_STATUSES = new Set([
    PAYROLL_APPROVAL_STATUS.PENDING_APPROVAL,
    PAYROLL_APPROVAL_STATUS.PENDING_POSTING,
    PAYROLL_APPROVAL_STATUS.APPROVED
]);
PayrollService.FINANCE_AUDIT_VIEW_STATUSES = new Set([
    PAYROLL_APPROVAL_STATUS.PENDING_APPROVAL,
    PAYROLL_APPROVAL_STATUS.PENDING_POSTING,
    PAYROLL_APPROVAL_STATUS.APPROVED,
    PAYROLL_APPROVAL_STATUS.REJECTED,
]);
PayrollService.DEFAULT_APPROVAL_VIEW_STATUSES = new Set([
    PAYROLL_APPROVAL_STATUS.PENDING_REVIEW,
    PAYROLL_APPROVAL_STATUS.PENDING_APPROVAL,
    PAYROLL_APPROVAL_STATUS.PENDING_POSTING,
    PAYROLL_APPROVAL_STATUS.APPROVED,
    PAYROLL_APPROVAL_STATUS.REJECTED,
]);
exports.PayrollService = PayrollService = PayrollService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Payroll')),
    __param(1, (0, mongoose_1.InjectModel)('ProcessedPayroll')),
    __param(2, (0, mongoose_1.InjectModel)('PayrollMap')),
    __param(3, (0, mongoose_1.InjectModel)(payroll_performance_schema_1.PayrollPerformance.name)),
    __param(4, (0, mongoose_1.InjectModel)(attendance_schema_1.Attendance.name)),
    __param(5, (0, mongoose_1.InjectModel)(leave_schema_1.Leave.name)),
    __param(6, (0, mongoose_1.InjectModel)(attendanceConfig_schema_1.AttendanceConfig.name)),
    __param(7, (0, mongoose_1.InjectModel)(tax_config_schema_1.TaxConfig.name)),
    __param(8, (0, mongoose_1.InjectModel)(payrollApproval_schema_1.PayrollApproval.name)),
    __param(9, (0, mongoose_1.InjectModel)(payslipApproval_schema_1.PayslipApproval.name)),
    __param(10, (0, mongoose_1.InjectModel)(payroll_workflow_schema_1.PayrollWorkflowConfig.name)),
    __param(11, (0, mongoose_1.InjectModel)(leave_allowance_workflow_schema_1.LeaveAllowanceWorkflowConfig.name)),
    __param(12, (0, mongoose_1.InjectModel)(leave_allowance_approval_schema_1.LeaveAllowanceApproval.name)),
    __param(13, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(14, (0, mongoose_1.InjectModel)(holiday_schema_1.Holiday.name)),
    __param(15, (0, mongoose_1.InjectModel)(disciplinary_case_schema_1.DisciplinaryCase.name)),
    __param(19, (0, common_1.Optional)()),
    __param(20, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        subsidiary_service_1.SubsidiaryService,
        user_service_1.StaffService,
        notice_service_1.NoticeService,
        mail_service_1.MailService,
        smtp_config_service_1.SmtpConfigService])
], PayrollService);
//# sourceMappingURL=payroll.service.js.map