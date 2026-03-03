"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.config = {
    neutralDB: "mongodb://admin:admin101!@127.0.0.1:27017/hrms?authSource=admin",
    authDB: "mongodb://admin:admin101!@127.0.0.1:27017/hrms?authSource=admin",
    mainDB: "mongodb://admin:admin101!@127.0.0.1:27017/hrms?authSource=admin",
    incentivesDB: "mongodb://authDB:__authDB@196.1.177.226:27117/incentives?authMechanism=DEFAULT&authSource=admin",
    savingsDB: "mongodb://authDB:__authDB@196.1.177.226:27117/saveDB?authMechanism=DEFAULT&authSource=admin",
    cbaUrl: process.env.CBA_URL ?? "https://controlapi.addosser.com/access-data",
    cbaApiKey: process.env.CBA_API_KEY ?? "api_live_dc96eaa44ccca99ddb0ddb1966339bf78e35357a6c0c4bc5",
    performanceKpiOpenDay: Number(process.env.PERF_KPI_OPEN_DAY ?? 1),
    performanceKpiApiImportDay: Number(process.env.PERF_KPI_API_IMPORT_DAY ?? 2),
    performanceKpiApiUrl: process.env.PERF_KPI_API_URL ?? "",
    performanceKpiApiToken: process.env.PERF_KPI_API_TOKEN ?? "",
    performanceKpiApiPeriodOffsetMonths: Number(process.env.PERF_KPI_API_PERIOD_OFFSET_MONTHS ?? 0),
};
//# sourceMappingURL=config.js.map