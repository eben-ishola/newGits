import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { User } from 'src/schemas/user.schema';
import { MailService } from 'src/services/mail.service';
export declare class AuthService {
    private readonly staffModel;
    private readonly jwtService;
    private readonly mailService?;
    constructor(staffModel: Model<User>, jwtService: JwtService, mailService?: MailService);
    validateUser(identifier: string, password: string): Promise<any>;
    private buildIdentifierQuery;
    private getAuthCollation;
    private isDefaultPassword;
    signIn(rawIdentifier: string, password: string): Promise<{
        accessToken: string;
        access_token: string;
        user: any;
        default: boolean;
    }>;
    changePassword(userId: string | undefined, currentPassword?: string, newPassword?: string): Promise<{
        message: string;
    }>;
    private buildEmailQuery;
    private getPortalBaseUrl;
    requestPasswordReset(email?: string): Promise<{
        sent: boolean;
    }>;
    private getResetUser;
    verifyPasswordReset(email?: string, token?: string): Promise<{
        valid: boolean;
        email: string;
        expiresAt: string;
    }>;
    resetPasswordWithToken(email?: string, token?: string, newPassword?: string): Promise<{
        message: string;
    }>;
    sanitizeUser(user: any): any;
    private extractObjectIdCandidate;
    private normalizeObjectId;
    private normalizeAdditionalRoleEntry;
    private normalizeAndPopulateAdditionalRoles;
}
