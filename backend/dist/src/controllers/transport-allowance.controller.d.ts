import { TransportAllowanceService } from 'src/services/transport-allowance.service';
export declare class TransportAllowanceController {
    private readonly transportAllowanceService;
    constructor(transportAllowanceService: TransportAllowanceService);
    list(entity?: string, department?: string, staff?: string, year?: string, month?: string, weekOfMonth?: string): Promise<{
        status: number;
        data: (import("mongoose").FlattenMaps<import("../schemas/transport-allowance.schema").TransportAllowanceDocument> & Required<{
            _id: import("mongoose").FlattenMaps<unknown>;
        }> & {
            __v: number;
        })[];
    }>;
    listSettings(entity?: string, transportLevel?: string, page?: string, limit?: string): Promise<{
        status: number;
        data: (import("mongoose").FlattenMaps<import("../schemas/transport-allowance-setting.schema").TransportAllowanceSettingDocument> & Required<{
            _id: import("mongoose").FlattenMaps<unknown>;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    } | {
        status: number;
        data: (import("mongoose").FlattenMaps<import("../schemas/transport-allowance-setting.schema").TransportAllowanceSettingDocument> & Required<{
            _id: import("mongoose").FlattenMaps<unknown>;
        }> & {
            __v: number;
        })[];
        total?: undefined;
        page?: undefined;
        limit?: undefined;
        totalPages?: undefined;
    }>;
    upsertSetting(payload: any): Promise<{
        status: number;
        data: import("mongoose").FlattenMaps<import("../schemas/transport-allowance-setting.schema").TransportAllowanceSettingDocument> & Required<{
            _id: import("mongoose").FlattenMaps<unknown>;
        }> & {
            __v: number;
        };
    }>;
    bulkUpsertSettings(file: Express.Multer.File, entity?: string): Promise<{
        status: number;
        processed: number;
        imported: number;
        skipped: number;
        updated: number;
        upserted: number;
        errors: {
            row: number;
            field?: string;
            error: string;
        }[];
    }>;
    deleteSetting(id: string): Promise<{
        status: number;
        deleted: boolean;
    }>;
    getWorkflowConfigs(entity?: string): Promise<{
        status: number;
        data: (import("mongoose").FlattenMaps<import("../schemas/transport-workflow.schema").TransportWorkflowConfigDocument> & Required<{
            _id: import("mongoose").FlattenMaps<unknown>;
        }> & {
            __v: number;
        })[];
    }>;
    saveWorkflowConfig(payload: any): Promise<{
        status: number;
        data: import("mongoose").FlattenMaps<import("../schemas/transport-workflow.schema").TransportWorkflowConfigDocument> & Required<{
            _id: import("mongoose").FlattenMaps<unknown>;
        }> & {
            __v: number;
        };
    }>;
    upsert(payload: any): Promise<{
        status: number;
        updated: number;
        upserted: number;
    }>;
    preview(payload: any): Promise<{
        status: number;
        data: {
            staff: string;
            entity: string;
            department: string;
            year: number;
            month: number;
            weekOfMonth: number;
            staffId: any;
            staffName: any;
            addosserAccount: any;
            baseDays: number;
            days: number;
            baseAmount: number;
            proratedAmount: number;
        }[];
        totals: {
            total: number;
        };
    }>;
    generate(payload: any): Promise<{
        status: number;
        data: {
            id: string;
            staff: string;
            staffObjectId: string;
            staffId: string;
            name: string;
            addosserAccount: string;
            departmentId: string;
            transportLevel: string;
            baseAmount: number;
            baseDays: number;
            days: number;
            proratedAmount: number;
            year: number;
            month: number;
            weekOfMonth: number;
            frequency: "weekly" | "monthly";
            entity: string;
            department: string;
        }[];
        totals: {
            total: number;
        };
    }>;
    submit(payload: any, user: any): Promise<{
        status: number;
        message: string;
        approvalId: unknown;
    }>;
    approvals(user: any, status?: string, entity?: string, assignedOnly?: string, userId?: string, assignedId?: string): Promise<{
        status: number;
        data: any[];
    }>;
    getApprovalById(id: string, user: any): Promise<{
        status: number;
        data: any;
    }>;
    approveApproval(id: string, comment: string, user: any): Promise<{
        status: number;
        message: string;
    }>;
    rejectApproval(id: string, reason: string, user: any): Promise<{
        status: number;
        message: string;
    }>;
    markPosted(id: string, user: any): Promise<{
        status: number;
        message: string;
    }>;
    getWorkflowRole(user: any, entity?: string, scanAll?: string): Promise<{
        status: number;
        data: {
            isReviewer: boolean;
            isFinalApprover: boolean;
            isPoster: boolean;
            isAuditViewer: boolean;
            isInitiator: boolean;
            entities: string[];
            entityCount: number;
        };
    }>;
}
