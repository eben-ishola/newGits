import { Model } from 'mongoose';
import { BusinessUnit } from 'src/schemas/businessunit.schema';
export declare class BusinessUnitService {
    private readonly businessunitModel;
    constructor(businessunitModel: Model<BusinessUnit>);
    createBusinessUnit(createUserDto: any): Promise<any>;
    findAllBusinessUnit(page: number, limit: number, searchText: string): Promise<any>;
    findBusinessUnites(): Promise<any>;
    getBusinessUnitByName(name: string): Promise<any>;
    updateBusinessUnit(id: string, updateBusinessUnitDto: any): Promise<any>;
}
