import { Model } from 'mongoose';
import { SmtpConfigDocument } from 'src/schemas/smtp-config.schema';
type UpdateSmtpConfigInput = {
    enabled?: boolean;
    payrollEmailEnabled?: boolean;
    host?: string;
    port?: number | string;
    secure?: boolean;
    username?: string;
    password?: string;
    fromEmail?: string;
    fromName?: string;
    headerText?: string;
    footerText?: string;
    headerHtml?: string;
    footerHtml?: string;
};
export declare class SmtpConfigService {
    private readonly smtpModel;
    constructor(smtpModel: Model<SmtpConfigDocument>);
    private sanitizeString;
    private toBoolean;
    private toNumber;
    private stripSecrets;
    getConfig(options?: {
        includeSecrets?: boolean;
    }): Promise<any>;
    updateConfig(payload: UpdateSmtpConfigInput): Promise<any>;
}
export {};
