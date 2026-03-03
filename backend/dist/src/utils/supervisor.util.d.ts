import { Model } from 'mongoose';
import { User } from 'src/schemas/user.schema';
type MutableUser = any;
export declare const injectSupervisorMetadata: (staffModel: Model<User>, user: MutableUser) => Promise<void>;
export {};
