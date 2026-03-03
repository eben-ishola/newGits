import { Model, Types } from 'mongoose';
import { Department } from 'src/schemas/department.schema';
export declare class DepartmentService {
    private readonly departmentModel;
    constructor(departmentModel: Model<Department>);
    createDepartment(createUserDto: any): Promise<any>;
    findAllDepartment(page?: number, limit?: number, searchText?: string, entity?: string): Promise<any>;
    updateDepartment(id: string, updateDto: any): Promise<any>;
    findDepartmentes(entity?: string): Promise<any>;
    getDepartmentByName(name: string): Promise<any>;
    getDepartmentByNameAndEntity(name: string, entity?: string | Types.ObjectId | null): Promise<any>;
}
