export function yearBuiltLimits(currentYear=new Date().getFullYear()){
 return {min:currentYear-500,max:currentYear};
}
// Zero is the existing storage representation for a blank/unknown year.
export function validYearBuilt(value:unknown,currentYear=new Date().getFullYear()):value is number{
 const {min,max}=yearBuiltLimits(currentYear);
 return typeof value==='number'&&Number.isInteger(value)&&(value===0||(value>=min&&value<=max));
}
export function yearBuiltMessage(){const {min,max}=yearBuiltLimits();return `Year built must be between ${min} and ${max}, or left blank if unknown.`;}
