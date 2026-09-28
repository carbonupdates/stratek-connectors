// Shared by integrations that are still scaffolds (status: 'planned').
export const notBuilt = (name) => async () => {
  throw new Error(`${name} is coming soon -- it is not built into this connector version yet.`);
};
