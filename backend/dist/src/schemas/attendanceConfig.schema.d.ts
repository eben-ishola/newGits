import { Document } from 'mongoose';
export type AttendanceConfigDocument = AttendanceConfig & Document;
export declare class AttendanceConfig {
    startOfBusiness: string;
    closeOfBusiness: string;
    clockInWindowStart?: string;
    lateThresholdTime?: string;
    absentThresholdTime?: string;
    excludeWeekends: boolean;
    publicHolidays: string[];
    publicHolidayAdditions: string[];
    publicHolidayRemovals: string[];
    enableAutoAbsent: boolean;
    enableAutoClockOut: boolean;
    gracePeriodInMinutes: number;
    officeIps: string[];
    allowLateNotes?: boolean;
}
export declare const AttendanceConfigSchema: import("mongoose").Schema<AttendanceConfig, import("mongoose").Model<AttendanceConfig, any, any, any, Document<unknown, any, AttendanceConfig, any, {}> & AttendanceConfig & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AttendanceConfig, Document<unknown, {}, import("mongoose").FlatRecord<AttendanceConfig>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<AttendanceConfig> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
