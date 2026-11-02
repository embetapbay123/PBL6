import 'reflect-metadata';
import {plainToInstance} from 'class-transformer';
import {validate} from 'class-validator';
import {ListOwnInvitationsQueryDto,ListStaffInvitationsQueryDto} from '../../shared/src/dtos.generated';
import {StaffSkeletonController} from '../../identity-store-service/src/staff/staff.skeleton.controller';

test.each([['own','listOwnInvitations',ListOwnInvitationsQueryDto],['store','listStaffInvitations',ListStaffInvitationsQueryDto]] as const)('%s invitations use the contract query DTO so HTTP numeric strings are normalized',async(_scope,method,Dto)=>{
 expect(Reflect.getMetadata('design:paramtypes',StaffSkeletonController.prototype,method)[1]).toBe(Dto);
 const query=plainToInstance(Dto,{page:'2',size:'20'});expect(await validate(query)).toEqual([]);expect(query).toMatchObject({page:2,size:20});
 for(const input of [{page:'0',size:'20'},{page:'1.5',size:'20'},{page:'1',size:'101'},{page:'abc',size:'20'}])expect((await validate(plainToInstance(Dto,input))).length).toBeGreaterThan(0);
});
