import mongoose, { Document } from 'mongoose';
export declare class BusinessUnit {
    BU_NM: string;
    BU_ID: Number;
    BU_NO: Number;
    territory: mongoose.Schema.Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}
export type BusinessUnitDocument = Document & BusinessUnit;
export declare const BusinessUnitSchema: mongoose.Schema<BusinessUnit, mongoose.Model<BusinessUnit, any, any, any, mongoose.Document<unknown, any, BusinessUnit, any, {}> & BusinessUnit & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, BusinessUnit, mongoose.Document<unknown, {}, mongoose.FlatRecord<BusinessUnit>, {}, mongoose.ResolveSchemaOptions<mongoose.DefaultSchemaOptions>> & mongoose.FlatRecord<BusinessUnit> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
