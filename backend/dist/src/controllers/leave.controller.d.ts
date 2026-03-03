import { LeaveService } from '../services/leave.service';
import { Leave } from '../schemas/leave.schema';
export declare class LeaveController {
    private readonly leaveService;
    constructor(leaveService: LeaveService);
    findHolidays(): Promise<any>;
    createHoliday(body: any): Promise<any>;
    updateHolidays(): Promise<any>;
    updateHolidayName(id: string, name: string): Promise<any>;
    deleteHoliday(id: string): Promise<any>;
    findLeavesPaginated(page: number, limit: number, role: 'hr' | 'supervisor' | 'reliever' | 'admin', entity: any, searchQuery?: string, supervisorId?: string, supervisorScope?: string, relieverId?: string, createdFrom?: string, createdTo?: string, status?: string, statusStage?: string, user?: any): Promise<{
        data: Leave[];
        total: number;
    }>;
    createLeave(leaveData: any, file: Express.Multer.File): Promise<{
        message: string;
        data: Leave;
    }>;
    findAllLeaves(): Promise<Leave[]>;
    getSettings(): Promise<{
        id: string;
        noticePeriodDays: any;
        requireHandoverNote: any;
        noticeExemptTypes: any;
        fixedAllocations: any;
        companyGL: string;
        leaveGL: string;
        updatedAt: Date;
        createdAt: Date;
    }>;
    listMappings(): Promise<{
        status: number;
        data: any[];
    }>;
    upsertMapping(body: any, user: any): Promise<{
        status: number;
        data: any;
    }>;
    updateSettings(body: any): Promise<{
        id: string;
        noticePeriodDays: any;
        requireHandoverNote: any;
        noticeExemptTypes: any;
        fixedAllocations: any;
        companyGL: string;
        leaveGL: string;
        updatedAt: Date;
        createdAt: Date;
    }>;
    findLeaveByUser(id: string, year?: string): Promise<any>;
    findApprovedByUser(id: string, year?: string, type?: string): Promise<any>;
    getUserEntitlements(userId: string): Promise<{
        userId: string;
        totalDays: number;
        allocations: {
            annual: number;
            maternity: number;
            paternity: number;
            sick: number;
            casual: number;
            unpaid: number;
            compassionate: number;
        };
    }>;
    approveLeave(id: string, type: 'reliever' | 'hod' | 'hr', approverId: string, status: string, comment?: string): Promise<any>;
    reassignSupervisorApprover(id: string, supervisorId: string, approverId: string, hodApproval: string, user: any): Promise<any>;
    reassignRelieverApprover(id: string, relieverId: string, relievingOfficer: string, approverId: string, user: any): Promise<any>;
    nudgeLeaveApprover(id: string, user: any): Promise<any>;
    findLeaveById(id: string): Promise<any>;
    updateLeave(id: string, updateData: Partial<any>): Promise<any>;
    deleteLeave(id: string): Promise<any>;
}
