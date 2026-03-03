import { DocumentLibraryService } from 'src/services/document-library.service';
export declare class DocumentLibraryController {
    private readonly documentService;
    constructor(documentService: DocumentLibraryService);
    private ensureUploadDir;
    listDocuments(req: any, search?: string, category?: string, owner?: string, featured?: string, excludeEmployeeDocuments?: string, page?: string, limit?: string): Promise<{
        data: any[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    categories(req: any, excludeEmployeeDocuments?: string): Promise<{
        category: any;
        total: any;
    }[]>;
    getDocument(req: any, id: string): Promise<import("mongoose").FlattenMaps<import("../schemas/document-library.schema").DocumentLibraryDocument> & Required<{
        _id: import("mongoose").FlattenMaps<unknown>;
    }> & {
        __v: number;
    }>;
    createDocument(req: any, body: any, file?: Express.Multer.File): Promise<import("mongoose").Document<unknown, {}, import("../schemas/document-library.schema").DocumentLibraryDocument, {}, {}> & import("../schemas/document-library.schema").DocumentLibrary & import("mongoose").Document<unknown, any, any, Record<string, any>, {}> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    updateDocument(req: any, id: string, body: any, file?: Express.Multer.File): Promise<import("mongoose").Document<unknown, {}, import("../schemas/document-library.schema").DocumentLibraryDocument, {}, {}> & import("../schemas/document-library.schema").DocumentLibrary & import("mongoose").Document<unknown, any, any, Record<string, any>, {}> & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    deleteDocument(req: any, id: string): Promise<{
        deleted: boolean;
    }>;
}
