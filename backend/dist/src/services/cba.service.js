"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var CbaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CbaService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const config_1 = require("../config");
let CbaService = CbaService_1 = class CbaService {
    constructor() {
        this.logger = new common_1.Logger(CbaService_1.name);
        this.requestTimeoutMs = Number(process.env.CBA_TIMEOUT_MS ?? 200000);
    }
    resolveCbaUrl() {
        const url = String(config_1.config.cbaUrl ?? '').trim();
        if (!url) {
            throw new common_1.ServiceUnavailableException('CBA service URL is not configured.');
        }
        return url;
    }
    resolveApiKey() {
        const apiKey = String(config_1.config.cbaApiKey ?? '').trim();
        if (!apiKey) {
            throw new common_1.ServiceUnavailableException('CBA API key is not configured.');
        }
        return apiKey;
    }
    async fetchSalaryCallOver(narration) {
        const trimmedNarration = narration?.trim();
        if (!trimmedNarration) {
            throw new common_1.BadRequestException('Narration is required for salary callover.');
        }
        try {
            const url = this.resolveCbaUrl();
            const apiKey = this.resolveApiKey();
            const startedAt = Date.now();
            const response = await axios_1.default.post(url, {
                "type": "oracle",
                "actions": "salaryCallover",
                "id": {
                    "data": {
                        "narration": trimmedNarration
                    }
                }
            }, {
                headers: {
                    'x-api-key': apiKey,
                },
                timeout: this.requestTimeoutMs,
            });
            const elapsedMs = Date.now() - startedAt;
            this.logger.log(`CBA callover request completed in ${elapsedMs}ms`);
            const payload = response;
            const rows = payload?.data ?? payload?.data?.data;
            return {
                status: 200,
                data: rows,
            };
        }
        catch (error) {
            const status = error?.response?.status;
            const code = error?.code;
            const isTimeout = code === 'ECONNABORTED' || /timeout/i.test(String(error?.message ?? ''));
            this.logger.error(`CBA callover request failed. status=${status ?? 'n/a'} code=${code ?? 'n/a'} timeout=${isTimeout}`);
            if (isTimeout) {
                throw new common_1.ServiceUnavailableException(`CBA service timed out after ${this.requestTimeoutMs}ms while fetching callover data.`);
            }
            throw new common_1.ServiceUnavailableException('Unable to fetch callover data from CBA service.');
        }
    }
};
exports.CbaService = CbaService;
exports.CbaService = CbaService = CbaService_1 = __decorate([
    (0, common_1.Injectable)()
], CbaService);
//# sourceMappingURL=cba.service.js.map