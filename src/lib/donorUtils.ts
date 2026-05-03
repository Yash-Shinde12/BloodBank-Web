import { differenceInMonths, parseISO } from 'date-fns';

export const checkDonorEligibility = (donorData: any): boolean => {
  // If explicitly marked as ineligible by an admin or user toggle, respect that.
  if (donorData.isEligible === false || donorData.isAvailable === false) {
    return false;
  }
  
  // If no last donation date is recorded, they are eligible
  if (!donorData.lastDonationDate) {
    return true;
  }

  try {
    const lastDate = parseISO(donorData.lastDonationDate);
    const monthsSince = differenceInMonths(new Date(), lastDate);
    
    // Standard rule: 3 months for males, 4 months for females
    const requiredMonths = donorData.gender?.toLowerCase() === 'female' ? 4 : 3;
    
    return monthsSince >= requiredMonths;
  } catch (e) {
    // If date parsing fails, default to eligible
    return true;
  }
};
