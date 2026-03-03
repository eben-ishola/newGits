import { Model } from 'mongoose';
import { PerformanceKpi } from '../schemas/kpi.schema';
import { PerformanceKpiResult, PerformanceKpiResultDocument } from '../schemas/performance-kpi-result.schema';
export declare class PerformanceKpiResultService {
    private readonly resultModel;
    private readonly kpiModel;
    constructor(resultModel: Model<PerformanceKpiResultDocument>, kpiModel: Model<PerformanceKpi>);
    private buildScopeKey;
    private computeScore;
    listResults(filters: Partial<{
        period: string;
        periodStart: string;
        periodEnd: string;
        employeeId: string;
        status: string;
        source: string;
        kpiId: string;
        search: string;
        entity: string;
    }>, page?: number, limit?: number): Promise<{
        data: (import("mongoose").FlattenMaps<PerformanceKpiResultDocument> & Required<{
            _id: import("mongoose").FlattenMaps<unknown>;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    submitManualResult(payload: {
        kpiId: string;
        period?: string;
        employeeId?: string;
        employeeName?: string;
        actualValue?: string;
        entity?: string;
    }, actorId?: string): Promise<import("mongoose").Document<unknown, {}, PerformanceKpiResultDocument, {}, {}> & PerformanceKpiResult & import("mongoose").Document<unknown, any, any, Record<string, any>, {}> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    approveResult(id: string, updates: {
        actualValue?: string;
        isActualValueLocked?: boolean;
        status?: string;
        reviewerName?: string;
    }, actorId?: string): Promise<import("mongoose").Document<unknown, {}, PerformanceKpiResultDocument, {}, {}> & PerformanceKpiResult & import("mongoose").Document<unknown, any, any, Record<string, any>, {}> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    openMonthlyResults(periodInput?: string): Promise<{
        created: number;
        skipped: number;
    }>;
    importApiResults(payload: {
        period?: string;
        results?: Array<Record<string, any>>;
    }): Promise<{
        updated: number;
        skipped: number;
    }>;
}
