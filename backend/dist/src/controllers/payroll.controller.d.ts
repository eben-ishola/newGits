import { PayrollService } from '../services/payroll.service';
import { CbaService } from 'src/services/cba.service';
export declare class PayrollController {
    private readonly payrollService;
    private readonly cbaService;
    constructor(payrollService: PayrollService, cbaService: CbaService);
    calculatePayroll(payload: any): Promise<any>;
    calculateTotal(): Promise<any>;
    processPayroll(payload: any, user: any): Promise<any>;
    previewPayroll(payload: any, user: any): Promise<any>;
    getAttendanceSummary(payload: any, user: any): Promise<any>;
    createPayroll(payload: any, user: any): Promise<any>;
    getTaxConfigs(entity?: string): Promise<any>;
    saveTaxConfig(payload: any): Promise<any>;
    mapPayroll(payload: any, user: any): Promise<any>;
    findAll(page: number, limit: number, entity: any): Promise<any>;
    findAllMap(page: number, limit: number, entity: any, user: any): Promise<any>;
    generatePayroll(payload: any): Promise<any>;
    savePayrollPerformance(payload: any): Promise<any>;
    getPayrollPerformance(entity?: string, month?: string, staffId?: string): Promise<any>;
    getPayrollApprovals(user: any, status?: string, entity?: string, userId?: string, assignedId?: string, approverOnly?: string, assignedOnly?: string, workflowType?: string): Promise<any>;
    getLeaveAllowancePaidUsers(user: any, entity?: string, year?: string): Promise<any>;
    getApprovalStaff(approvalId: string, user: any): Promise<any>;
    getPayrollApprovalById(approvalId: string, user: any): Promise<any>;
    fetchSalaryCallOver(user: any, narration?: string, approvalId?: string, batchId?: string, entity?: string, month?: string, type?: string): Promise<{
        status: number;
        data: any[];
        comparison: any[];
        summary: {
            calloverCount: number;
            payrollCount: number;
            matched: number;
            mismatched: number;
            missing: number;
            unexpected: number;
            hasIssues: boolean;
            comparisonSkipped: boolean;
        };
        payrollCount?: undefined;
    } | {
        status: number;
        data: any[];
        payrollCount: number;
        comparison: {
            account: string;
            payrollAmount: number;
            calloverAmount: number;
            difference: number;
            status: "matched" | "mismatch" | "missing" | "unexpected";
            flag: boolean;
        }[];
        summary: {
            calloverCount: number;
            payrollCount: number;
            matched: number;
            mismatched: number;
            missing: number;
            unexpected: number;
            hasIssues: boolean;
            comparisonSkipped: boolean;
        };
    }>;
    updatePayrollApprovalComment(approvalId: string, payload: any, user: any): Promise<any>;
    getMyPayslips(userId: string, user: any): Promise<any>;
    requestPayslipApproval(payload: any, user: any): Promise<any>;
    getPayslipApprovals(user: any, status?: string, entity?: string): Promise<any>;
    getPayslipApprovalById(approvalId: string, user: any): Promise<any>;
    approvePayslipApproval(approvalId: string, user: any): Promise<any>;
    rejectPayslipApproval(approvalId: string, reason: string, user: any): Promise<any>;
    approvePayroll(approvalId: string, payload: any, user: any): Promise<any>;
    rejectPayroll(approvalId: string, reason: string, user: any): Promise<any>;
    markPostingComplete(approvalId: string, user: any): Promise<any>;
    getWorkflowConfigs(user: any, entity?: string): Promise<any>;
    getWorkflowRole(user: any, entity?: string, scanAll?: string): Promise<any>;
    getLeaveWorkflowRole(user: any, entity?: string, scanAll?: string): Promise<any>;
    saveWorkflowConfig(user: any, payload: any): Promise<any>;
    getLeaveWorkflowConfigs(user: any, entity?: string): Promise<any>;
    saveLeaveWorkflowConfig(user: any, payload: any): Promise<any>;
    getLeaveApprovals(user: any, status?: string, entity?: string, userId?: string, assignedId?: string, assignedOnly?: string): Promise<{
        status: number;
        data: (import("mongoose").FlattenMaps<import("../schemas/leave-allowance-approval.schema").LeaveAllowanceApproval> & Required<{
            _id: import("mongoose").FlattenMaps<unknown>;
        }> & {
            __v: number;
        })[];
    }>;
    getLeaveApprovalById(id: string, user: any): Promise<{
        status: number;
        data: import("mongoose").FlattenMaps<import("../schemas/leave-allowance-approval.schema").LeaveAllowanceApproval> & Required<{
            _id: import("mongoose").FlattenMaps<unknown>;
        }> & {
            __v: number;
        };
    }>;
    approveLeaveApproval(id: string, user: any, body: any): Promise<{
        status: number;
        message: string;
    }>;
    rejectLeaveApproval(id: string, user: any, body: any): Promise<{
        status: number;
        message: string;
    }>;
    markLeaveApprovalPosted(id: string, user: any): Promise<{
        status: number;
        message: string;
    }>;
    findByLevel(gradeLevel: string, entity: string): Promise<any>;
    fetchProcessedPayrollByStaffId(staffId: string, user: any): Promise<any>;
    fetchProcessedPayroll(entity: string, month: string, type?: string): Promise<any>;
    fetchProcessedPayrollById(id: string, user: any): Promise<any>;
    uploadXlsx(file: Express.Multer.File): Promise<any>;
    uploadCSV(file: Express.Multer.File): {
        message: string;
        file: string;
        fileName: string;
        filePath: string;
        fileUrl: string;
    };
    findById(id: string): Promise<import("../schemas/payroll.schema").Payroll>;
}
