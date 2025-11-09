import { useLocalStorage } from "./useLocalStorage";

export const useXP = () => {
  const [xp, setXp] = useLocalStorage<number>("xp", 0);

  const awardXP = (amount: number, reason: string) => {
    setXp((prev) => prev + amount);
    console.log(`+${amount} XP for ${reason}!`);
  };

  const level = Math.floor(xp / 100);
  const progress = xp % 100;

  return { xp, level, progress, awardXP };
};
