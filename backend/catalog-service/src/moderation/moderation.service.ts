import { ModerationRepository } from './moderation.repository';
export class ModerationService {
  constructor(private readonly repository = new ModerationRepository()) {}
  createCategory(b:any,a:string,r:string){return this.repository.createCategory(b,a,r)}
  updateCategory(id:string,b:any,a:string,r:string){return this.repository.updateCategory(id,b,a,r)}
  createProductType(b:any,a:string,r:string){return this.repository.createProductType(b,a,r)}
  updateProductType(id:string,b:any,a:string,r:string){return this.repository.updateProductType(id,b,a,r)}
  createAttributeDefinition(b:any,a:string,r:string){return this.repository.createAttributeDefinition(b,a,r)}
  updateAttributeDefinition(id:string,b:any,a:string,r:string){return this.repository.updateAttributeDefinition(id,b,a,r)}
  hideProduct(id:string,b:any,a:string,r:string){return this.repository.setProductModeration(id,false,b,a,r)}
  restoreProduct(id:string,b:any,a:string,r:string){return this.repository.setProductModeration(id,true,b,a,r)}
}
