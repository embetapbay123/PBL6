import { ModerationRepository } from './moderation.repository';
import { attributeDefinitionResponse, categoryResponse, productTypeResponse } from '../catalog/catalog.mapper';
export class ModerationService {
  constructor(private readonly repository = new ModerationRepository()) {}
  async createCategory(b:any,a:string,r:string){return categoryResponse(await this.repository.createCategory(b,a,r))}
  async updateCategory(id:string,b:any,a:string,r:string){return categoryResponse(await this.repository.updateCategory(id,b,a,r))}
  async createProductType(b:any,a:string,r:string){const row=await this.repository.createProductType(b,a,r);return productTypeResponse(row,row.attribute_definitions)}
  async updateProductType(id:string,b:any,a:string,r:string){const row=await this.repository.updateProductType(id,b,a,r);return productTypeResponse(row,row.attribute_definitions)}
  async createAttributeDefinition(b:any,a:string,r:string){return attributeDefinitionResponse(await this.repository.createAttributeDefinition(b,a,r))}
  async updateAttributeDefinition(id:string,b:any,a:string,r:string){return attributeDefinitionResponse(await this.repository.updateAttributeDefinition(id,b,a,r))}
  hideProduct(id:string,b:any,a:string,r:string){return this.repository.setProductModeration(id,false,b,a,r)}
  restoreProduct(id:string,b:any,a:string,r:string){return this.repository.setProductModeration(id,true,b,a,r)}
}
