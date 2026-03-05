import { AuthService } from './services/auth.service';
import { SignInDto } from './dto/sign-in.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(payload: SignInDto): Promise<{
        accessToken: string;
        access_token: string;
        user: any;
        default: boolean;
    }>;
    changePassword(body: {
        currentPassword?: string;
        newPassword?: string;
    }, user: any): Promise<{
        message: string;
    }>;
    verifyResetPassword(body: {
        token?: string;
        email?: string;
    }): Promise<{
        valid: boolean;
        email: string;
        expiresAt: string;
    }>;
    requestPasswordReset(body: {
        email?: string;
    }): Promise<{
        sent: boolean;
    }>;
    resetPassword(body: {
        token?: string;
        email?: string;
        newPassword?: string;
    }): Promise<{
        message: string;
    }>;
}
