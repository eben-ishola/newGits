import { Model } from 'mongoose';
import { User } from 'src/schemas/user.schema';
declare const JwtStrategy_base: new (...args: any) => any;
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly staffModel;
    constructor(staffModel: Model<User>);
    validate(payload: any): Promise<any>;
    private sanitizeUser;
    private normalizeAndPopulateAdditionalRoles;
}
export {};
