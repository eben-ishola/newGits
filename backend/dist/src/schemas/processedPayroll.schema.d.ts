import { Document } from 'mongoose';
export declare class ProcessedPayroll extends Document {
    name: String;
    staffId: String;
    account: String;
    accountNo: String;
    userId?: String;
    staffObjectId?: String;
    employeeId?: String;
    periodKey?: String;
    period?: String;
    periodDate?: Date;
    grade: String;
    basic: String;
    housing: String;
    transport: String;
    dress: String;
    utilities: String;
    lunch: String;
    telephone: String;
    gross: String;
    nhf: String;
    pension: String;
    companyPension: String;
    paye: String;
    payeAccount: String;
    nhfAccount: String;
    pensionAccount: String;
    pensionProvider: String;
    amount: String;
    type: String;
    entity: String;
    batchId: String;
    branch: String;
    status: String;
    payslipApproval?: String;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare const ProcessedPayrollSchema: import("mongoose").Schema<ProcessedPayroll, import("mongoose").Model<ProcessedPayroll, any, any, any, Document<unknown, any, ProcessedPayroll, any, {}> & ProcessedPayroll & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ProcessedPayroll, Document<unknown, {}, import("mongoose").FlatRecord<ProcessedPayroll>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<ProcessedPayroll> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
