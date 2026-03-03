"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const mongoose_1 = require("mongoose");
const spreadsheet_util_1 = require("../utils/spreadsheet.util");
const config_1 = require("../config");
const kpi_service_1 = require("../services/kpi.service");
const kpi_schema_1 = require("../schemas/kpi.schema");
const kpi_category_schema_1 = require("../schemas/kpi-category.schema");
const fileArg = process.argv[2];
if (!fileArg) {
    console.error('csv_path_required');
    process.exit(1);
}
const csvPath = path.isAbsolute(fileArg)
    ? fileArg
    : path.join(process.cwd(), fileArg);
(async () => {
    try {
        const buffer = fs.readFileSync(csvPath);
        const parsed = (0, spreadsheet_util_1.csvBufferToObjects)(buffer, { defval: '', trim: true }).rows;
        const rows = parsed
            .map((row) => {
            const normalized = {};
            Object.entries(row ?? {}).forEach(([key, value]) => {
                const header = String(key ?? '').trim().toLowerCase();
                if (!header)
                    return;
                normalized[header] = String(value ?? '').trim();
            });
            return normalized;
        })
            .filter((row) => Object.keys(row).length > 0);
        if (!rows.length) {
            console.error('no_rows_found');
            process.exit(1);
        }
        await mongoose_1.default.connect(config_1.config.mainDB, { serverSelectionTimeoutMS: 5000 });
        const kpiModel = mongoose_1.default.models[kpi_schema_1.PerformanceKpi.name] ||
            mongoose_1.default.model(kpi_schema_1.PerformanceKpi.name, kpi_schema_1.PerformanceKpiSchema);
        const categoryModel = mongoose_1.default.models[kpi_category_schema_1.KpiCategory.name] ||
            mongoose_1.default.model(kpi_category_schema_1.KpiCategory.name, kpi_category_schema_1.KpiCategorySchema);
        const service = new kpi_service_1.KpiService(kpiModel, categoryModel);
        const debugService = service;
        if (rows[0]) {
            const sample = rows[0];
            const scopes = debugService.scopesFromRow(sample);
            const derivedType = scopes.size
                ? debugService.deriveTypeFromScopes(scopes)
                : undefined;
            try {
                console.log(JSON.stringify({
                    sample,
                    scopes: Array.from(scopes),
                    derivedType,
                    targetFields: debugService.buildTargetFields({
                        type: derivedType ?? sample.kpi_type,
                        employeeId: sample.employee_id,
                        employeeName: sample.employee_name,
                        roleId: sample.role_id,
                        roleName: sample.role_name,
                        levelId: sample.level_id,
                        levelName: sample.level_name,
                    }),
                }, null, 2));
            }
            catch (error) {
                console.log(JSON.stringify({
                    sample,
                    scopes: Array.from(scopes),
                    derivedType,
                    error: error?.message ?? 'unknown',
                }, null, 2));
            }
        }
        const result = await service.bulkCreateFromCsv(rows);
        console.log(JSON.stringify(result, null, 2));
        await mongoose_1.default.disconnect();
    }
    catch (error) {
        console.error('seed_failed');
        process.exit(1);
    }
})();
//# sourceMappingURL=seed-kpi-from-csv.js.map