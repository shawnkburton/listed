import type {Property,PropertyRepository} from './domain';
import {preparedListing} from './prepared-listings';
import nearby from './nearby-properties.json';
const denison=preparedListing('202-denison-road')!;
export const properties:Property[]=[...nearby as Property[],{...structuredClone(denison.property),id:'import-202-denison-road',source:'imported',tags:['Imported preview','Ocean view'],notes:denison.notes}];
export const propertyRepository:PropertyRepository={async list(){return properties;},async get(id){return properties.find(p=>p.id===id);}};
