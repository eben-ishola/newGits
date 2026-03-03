import { PerformanceService } from '../services/performance.service';
export declare class PerformanceController {
    private readonly performanceService;
    constructor(performanceService: PerformanceService);
    listReviews(user: any, status?: string, department?: string, reviewer?: string, employeeId?: string, search?: string, supervisorScope?: string, entity?: string, appraisalCycleId?: string, page?: string, limit?: string): Promise<{
        data: (import("mongoose").FlattenMaps<import("../schemas/performance-review.schema").PerformanceReviewDocument> & Required<{
            _id: import("mongoose").FlattenMaps<unknown>;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getReview(id: string, user: any): Promise<import("mongoose").FlattenMaps<import("../schemas/performance-review.schema").PerformanceReviewDocument> & Required<{
        _id: import("mongoose").FlattenMaps<unknown>;
    }> & {
        __v: number;
    }>;
    createReview(payload: any): Promise<import("mongoose").Document<unknown, {}, import("../schemas/performance-review.schema").PerformanceReviewDocument, {}, {}> & import("../schemas/performance-review.schema").PerformanceReview & import("mongoose").Document<unknown, any, any, Record<string, any>, {}> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    bulkUploadReviews(file: Express.Multer.File): Promise<{
        created: number;
        skipped: number;
    }>;
    updateReview(id: string, payload: any, user: any): Promise<import("mongoose").Document<unknown, {}, import("../schemas/performance-review.schema").PerformanceReviewDocument, {}, {}> & import("../schemas/performance-review.schema").PerformanceReview & import("mongoose").Document<unknown, any, any, Record<string, any>, {}> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    deleteReview(id: string): Promise<{
        deleted: boolean;
    }>;
    getWorkflowConfigs(user: any, entity?: string): Promise<any>;
    saveWorkflowConfig(user: any, payload: any): Promise<any>;
    listCoreValues(user: any, entity?: string): Promise<any>;
    createCoreValue(user: any, payload: any): Promise<any>;
    updateCoreValue(user: any, id: string, payload: any): Promise<any>;
    deleteCoreValue(user: any, id: string): Promise<any>;
    listAppraisalCycles(user: any, entity?: string, search?: string): Promise<any>;
    listActiveAppraisalCycles(user: any, entity?: string): Promise<any>;
    debugAppraisalCycleExists(user: any, entity?: string): Promise<any>;
    getAppraisalCycle(user: any, id: string): Promise<any>;
    createAppraisalCycle(user: any, payload: any): Promise<any>;
    updateAppraisalCycle(user: any, id: string, payload: any): Promise<any>;
    deleteAppraisalCycle(user: any, id: string): Promise<any>;
}
