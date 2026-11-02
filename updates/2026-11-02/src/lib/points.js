export {stampRewards as pointRewards,earnedBurgerStamps as earnedItemPoints,stampProducts as eligibleRewardProducts} from './loyaltyStamps.js';
export function categoryPoints(name){return /burger|hamburgues/i.test(String(name||''))?1:0;}
