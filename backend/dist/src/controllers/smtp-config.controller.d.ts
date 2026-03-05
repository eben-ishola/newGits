import { SmtpConfigService } from 'src/services/smtp-config.service';
export declare class SmtpConfigController {
    private readonly smtpConfigService;
    constructor(smtpConfigService: SmtpConfigService);
    getConfig(): Promise<any>;
    updateConfig(body: any): Promise<any>;
}
