import { HttpService } from '@nestjs/axios';
import { StaffService } from 'src/services/user.service';
import { PerformanceKpiResultService } from 'src/services/performance-kpi-result.service';
export declare class CronService {
    private readonly httpService;
    private readonly staffService;
    private readonly performanceKpiResultService;
    constructor(httpService: HttpService, staffService: StaffService, performanceKpiResultService: PerformanceKpiResultService);
    handleCron(): Promise<void>;
    handlePerformanceKpiCron(): Promise<void>;
}
