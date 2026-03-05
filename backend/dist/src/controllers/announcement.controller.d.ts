import { AnnouncementService } from "src/services/announcement.service";
export declare class AnnouncementController {
    private readonly announcementService;
    constructor(announcementService: AnnouncementService);
    findAll(req: any, limit?: string, pinned?: string, includeExpired?: string, search?: string, includeAllAudiences?: string): Promise<(import("mongoose").FlattenMaps<import("../schemas/announcement.schema").AnnouncementDocument> & Required<{
        _id: import("mongoose").FlattenMaps<unknown>;
    }> & {
        __v: number;
    })[]>;
    create(body: {
        title: string;
        content: string;
        type?: string;
        pinned?: boolean;
        date?: string;
        expiresAt?: string;
        audienceScope?: "ALL" | "SELECTED";
        entityIds?: string[];
    }): Promise<import("mongoose").Document<unknown, {}, import("../schemas/announcement.schema").AnnouncementDocument, {}, {}> & import("../schemas/announcement.schema").Announcement & import("mongoose").Document<unknown, any, any, Record<string, any>, {}> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
}
