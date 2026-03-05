export type AccessScope = 'group' | 'entity' | 'department' | 'self' | 'finance';
export declare const collectRoleScopes: (roleLike: any) => AccessScope[];
export declare const deriveUserScopes: (user: any) => Set<AccessScope>;
export declare const userHasScope: (user: any, required: AccessScope | AccessScope[]) => boolean;
export declare const assertUserScope: (user: any, required: AccessScope | AccessScope[], message?: string) => void;
