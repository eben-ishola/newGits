import { AttendanceService } from '../services/attendance.service';
export declare class AttendanceController {
    private svc;
    constructor(svc: AttendanceService);
    clockIn(body: any, file?: Express.Multer.File): Promise<{
        _id: any;
        employeeId: any;
        date: any;
        clockIn: any;
        clockOut: any;
        totalHours: any;
        status: any;
        workMode: any;
        note: any;
        clockInPhotoUrl: any;
    }>;
    clockOut(body: {
        employeeId: string;
        ip: string;
        city: string;
        country: string;
        org: string;
        mode?: string;
    }): Promise<{
        _id: any;
        employeeId: any;
        date: any;
        clockIn: any;
        clockOut: any;
        totalHours: any;
        status: any;
        workMode: any;
        note: any;
        clockInPhotoUrl: any;
    }>;
    addNote(attendanceId: string, body: {
        note: string;
    }): Promise<{
        _id: any;
        employeeId: any;
        date: any;
        clockIn: any;
        clockOut: any;
        totalHours: any;
        status: any;
        workMode: any;
        note: any;
        clockInPhotoUrl: any;
    }>;
    getConfig(): Promise<{
        startOfBusiness: string;
        closeOfBusiness: string;
        excludeWeekends: any;
        publicHolidays: string[];
        publicHolidayBase: string[];
        publicHolidayAdditions: string[];
        publicHolidayRemovals: string[];
        enableAutoAbsent: any;
        enableAutoClockOut: any;
        gracePeriodInMinutes: any;
        officeIps: any;
        clockInWindowStart: string;
        lateThresholdTime: string;
        absentThresholdTime: string;
        allowLateNotes: any;
    }>;
    updateConfig(body: any): Promise<{
        startOfBusiness: string;
        closeOfBusiness: string;
        excludeWeekends: any;
        publicHolidays: string[];
        publicHolidayBase: string[];
        publicHolidayAdditions: string[];
        publicHolidayRemovals: string[];
        enableAutoAbsent: any;
        enableAutoClockOut: any;
        gracePeriodInMinutes: any;
        officeIps: any;
        clockInWindowStart: string;
        lateThresholdTime: string;
        absentThresholdTime: string;
        allowLateNotes: any;
    }>;
    getMonthlyStats(employeeId: string): Promise<{
        present: number;
        late: number;
        absent: number;
        total: number;
    }>;
    getRecords(employeeId: string, month: number, year: number, page?: number, limit?: number, includeFullData?: string): Promise<any>;
    getAttendance(viewMode: 'daily' | 'weekly', date: string, search: string, role: 'hr' | 'supervisor' | 'none', entity: any, page?: number, limit?: number, status?: string, mode?: string, department?: string, branch?: string, supervisorId?: string): Promise<{
        data: any;
        totalPages: number;
        currentPage: number;
        stats: {
            attendanceRate: number;
            absenceRate: number;
            lateRate: number;
            remoteShare: number;
            totalEmployees: any;
            totalDays: number;
            totalWorkingDays: number;
            totalRecords: number;
            totalExpectedRecords: number;
            present: number;
            late: number;
            absent: number;
            weekend: number;
            holiday: number;
            remote: number;
            onsite: number;
        };
    }>;
}
