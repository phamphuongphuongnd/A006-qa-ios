/** S-07a step 2 ("Allow all the time") is explained once per app session, not before every trip. */
let backgroundStepShown = false;

export const markBackgroundStepShown = () => {
  backgroundStepShown = true;
};

export const wasBackgroundStepShown = () => backgroundStepShown;
