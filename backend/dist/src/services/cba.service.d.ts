export declare class CbaService {
    private readonly logger;
    private readonly requestTimeoutMs;
    private resolveCbaUrl;
    private resolveApiKey;
    fetchSalaryCallOver(narration: string): Promise<{
        status: number;
        data: any;
    }>;
}
